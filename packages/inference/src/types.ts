/**
 * @aegis/inference — Type definitions
 */

// ---------------------------------------------------------------------------
// Learning conditions (the canonical five)
// ---------------------------------------------------------------------------

export type LearningCondition =
  | 'attentive'
  | 'wandering'
  | 'confused'
  | 'overloaded'
  | 'fatigued';

/** All five conditions with probability scores */
export type ConditionProbabilities = Record<LearningCondition, number>;

// ---------------------------------------------------------------------------
// Condition drivers — human-readable explanations
// ---------------------------------------------------------------------------

export interface ConditionDriver {
  /** Human-readable description of what contributed to this estimate */
  description: string;
  /** Which feature(s) drove this driver */
  features: string[];
  /** How strongly this driver influenced the estimate [0, 1] */
  weight: number;
}

// ---------------------------------------------------------------------------
// Learning condition state — emitted every ~2–5 seconds
// ---------------------------------------------------------------------------

export interface LearningConditionState {
  /** Unix timestamp */
  t: number;

  /** Probability distribution over the five conditions */
  condition: ConditionProbabilities;

  /**
   * Overall confidence in the estimate [0, 1].
   * Affected by: tier, quality flags, feature completeness, signal consistency.
   */
  confidence: number;

  /**
   * Human-readable drivers — what signals contributed.
   * Sorted by weight (strongest first).
   */
  drivers: ConditionDriver[];

  /**
   * What was NOT used — for the explainability drawer.
   * e.g., ["gaze direction (camera off)", "expressivity (disabled)"]
   */
  not_used: string[];

  /**
   * The dominant condition (highest probability).
   * Provided for convenience — consumers should prefer the full distribution.
   */
  dominant: LearningCondition;
}

// ---------------------------------------------------------------------------
// Estimator configuration
// ---------------------------------------------------------------------------

export interface EstimatorConfig {
  /** Sliding window size in seconds (default 60) */
  window_s: number;

  /** How often to emit a new state, in seconds (default 3) */
  emit_interval_s: number;

  /** Minimum confidence to consider a condition "active" (default 0.4) */
  confidence_threshold: number;

  /**
   * Per-user baseline overrides.
   * Learned from self-report calibration or initial session.
   */
  baselines?: UserBaselines;
}

export interface UserBaselines {
  /** Typical blink rate (blinks/s) for this user */
  blink_rate_baseline?: number;
  /** Typical gaze break frequency for this user */
  gaze_break_frequency?: number;
  /** Typical response latency (ms) for this user */
  response_latency_ms?: number;
}

export const DEFAULT_ESTIMATOR_CONFIG: EstimatorConfig = {
  window_s: 60,
  emit_interval_s: 3,
  confidence_threshold: 0.4,
};
