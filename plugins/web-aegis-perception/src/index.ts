/**
 * @aegis/web-perception
 *
 * Browser-based perception via MediaPipe Tasks (WASM).
 * Phase 0 prototype — first implementation target.
 *
 * Implements PerceptionPlugin from @aegis/feature-stream.
 *
 * Uses getUserMedia + MediaPipe Face Landmarker running entirely
 * on-device in the browser. No frames leave the device.
 */

import type {
  FeatureStreamEvent,
  FeatureStreamConfig,
  PerceptionTier,
  PerceptionSource,
  QualityFlags,
  HeadPose,
  GazeEstimate,
  EyeMetrics,
  DistanceEstimate,
  InteractionTelemetry,
} from '@aegis/feature-stream';
import { DEFAULT_FEATURE_STREAM_CONFIG } from '@aegis/feature-stream';
import type {
  PerceptionPlugin,
  PerceptionCapabilities,
  PerceptionPluginEvents,
  PerceptionError,
} from '@aegis/feature-stream/perception-plugin';

export class WebAegisPerception implements PerceptionPlugin {
  private tier: PerceptionTier = 0;
  private config: FeatureStreamConfig = { ...DEFAULT_FEATURE_STREAM_CONFIG };
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private animFrameId: number | null = null;
  private running = false;

  private listeners: {
    onFeature: Set<(event: FeatureStreamEvent) => void>;
    onTierChange: Set<(tier: PerceptionTier) => void>;
    onError: Set<(error: PerceptionError) => void>;
  } = {
    onFeature: new Set(),
    onTierChange: new Set(),
    onError: new Set(),
  };

  async getCapabilities(): Promise<PerceptionCapabilities> {
    const hasCamera = !!(
      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    );

    // Check if permission was already granted
    let authorized = false;
    try {
      const permission = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });
      authorized = permission.state === 'granted';
    } catch {
      // permissions API not supported — will check on initialize
    }

    return {
      source: 'web_mediapipe' as PerceptionSource,
      max_tier: hasCamera ? 1 : 0,
      camera_authorized: authorized,
      has_front_camera: hasCamera,
      has_depth_sensor: false, // Never on web
    };
  }

  async initialize(config?: Partial<FeatureStreamConfig>): Promise<PerceptionTier> {
    this.config = { ...DEFAULT_FEATURE_STREAM_CONFIG, ...config };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      // Create hidden video element for frame processing
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.setAttribute('playsinline', '');
      this.video.muted = true;
      await this.video.play();

      // TODO: Initialize MediaPipe Face Landmarker WASM
      // const faceLandmarker = await FaceLandmarker.createFromOptions(vision, { ... });

      this.tier = 1;
      this.emit('onTierChange', this.tier);
      return this.tier;
    } catch (err) {
      // Camera denied or unavailable — graceful degradation to Tier 0
      console.info('[Ægis] Camera not available — continuing with telemetry only.');
      this.tier = 0;
      this.emit('onTierChange', this.tier);
      return this.tier;
    }
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    if (this.tier >= 1 && this.video) {
      this.startPerceptionLoop();
    }
  }

  async pause(): Promise<void> {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.tier = 0;
  }

  getCurrentTier(): PerceptionTier {
    return this.tier;
  }

  on<K extends keyof PerceptionPluginEvents>(
    event: K,
    handler: PerceptionPluginEvents[K],
  ): void {
    (this.listeners[event] as Set<Function>).add(handler);
  }

  off<K extends keyof PerceptionPluginEvents>(
    event: K,
    handler: PerceptionPluginEvents[K],
  ): void {
    (this.listeners[event] as Set<Function>).delete(handler);
  }

  // -------------------------------------------------------------------------
  // Private: perception loop
  // -------------------------------------------------------------------------

  private startPerceptionLoop(): void {
    const interval = 1000 / this.config.target_hz;
    let lastFrame = 0;

    const loop = (timestamp: number) => {
      if (!this.running) return;

      if (timestamp - lastFrame >= interval) {
        lastFrame = timestamp;
        const event = this.processFrame();
        if (event) {
          this.emit('onFeature', event);
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private processFrame(): FeatureStreamEvent | null {
    // TODO: Run MediaPipe Face Landmarker on current video frame
    // TODO: Extract landmarks, compute pose/gaze/blink/distance
    //
    // For now, emit a placeholder structure.
    // This will be replaced when MediaPipe WASM is integrated.

    const now = Date.now() / 1000;

    return {
      t: now,
      source: 'web_mediapipe',
      quality: {
        face_present: false, // TODO: from MediaPipe detection
        multiple_faces: false,
        occluded: false,
        low_light: false,
        confidence: 0,
      },
      pose: null,
      gaze: null,
      eyes: null,
      distance: null,
      interaction: {
        scroll_speed: 0,
        tap_rate_10s: 0,
        retry_count_60s: 0,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Private: event emission
  // -------------------------------------------------------------------------

  private emit<K extends keyof PerceptionPluginEvents>(
    event: K,
    ...args: Parameters<PerceptionPluginEvents[K]>
  ): void {
    for (const handler of this.listeners[event]) {
      try {
        (handler as Function)(...args);
      } catch (err) {
        console.error(`[Ægis] Error in ${event} handler:`, err);
      }
    }
  }
}
