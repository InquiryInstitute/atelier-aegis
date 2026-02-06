/**
 * @aegis/feature-stream — Perception Plugin API
 *
 * Every perception backend (iOS ARKit, iOS Vision, Android MediaPipe,
 * Web MediaPipe) must implement PerceptionPlugin.
 *
 * This is the contract that allows the shared inference/policy layers
 * to be completely platform-agnostic.
 */

import type {
  FeatureStreamEvent,
  PerceptionSource,
  PerceptionTier,
  FeatureStreamConfig,
} from './index';

// ---------------------------------------------------------------------------
// Plugin lifecycle
// ---------------------------------------------------------------------------

export interface PerceptionCapabilities {
  /** Which source identifier this plugin provides */
  source: PerceptionSource;
  /** Maximum tier this plugin can achieve on current hardware */
  max_tier: PerceptionTier;
  /** Whether camera permission has been granted */
  camera_authorized: boolean;
  /** Whether the device has a front-facing camera */
  has_front_camera: boolean;
  /** Whether TrueDepth / structured light is available */
  has_depth_sensor: boolean;
}

export interface PerceptionPluginEvents {
  /** Emitted at target_hz when perception is running */
  onFeature: (event: FeatureStreamEvent) => void;
  /** Emitted when the active tier changes (e.g., camera denied → Tier 0) */
  onTierChange: (tier: PerceptionTier) => void;
  /** Emitted on unrecoverable error */
  onError: (error: PerceptionError) => void;
}

export interface PerceptionError {
  code: 'camera_denied' | 'camera_unavailable' | 'processing_error' | 'unknown';
  message: string;
  /** Should the system fall back to a lower tier? */
  fallback_recommended: boolean;
}

// ---------------------------------------------------------------------------
// The Plugin Interface — all backends must implement this
// ---------------------------------------------------------------------------

export interface PerceptionPlugin {
  /**
   * Query device capabilities before starting.
   * Does not require camera permission.
   */
  getCapabilities(): Promise<PerceptionCapabilities>;

  /**
   * Request camera permission (if needed) and prepare the pipeline.
   * Returns the tier that will be active.
   *
   * If the user denies camera, resolves with Tier 0 (telemetry only).
   * Never throws on permission denial — graceful degradation is mandatory.
   */
  initialize(config?: Partial<FeatureStreamConfig>): Promise<PerceptionTier>;

  /**
   * Start emitting FeatureStreamEvents via the onFeature callback.
   * Must be idempotent (calling start() when already running is a no-op).
   */
  start(): Promise<void>;

  /**
   * Pause perception. Camera session remains warm for fast resume.
   * Features stop being emitted.
   */
  pause(): Promise<void>;

  /**
   * Stop perception entirely. Release camera and processing resources.
   * After stop(), initialize() must be called again before start().
   */
  stop(): Promise<void>;

  /**
   * Get the currently active perception tier.
   */
  getCurrentTier(): PerceptionTier;

  /**
   * Register event listeners.
   */
  on<K extends keyof PerceptionPluginEvents>(
    event: K,
    handler: PerceptionPluginEvents[K],
  ): void;

  /**
   * Remove event listeners.
   */
  off<K extends keyof PerceptionPluginEvents>(
    event: K,
    handler: PerceptionPluginEvents[K],
  ): void;
}
