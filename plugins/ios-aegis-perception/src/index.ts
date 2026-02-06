/**
 * @aegis/ios-perception
 *
 * Capacitor plugin stub for iOS ARKit / Vision face tracking.
 * Implements PerceptionPlugin from @aegis/feature-stream.
 *
 * Phase 1: Vision-based RGB landmarks (Tier 1)
 * Phase 2: ARKit TrueDepth face tracking (Tier 2)
 */

import type {
  FeatureStreamEvent,
  FeatureStreamConfig,
  PerceptionTier,
} from '@aegis/feature-stream';
import type {
  PerceptionPlugin,
  PerceptionCapabilities,
  PerceptionPluginEvents,
} from '@aegis/feature-stream/perception-plugin';

export class IOSAegisPerception implements PerceptionPlugin {
  private tier: PerceptionTier = 0;
  private listeners = new Map<string, Set<Function>>();

  async getCapabilities(): Promise<PerceptionCapabilities> {
    // TODO: Query native layer via Capacitor bridge
    return {
      source: 'ios_vision',
      max_tier: 1, // Will be 2 when ARKit plugin is wired
      camera_authorized: false,
      has_front_camera: true,
      has_depth_sensor: false, // Will be detected at runtime
    };
  }

  async initialize(_config?: Partial<FeatureStreamConfig>): Promise<PerceptionTier> {
    // TODO: Request camera permission via native bridge
    // TODO: Detect TrueDepth availability
    // TODO: Initialize ARKit session or Vision pipeline
    this.tier = 0;
    return this.tier;
  }

  async start(): Promise<void> {
    // TODO: Start native capture session
    // TODO: Begin emitting FeatureStreamEvents via bridge callbacks
  }

  async pause(): Promise<void> {
    // TODO: Pause capture (keep session warm)
  }

  async stop(): Promise<void> {
    // TODO: Release camera and ARKit session
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
