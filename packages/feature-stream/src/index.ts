/**
 * @aegis/feature-stream
 *
 * Canonical schema for the Ægis Feature Stream.
 * All perception backends (iOS ARKit, Android MediaPipe, Web MediaPipe)
 * must emit events conforming to FeatureStreamEvent.
 *
 * Principle: features-only; no identity; no raw imagery.
 */

// ---------------------------------------------------------------------------
// Source identifiers
// ---------------------------------------------------------------------------

export type PerceptionSource =
  | 'ios_arkit'         // Tier 2 — TrueDepth / ARKit
  | 'ios_vision'        // Tier 1 — Vision framework RGB fallback
  | 'android_mediapipe' // Tier 1 — MediaPipe Face Landmarker
  | 'web_mediapipe'     // Tier 1 — MediaPipe Tasks WASM
  | 'telemetry_only';   // Tier 0 — no camera

// ---------------------------------------------------------------------------
// Capability tiers
// ---------------------------------------------------------------------------

export enum PerceptionTier {
  /** Camera off — interaction telemetry only */
  Tier0 = 0,
  /** RGB perception — face presence, approximate pose, blink/gaze proxy */
  Tier1 = 1,
  /** TrueDepth / ARKit — stable gaze vector, blendshapes, low-light robust */
  Tier2 = 2,
}

// ---------------------------------------------------------------------------
// Quality assessment
// ---------------------------------------------------------------------------

export interface QualityFlags {
  /** Is at least one face detected? */
  face_present: boolean;
  /** Are multiple faces detected? (drops confidence) */
  multiple_faces: boolean;
  /** Is the primary face partially occluded? */
  occluded: boolean;
  /** Is the scene low-light? */
  low_light: boolean;
  /** Overall quality confidence [0, 1] */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Perceptual features (all optional — tier-dependent)
// ---------------------------------------------------------------------------

export interface HeadPose {
  /** Yaw in radians (left/right turn) */
  yaw: number;
  /** Pitch in radians (up/down tilt) */
  pitch: number;
  /** Roll in radians (head tilt) */
  roll: number;
}

export interface GazeEstimate {
  /** Horizontal gaze offset from center [-1, 1] */
  x: number;
  /** Vertical gaze offset from center [-1, 1] */
  y: number;
  /** Confidence of the gaze estimate [0, 1] */
  confidence: number;
}

export interface EyeMetrics {
  /** Blink rate over last 30 seconds (blinks/second) */
  blink_rate_30s: number;
  /** Left eye openness [0, 1] */
  openness_l: number;
  /** Right eye openness [0, 1] */
  openness_r: number;
}

export interface DistanceEstimate {
  /**
   * Relative face scale [0, 1] — proxy for face-to-screen distance.
   * Larger values = closer to camera.
   */
  face_scale: number;
}

export interface Expressivity {
  /**
   * Weak evidence only — never treated as "emotion".
   * Values in [0, 1].
   */
  smile?: number;
  brow_furrow?: number;
  jaw_open?: number;
  squint?: number;
}

// ---------------------------------------------------------------------------
// Interaction telemetry (available at all tiers)
// ---------------------------------------------------------------------------

export interface InteractionTelemetry {
  /** Scroll speed (pixels/second, 0 = idle) */
  scroll_speed: number;
  /** Tap rate over last 10 seconds */
  tap_rate_10s: number;
  /** Retry count over last 60 seconds */
  retry_count_60s: number;
  /** Time since last interaction (seconds) */
  idle_seconds?: number;
  /** Current content element ID (if known) */
  content_element_id?: string;
}

// ---------------------------------------------------------------------------
// Feature Stream Event — the canonical contract
// ---------------------------------------------------------------------------

export interface FeatureStreamEvent {
  /** Unix timestamp with millisecond precision */
  t: number;

  /** Which perception backend produced this event */
  source: PerceptionSource;

  /** Quality assessment of the current frame */
  quality: QualityFlags;

  /** Head pose estimate (null if face not present or Tier 0) */
  pose: HeadPose | null;

  /** Gaze direction estimate (null on Tier 0, may be null on Tier 1) */
  gaze: GazeEstimate | null;

  /** Eye metrics (null if face not present or Tier 0) */
  eyes: EyeMetrics | null;

  /** Face-to-screen distance proxy (null if face not present or Tier 0) */
  distance: DistanceEstimate | null;

  /** Optional expressivity signals — weak evidence, never "emotion" */
  expressivity?: Expressivity;

  /** Interaction telemetry — always available (all tiers) */
  interaction: InteractionTelemetry;
}

// ---------------------------------------------------------------------------
// Feature Stream configuration
// ---------------------------------------------------------------------------

export interface FeatureStreamConfig {
  /** Target emission rate in Hz (10–30, default 15) */
  target_hz: number;
  /** Buffer size before flushing to inference layer */
  buffer_size: number;
  /** Whether to include expressivity signals (default false) */
  include_expressivity: boolean;
  /** Maximum seconds of features to retain in memory */
  retention_window_s: number;
}

export const DEFAULT_FEATURE_STREAM_CONFIG: FeatureStreamConfig = {
  target_hz: 15,
  buffer_size: 30,
  include_expressivity: false,
  retention_window_s: 120,
};
