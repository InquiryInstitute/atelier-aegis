/**
 * Web Perception — MediaPipe Face Landmarker integration
 *
 * Converts 478 face landmarks + blendshapes into FeatureStreamEvents.
 * All processing on-device. No frames leave the browser.
 */

import type {
  FeatureStreamEvent,
  HeadPose,
  GazeEstimate,
  EyeMetrics,
  DistanceEstimate,
  Expressivity,
  QualityFlags,
} from '@aegis/feature-stream';
import { PerceptionTier } from '@aegis/feature-stream';

// MediaPipe landmark indices
const LEFT_EYE_UPPER = 159;
const LEFT_EYE_LOWER = 145;
const RIGHT_EYE_UPPER = 386;
const RIGHT_EYE_LOWER = 374;
const NOSE_TIP = 1;
const FOREHEAD = 10;
const CHIN = 152;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_INNER = 133;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;

interface BlinkTracker {
  history: { t: number; open: boolean }[];
  blinks30s: number;
}

export type PerceptionState = 'uninitialized' | 'requesting' | 'active' | 'denied' | 'stopped';

export interface WebPerceptionCallbacks {
  onFeature: (event: FeatureStreamEvent) => void;
  onTierChange: (tier: PerceptionTier) => void;
  onStateChange: (state: PerceptionState) => void;
}

export class WebPerception {
  private state: PerceptionState = 'uninitialized';
  private tier: PerceptionTier = PerceptionTier.Tier0;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private faceLandmarker: any = null;
  private running = false;
  private rafId: number | null = null;
  private callbacks: WebPerceptionCallbacks;
  private blinkTracker: BlinkTracker = { history: [], blinks30s: 0 };
  private lastBlinkState = true; // true = open
  private targetHz = 10;
  private lastFrame = 0;

  constructor(callbacks: WebPerceptionCallbacks) {
    this.callbacks = callbacks;
  }

  getState(): PerceptionState { return this.state; }
  getTier(): PerceptionTier { return this.tier; }

  async initialize(): Promise<PerceptionTier> {
    this.state = 'requesting';
    this.callbacks.onStateChange(this.state);

    try {
      // Dynamically import MediaPipe
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 2, // detect multiple for the quality flag
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      // Request camera
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', '');
      this.video.muted = true;
      await this.video.play();

      // Offscreen canvas for processing
      this.canvas = new OffscreenCanvas(this.video.videoWidth || 640, this.video.videoHeight || 480);
      this.ctx = this.canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

      this.tier = PerceptionTier.Tier1;
      this.state = 'active';
      this.callbacks.onTierChange(this.tier);
      this.callbacks.onStateChange(this.state);
      return this.tier;
    } catch (err) {
      console.info('[Ægis] Camera not available — telemetry only.', err);
      this.tier = PerceptionTier.Tier0;
      this.state = 'denied';
      this.callbacks.onTierChange(this.tier);
      this.callbacks.onStateChange(this.state);
      return this.tier;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  pause(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  stop(): void {
    this.pause();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.faceLandmarker = null;
    this.tier = PerceptionTier.Tier0;
    this.state = 'stopped';
    this.callbacks.onTierChange(this.tier);
    this.callbacks.onStateChange(this.state);
  }

  // -------------------------------------------------------------------------
  // Processing loop
  // -------------------------------------------------------------------------

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const interval = 1000 / this.targetHz;

    if (now - this.lastFrame >= interval) {
      this.lastFrame = now;
      this.processFrame();
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private processFrame(): void {
    if (!this.video || !this.faceLandmarker || this.video.readyState < 2) return;

    const nowMs = performance.now();
    let results: any;
    try {
      results = this.faceLandmarker.detectForVideo(this.video, nowMs);
    } catch {
      return; // skip frame on error
    }

    const t = Date.now() / 1000;
    const hasFaces = results.faceLandmarks && results.faceLandmarks.length > 0;
    const multipleFaces = results.faceLandmarks && results.faceLandmarks.length > 1;

    const quality: QualityFlags = {
      face_present: hasFaces,
      multiple_faces: multipleFaces,
      occluded: false,
      low_light: false,
      confidence: hasFaces ? 0.8 : 0,
    };

    let pose: HeadPose | null = null;
    let gaze: GazeEstimate | null = null;
    let eyes: EyeMetrics | null = null;
    let distance: DistanceEstimate | null = null;
    let expressivity: Expressivity | undefined;

    if (hasFaces) {
      const landmarks = results.faceLandmarks[0];
      const blendshapes = results.faceBlendshapes?.[0]?.categories;
      const matrix = results.facialTransformationMatrixes?.[0]?.data;

      pose = this.extractPose(landmarks, matrix);
      gaze = this.extractGaze(landmarks);
      eyes = this.extractEyes(landmarks, blendshapes, t);
      distance = this.extractDistance(landmarks);

      if (blendshapes) {
        expressivity = this.extractExpressivity(blendshapes);
      }
    }

    const event: FeatureStreamEvent = {
      t,
      source: 'web_mediapipe',
      quality,
      pose,
      gaze,
      eyes,
      distance,
      expressivity,
      interaction: {
        scroll_speed: 0,
        tap_rate_10s: 0,
        retry_count_60s: 0,
      },
    };

    this.callbacks.onFeature(event);
  }

  // -------------------------------------------------------------------------
  // Feature extraction from landmarks
  // -------------------------------------------------------------------------

  private extractPose(landmarks: any[], matrix: Float32Array | null): HeadPose {
    // Use facial transformation matrix if available
    if (matrix && matrix.length >= 16) {
      // Extract Euler angles from 4x4 transformation matrix
      const yaw = Math.atan2(matrix[8], matrix[10]);
      const pitch = Math.atan2(-matrix[9], Math.sqrt(matrix[8] ** 2 + matrix[10] ** 2));
      const roll = Math.atan2(matrix[1], matrix[5]);
      return { yaw, pitch, roll };
    }

    // Fallback: approximate from landmark positions
    const nose = landmarks[NOSE_TIP];
    const leftCheek = landmarks[LEFT_CHEEK];
    const rightCheek = landmarks[RIGHT_CHEEK];
    const forehead = landmarks[FOREHEAD];
    const chin = landmarks[CHIN];

    const yaw = (rightCheek.x - leftCheek.x - 1) * Math.PI * 0.5;
    const pitch = (forehead.y - chin.y - 0.3) * Math.PI;
    const roll = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x);

    return { yaw, pitch, roll };
  }

  private extractGaze(landmarks: any[]): GazeEstimate {
    // Approximate gaze from iris position relative to eye corners
    const lIris = landmarks[LEFT_IRIS_CENTER];
    const lInner = landmarks[LEFT_EYE_INNER];
    const lOuter = landmarks[LEFT_EYE_OUTER];
    const rIris = landmarks[RIGHT_IRIS_CENTER];
    const rInner = landmarks[RIGHT_EYE_INNER];
    const rOuter = landmarks[RIGHT_EYE_OUTER];

    if (!lIris || !rIris) {
      return { x: 0, y: 0, confidence: 0.3 };
    }

    // Normalize iris position within eye width
    const lEyeWidth = Math.abs(lOuter.x - lInner.x) || 0.01;
    const lGazeX = ((lIris.x - lOuter.x) / lEyeWidth - 0.5) * 2;

    const rEyeWidth = Math.abs(rOuter.x - rInner.x) || 0.01;
    const rGazeX = ((rIris.x - rOuter.x) / rEyeWidth - 0.5) * 2;

    // Average both eyes
    const x = (lGazeX + rGazeX) / 2;

    // Vertical from iris position relative to upper/lower eyelid
    const lUpper = landmarks[LEFT_EYE_UPPER];
    const lLower = landmarks[LEFT_EYE_LOWER];
    const lEyeHeight = Math.abs(lUpper.y - lLower.y) || 0.01;
    const y = ((lIris.y - lUpper.y) / lEyeHeight - 0.5) * 2;

    return {
      x: clamp(x, -1, 1),
      y: clamp(y, -1, 1),
      confidence: 0.55,
    };
  }

  private extractEyes(landmarks: any[], blendshapes: any[] | null, t: number): EyeMetrics {
    let openness_l: number;
    let openness_r: number;

    if (blendshapes) {
      // Use blendshapes for more accurate eye openness
      const eyeBlinkL = blendshapes.find((b: any) => b.categoryName === 'eyeBlinkLeft');
      const eyeBlinkR = blendshapes.find((b: any) => b.categoryName === 'eyeBlinkRight');
      openness_l = 1 - (eyeBlinkL?.score ?? 0);
      openness_r = 1 - (eyeBlinkR?.score ?? 0);
    } else {
      // Fallback: compute from landmark distances
      const lUpper = landmarks[LEFT_EYE_UPPER];
      const lLower = landmarks[LEFT_EYE_LOWER];
      const rUpper = landmarks[RIGHT_EYE_UPPER];
      const rLower = landmarks[RIGHT_EYE_LOWER];

      openness_l = clamp(Math.abs(lUpper.y - lLower.y) * 40, 0, 1);
      openness_r = clamp(Math.abs(rUpper.y - rLower.y) * 40, 0, 1);
    }

    // Track blinks
    const avgOpenness = (openness_l + openness_r) / 2;
    const isOpen = avgOpenness > 0.3;
    if (this.lastBlinkState && !isOpen) {
      // Blink detected (was open, now closed)
      this.blinkTracker.history.push({ t, open: false });
    }
    this.lastBlinkState = isOpen;

    // Count blinks in last 30 seconds
    const cutoff = t - 30;
    this.blinkTracker.history = this.blinkTracker.history.filter(b => b.t > cutoff);
    const blink_rate_30s = this.blinkTracker.history.length / 30;

    return { blink_rate_30s, openness_l, openness_r };
  }

  private extractDistance(landmarks: any[]): DistanceEstimate {
    // Face scale proxy: distance between left and right cheek
    const left = landmarks[LEFT_CHEEK];
    const right = landmarks[RIGHT_CHEEK];
    const faceWidth = Math.abs(right.x - left.x);
    // Normalize: typical face width in frame is ~0.3-0.5
    const face_scale = clamp(faceWidth * 2, 0, 1);
    return { face_scale };
  }

  private extractExpressivity(blendshapes: any[]): Expressivity {
    const get = (name: string): number => {
      const shape = blendshapes.find((b: any) => b.categoryName === name);
      return shape?.score ?? 0;
    };

    return {
      smile: (get('mouthSmileLeft') + get('mouthSmileRight')) / 2,
      brow_furrow: (get('browDownLeft') + get('browDownRight')) / 2,
      jaw_open: get('jawOpen'),
      squint: (get('eyeSquintLeft') + get('eyeSquintRight')) / 2,
    };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
