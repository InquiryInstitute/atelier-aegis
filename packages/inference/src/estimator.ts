/**
 * @aegis/inference — Rule-based Learning Condition Estimator (MVP)
 *
 * Phase 0 approach: EWMA smoothing + per-tier thresholds + cooldowns.
 * Interpretable, debuggable, replaceable with a temporal model in v2.
 *
 * "I may be mistaken." — a.Weil
 */

import type { FeatureStreamEvent, PerceptionTier } from '@aegis/feature-stream';
import type {
  LearningConditionState,
  LearningCondition,
  ConditionDriver,
  ConditionProbabilities,
  EstimatorConfig,
} from './types';
import { DEFAULT_ESTIMATOR_CONFIG } from './types';

// ---------------------------------------------------------------------------
// EWMA helper
// ---------------------------------------------------------------------------

function ewma(prev: number, next: number, alpha: number): number {
  return alpha * next + (1 - alpha) * prev;
}

// ---------------------------------------------------------------------------
// Estimator
// ---------------------------------------------------------------------------

export class LearningConditionEstimator {
  private config: EstimatorConfig;
  private buffer: FeatureStreamEvent[] = [];
  private lastEmit = 0;
  private currentTier: PerceptionTier = 0;

  // Smoothed signals
  private smoothed = {
    gaze_stability: 0.5,
    pose_stability: 0.5,
    blink_rate: 0.2,
    interaction_pace: 0.5,
    retry_rate: 0,
    idle_time: 0,
  };

  private readonly ALPHA = 0.15; // EWMA smoothing factor

  constructor(config?: Partial<EstimatorConfig>) {
    this.config = { ...DEFAULT_ESTIMATOR_CONFIG, ...config };
  }

  /**
   * Set the active perception tier.
   * Affects confidence calculations and which features are expected.
   */
  setTier(tier: PerceptionTier): void {
    this.currentTier = tier;
  }

  /**
   * Ingest a feature stream event.
   * Call this at the feature stream's emission rate (10–30 Hz).
   */
  ingest(event: FeatureStreamEvent): void {
    this.buffer.push(event);
    this.updateSmoothedSignals(event);
    this.pruneBuffer(event.t);
  }

  /**
   * Attempt to produce a learning condition state.
   * Returns null if the emit interval hasn't elapsed.
   */
  estimate(now: number): LearningConditionState | null {
    if (now - this.lastEmit < this.config.emit_interval_s) {
      return null;
    }

    this.lastEmit = now;

    const condition = this.computeConditions();
    const confidence = this.computeConfidence();
    const drivers = this.computeDrivers();
    const not_used = this.computeNotUsed();
    const dominant = this.findDominant(condition);

    return {
      t: now,
      condition,
      confidence,
      drivers,
      not_used,
      dominant,
    };
  }

  /**
   * Reset the estimator state (e.g., on session start).
   */
  reset(): void {
    this.buffer = [];
    this.lastEmit = 0;
    this.smoothed = {
      gaze_stability: 0.5,
      pose_stability: 0.5,
      blink_rate: 0.2,
      interaction_pace: 0.5,
      retry_rate: 0,
      idle_time: 0,
    };
  }

  // -------------------------------------------------------------------------
  // Private: signal smoothing
  // -------------------------------------------------------------------------

  private updateSmoothedSignals(event: FeatureStreamEvent): void {
    // Gaze stability: how consistent is the gaze direction?
    if (event.gaze) {
      const gazeOffset = Math.sqrt(event.gaze.x ** 2 + event.gaze.y ** 2);
      // Lower offset = more stable = higher stability score
      const stability = Math.max(0, 1 - gazeOffset * 2);
      this.smoothed.gaze_stability = ewma(
        this.smoothed.gaze_stability,
        stability,
        this.ALPHA,
      );
    }

    // Pose stability: how still is the head?
    if (event.pose) {
      const poseMovement =
        Math.abs(event.pose.yaw) + Math.abs(event.pose.pitch) + Math.abs(event.pose.roll);
      const stability = Math.max(0, 1 - poseMovement * 2);
      this.smoothed.pose_stability = ewma(
        this.smoothed.pose_stability,
        stability,
        this.ALPHA,
      );
    }

    // Blink rate
    if (event.eyes) {
      this.smoothed.blink_rate = ewma(
        this.smoothed.blink_rate,
        event.eyes.blink_rate_30s,
        this.ALPHA * 0.5, // slower smoothing for blink rate
      );
    }

    // Interaction pace
    this.smoothed.interaction_pace = ewma(
      this.smoothed.interaction_pace,
      event.interaction.tap_rate_10s,
      this.ALPHA,
    );

    // Retry rate
    this.smoothed.retry_rate = ewma(
      this.smoothed.retry_rate,
      event.interaction.retry_count_60s,
      this.ALPHA,
    );

    // Idle time
    if (event.interaction.idle_seconds !== undefined) {
      this.smoothed.idle_time = ewma(
        this.smoothed.idle_time,
        event.interaction.idle_seconds,
        this.ALPHA,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Private: condition estimation (rule-based MVP)
  // -------------------------------------------------------------------------

  private computeConditions(): ConditionProbabilities {
    const s = this.smoothed;

    // Attentive: stable gaze + stable pose + steady interaction
    const attentive = clamp(
      s.gaze_stability * 0.4 +
      s.pose_stability * 0.3 +
      (s.interaction_pace > 0.05 ? 0.3 : 0.1),
    );

    // Wandering: unstable gaze + pose drift + low interaction
    const wandering = clamp(
      (1 - s.gaze_stability) * 0.4 +
      (1 - s.pose_stability) * 0.3 +
      (s.idle_time > 10 ? 0.3 : s.idle_time * 0.03),
    );

    // Confused: retries + hesitation (low pace despite engagement)
    const confused = clamp(
      Math.min(s.retry_rate * 0.3, 0.4) +
      (s.interaction_pace < 0.1 && s.retry_rate > 0 ? 0.3 : 0) +
      (1 - s.gaze_stability) * 0.15,
    );

    // Overloaded: high blink rate + reduced precision (retries + fast pace)
    const overloaded = clamp(
      (s.blink_rate > 0.3 ? (s.blink_rate - 0.3) * 2 : 0) * 0.4 +
      (s.retry_rate > 1 ? 0.3 : s.retry_rate * 0.3) +
      (s.interaction_pace > 0.5 ? 0.2 : 0),
    );

    // Fatigued: high blink rate + slowing responses + increasing idle
    const fatigued = clamp(
      (s.blink_rate > 0.25 ? (s.blink_rate - 0.25) * 2 : 0) * 0.3 +
      (s.idle_time > 5 ? Math.min(s.idle_time * 0.03, 0.3) : 0) +
      (s.interaction_pace < 0.05 ? 0.3 : 0),
    );

    return { attentive, wandering, confused, overloaded, fatigued };
  }

  // -------------------------------------------------------------------------
  // Private: confidence
  // -------------------------------------------------------------------------

  private computeConfidence(): number {
    const tierBonus = this.currentTier * 0.15; // 0, 0.15, or 0.3
    const bufferFill = Math.min(this.buffer.length / 100, 0.3);
    const hasGaze = this.buffer.some((e) => e.gaze !== null) ? 0.15 : 0;
    const hasFace = this.buffer.some((e) => e.quality.face_present) ? 0.15 : 0;

    return clamp(tierBonus + bufferFill + hasGaze + hasFace + 0.1);
  }

  // -------------------------------------------------------------------------
  // Private: explainability
  // -------------------------------------------------------------------------

  private computeDrivers(): ConditionDriver[] {
    const drivers: ConditionDriver[] = [];
    const s = this.smoothed;

    if (s.gaze_stability < 0.4) {
      drivers.push({
        description: 'frequent gaze breaks',
        features: ['gaze.x', 'gaze.y'],
        weight: 0.4,
      });
    }

    if (s.pose_stability < 0.4) {
      drivers.push({
        description: 'head pose drift',
        features: ['pose.yaw', 'pose.pitch', 'pose.roll'],
        weight: 0.3,
      });
    }

    if (s.retry_rate > 0.5) {
      drivers.push({
        description: `${Math.round(s.retry_rate)} retries in last minute`,
        features: ['interaction.retry_count_60s'],
        weight: 0.35,
      });
    }

    if (s.idle_time > 10) {
      drivers.push({
        description: 'extended idle period',
        features: ['interaction.idle_seconds'],
        weight: 0.25,
      });
    }

    if (s.blink_rate > 0.3) {
      drivers.push({
        description: 'elevated blink rate',
        features: ['eyes.blink_rate_30s'],
        weight: 0.2,
      });
    }

    if (s.interaction_pace < 0.05) {
      drivers.push({
        description: 'slower response times',
        features: ['interaction.tap_rate_10s'],
        weight: 0.2,
      });
    }

    // Sort by weight descending
    return drivers.sort((a, b) => b.weight - a.weight);
  }

  private computeNotUsed(): string[] {
    const notUsed: string[] = [];

    if (this.currentTier === 0) {
      notUsed.push('gaze direction (camera off)');
      notUsed.push('head pose (camera off)');
      notUsed.push('blink rate (camera off)');
      notUsed.push('face distance (camera off)');
    } else {
      if (!this.buffer.some((e) => e.gaze !== null)) {
        notUsed.push('gaze direction (not available at this tier)');
      }
      if (!this.buffer.some((e) => e.expressivity !== undefined)) {
        notUsed.push('expressivity signals (disabled by default)');
      }
    }

    return notUsed;
  }

  // -------------------------------------------------------------------------
  // Private: utilities
  // -------------------------------------------------------------------------

  private findDominant(conditions: ConditionProbabilities): LearningCondition {
    let max = -1;
    let dominant: LearningCondition = 'attentive';
    for (const [key, value] of Object.entries(conditions)) {
      if (value > max) {
        max = value;
        dominant = key as LearningCondition;
      }
    }
    return dominant;
  }

  private pruneBuffer(now: number): void {
    const cutoff = now - this.config.window_s;
    while (this.buffer.length > 0 && this.buffer[0].t < cutoff) {
      this.buffer.shift();
    }
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function clamp(v: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, v));
}
