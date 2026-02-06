/**
 * @aegis/android-perception
 *
 * Capacitor plugin stub for Android MediaPipe face tracking.
 * Implements PerceptionPlugin from @aegis/feature-stream.
 *
 * Phase 1: MediaPipe Face Landmarker (Tier 1)
 */

import type {
  FeatureStreamConfig,
  PerceptionTier,
} from '@aegis/feature-stream';
import type {
  PerceptionPlugin,
  PerceptionCapabilities,
  PerceptionPluginEvents,
} from '@aegis/feature-stream/perception-plugin';

export class AndroidAegisPerception implements PerceptionPlugin {
  private tier: PerceptionTier = 0;
  private listeners = new Map<string, Set<Function>>();

  async getCapabilities(): Promise<PerceptionCapabilities> {
    // TODO: Query native layer via Capacitor bridge
    return {
      source: 'android_mediapipe',
      max_tier: 1,
      camera_authorized: false,
      has_front_camera: true,
      has_depth_sensor: false,
    };
  }

  async initialize(_config?: Partial<FeatureStreamConfig>): Promise<PerceptionTier> {
    // TODO: Request camera permission
    // TODO: Initialize MediaPipe Face Landmarker
    this.tier = 0;
    return this.tier;
  }

  async start(): Promise<void> {
    // TODO: Start camera + MediaPipe pipeline
    // TODO: Begin emitting FeatureStreamEvents via bridge
  }

  async pause(): Promise<void> {
    // TODO: Pause camera capture
  }

  async stop(): Promise<void> {
    // TODO: Release camera and MediaPipe resources
    this.tier = 0;
  }

  getCurrentTier(): PerceptionTier {
    return this.tier;
  }

  on<K extends keyof PerceptionPluginEvents>(
    event: K,
    handler: PerceptionPluginEvents[K],
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off<K extends keyof PerceptionPluginEvents>(
    event: K,
    handler: PerceptionPluginEvents[K],
  ): void {
    this.listeners.get(event)?.delete(handler);
  }
}
