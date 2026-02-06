/**
 * @aegis/policy — Type definitions
 *
 * Intervention classes and the policy engine contract.
 */

// ---------------------------------------------------------------------------
// Intervention classes (from the instrument spec)
// ---------------------------------------------------------------------------

export type InterventionClass =
  | 'pace'      // slow down narration, increase spacing, chunk content
  | 'modality'  // text ↔ diagram ↔ example ↔ voice
  | 'hint'      // hint ladder: nudge → partial → worked solution
  | 'reset'     // 15–30s micro-break (breath, stretch, look away)
  | 'agency';   // ask preference ("example or diagram?")

// ---------------------------------------------------------------------------
// Intervention — what to offer the learner
// ---------------------------------------------------------------------------

export interface Intervention {
  /** Unique ID for this intervention instance */
  id: string;

  /** Which class of intervention */
  class: InterventionClass;

  /**
   * Human-readable suggestion text.
   * Written in a.Weil's voice: provisional, humble, offering.
   */
  message: string;

  /**
   * Options presented to the learner (always includes dismiss).
   * The learner always has the right to ignore.
   */
  options: InterventionOption[];

  /** What learning condition(s) triggered this */
  triggered_by: string[];

  /** Confidence that this intervention is appropriate [0, 1] */
  confidence: number;
}

export interface InterventionOption {
  id: string;
  label: string;
  /** What happens if this option is chosen */
  action: 'accept' | 'dismiss' | 'alternative';
}

// ---------------------------------------------------------------------------
// Intervention decision — the policy engine's output
// ---------------------------------------------------------------------------

export interface InterventionDecision {
  /** Should we intervene right now? */
  should_intervene: boolean;

  /** The intervention to offer (null if should_intervene is false) */
  intervention: Intervention | null;

  /** Why or why not */
  reasoning: string;

  /**
   * Seconds until we should re-evaluate.
   * If we just intervened, this is the cooldown.
   */
  next_evaluation_s: number;
}

// ---------------------------------------------------------------------------
// Policy configuration
// ---------------------------------------------------------------------------

export interface PolicyConfig {
  /**
   * Minimum confidence to consider intervening (default 0.5).
   * Below this, Ægis stays silent.
   */
  confidence_threshold: number;

  /**
   * Minimum seconds a condition must persist before triggering (default 15).
   * Prevents reacting to momentary fluctuations.
   */
  sustained_window_s: number;

  /**
   * Cooldown between interventions in seconds (default 120).
   * "Never nag."
   */
  cooldown_s: number;

  /**
   * Maximum interventions per 10-minute window (default 3).
   */
  max_per_10min: number;

  /** Learner preferences (from calibration) */
  preferences: LearnerPreferences;
}

export interface LearnerPreferences {
  /** Preferred intervention frequency: 'fewer' | 'default' | 'more' */
  frequency: 'fewer' | 'default' | 'more';

  /** Preferred modality when offering alternatives */
  preferred_modality?: 'text' | 'diagram' | 'example' | 'voice';

  /** Should micro-breaks be offered? (default true) */
  offer_breaks: boolean;

  /** Should hints be auto-offered on confusion? (default true) */
  offer_hints: boolean;
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  confidence_threshold: 0.5,
  sustained_window_s: 15,
  cooldown_s: 120,
  max_per_10min: 3,
  preferences: {
    frequency: 'default',
    offer_breaks: true,
    offer_hints: true,
  },
};
