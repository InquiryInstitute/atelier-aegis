/**
 * @aegis/policy — Pedagogical Policy Engine
 *
 * Chooses interventions based on learning conditions, confidence,
 * content type, learner preferences, and recent intervention history.
 *
 * Rules (a.Weil doctrine):
 *   - Intervene only when confidence ≥ threshold AND sustained AND cooled
 *   - Never more than N interruptions per 10 minutes
 *   - Always offer "Ignore for now"
 *   - Response grammar: provisional, humble, never declarative
 */

import type { LearningConditionState, LearningCondition } from '@aegis/inference';
import type {
  InterventionDecision,
  Intervention,
  InterventionClass,
  PolicyConfig,
} from './types';
import { DEFAULT_POLICY_CONFIG } from './types';

// ---------------------------------------------------------------------------
// Response grammar — a.Weil's voice
// ---------------------------------------------------------------------------

const RESPONSE_GRAMMAR: Record<InterventionClass, string[]> = {
  pace: [
    'We may have moved too quickly.',
    'A smaller step might be kinder.',
    'Perhaps we could slow down here.',
  ],
  modality: [
    'Would another form help?',
    'A diagram might make this clearer — shall I try?',
    'Sometimes a different angle helps. Would you like an example?',
  ],
  hint: [
    'There may be a gentler way into this.',
    'A small nudge might help — would you like one?',
    'I could offer a starting point, if you wish.',
  ],
  reset: [
    'Shall we pause briefly?',
    'A moment of rest might be welcome.',
    'Your attention has been generous. A short breath?',
  ],
  agency: [
    'What would feel most helpful right now?',
    'Would you prefer an example or a diagram?',
    'You know best — what would you like to try?',
  ],
};

// ---------------------------------------------------------------------------
// Condition → intervention class mapping
// ---------------------------------------------------------------------------

const CONDITION_INTERVENTIONS: Record<LearningCondition, InterventionClass[]> = {
  attentive: [],                        // No intervention needed
  wandering: ['reset', 'modality'],     // Re-engage gently
  confused: ['hint', 'pace', 'modality'], // Scaffold
  overloaded: ['pace', 'reset'],        // Reduce load
  fatigued: ['reset', 'pace'],          // Rest first
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class PedagogicalPolicyEngine {
  private config: PolicyConfig;
  private history: { t: number; class: InterventionClass }[] = [];
  private lastInterventionTime = 0;
  private conditionHistory: { t: number; condition: LearningCondition }[] = [];

  constructor(config?: Partial<PolicyConfig>) {
    this.config = {
      ...DEFAULT_POLICY_CONFIG,
      ...config,
      preferences: {
        ...DEFAULT_POLICY_CONFIG.preferences,
        ...config?.preferences,
      },
    };
  }

  /**
   * Evaluate whether to intervene given the current learning condition state.
   */
  evaluate(state: LearningConditionState): InterventionDecision {
    const now = state.t;

    // Track condition history for sustained-window check
    this.conditionHistory.push({ t: now, condition: state.dominant });
    this.pruneConditionHistory(now);

    // --- Gate 1: Is the dominant condition one that warrants intervention?
    const candidates = CONDITION_INTERVENTIONS[state.dominant];
    if (candidates.length === 0) {
      return this.noIntervention('Learner appears attentive.', 10);
    }

    // --- Gate 2: Is confidence above threshold?
    const threshold = this.adjustedThreshold();
    if (state.confidence < threshold) {
      return this.noIntervention(
        `Confidence ${state.confidence.toFixed(2)} below threshold ${threshold.toFixed(2)}. I may be mistaken.`,
        5,
      );
    }

    // --- Gate 3: Has the condition been sustained?
    if (!this.isSustained(state.dominant, now)) {
      return this.noIntervention(
        `Condition "${state.dominant}" not yet sustained for ${this.config.sustained_window_s}s.`,
        5,
      );
    }

    // --- Gate 4: Cooldown
    const timeSinceLast = now - this.lastInterventionTime;
    const cooldown = this.adjustedCooldown();
    if (timeSinceLast < cooldown) {
      const remaining = Math.ceil(cooldown - timeSinceLast);
      return this.noIntervention(
        `Cooldown active (${remaining}s remaining). Avoiding nagging.`,
        remaining,
      );
    }

    // --- Gate 5: Rate limit (max per 10 min)
    const recentCount = this.history.filter((h) => now - h.t < 600).length;
    if (recentCount >= this.config.max_per_10min) {
      return this.noIntervention(
        `Already offered ${recentCount} interventions in the last 10 minutes.`,
        60,
      );
    }

    // --- All gates passed: choose and offer an intervention
    const interventionClass = this.chooseClass(candidates, state);
    const intervention = this.buildIntervention(interventionClass, state);

    // Record
    this.history.push({ t: now, class: interventionClass });
    this.lastInterventionTime = now;

    return {
      should_intervene: true,
      intervention,
      reasoning: `Sustained "${state.dominant}" (confidence ${state.confidence.toFixed(2)}) → offering ${interventionClass}.`,
      next_evaluation_s: cooldown,
    };
  }

  /**
   * Record the learner's response to an intervention.
   * Used to adjust future behavior.
   */
  recordResponse(interventionId: string, optionChosen: 'accept' | 'dismiss' | 'alternative'): void {
    // In MVP, we track dismissals to potentially reduce frequency.
    // Full personalization in v2.
    if (optionChosen === 'dismiss') {
      // Learner didn't want this — extend cooldown slightly
      this.config.cooldown_s = Math.min(this.config.cooldown_s + 15, 300);
    } else if (optionChosen === 'accept') {
      // Positive signal — keep current cadence
      this.config.cooldown_s = Math.max(this.config.cooldown_s - 5, 60);
    }
  }

  /**
   * Update learner preferences (from calibration prompts).
   */
  updatePreferences(prefs: Partial<PolicyConfig['preferences']>): void {
    this.config.preferences = { ...this.config.preferences, ...prefs };
  }

  /**
   * Reset engine state (e.g., new session).
   */
  reset(): void {
    this.history = [];
    this.conditionHistory = [];
    this.lastInterventionTime = 0;
  }

  // -------------------------------------------------------------------------
  // Private: decision helpers
  // -------------------------------------------------------------------------

  private noIntervention(reasoning: string, nextEval: number): InterventionDecision {
    return {
      should_intervene: false,
      intervention: null,
      reasoning,
      next_evaluation_s: nextEval,
    };
  }

  private adjustedThreshold(): number {
    const base = this.config.confidence_threshold;
    switch (this.config.preferences.frequency) {
      case 'fewer': return base + 0.1;
      case 'more': return Math.max(base - 0.1, 0.3);
      default: return base;
    }
  }

  private adjustedCooldown(): number {
    const base = this.config.cooldown_s;
    switch (this.config.preferences.frequency) {
      case 'fewer': return base * 1.5;
      case 'more': return base * 0.7;
      default: return base;
    }
  }

  private isSustained(condition: LearningCondition, now: number): boolean {
    const cutoff = now - this.config.sustained_window_s;
    const recent = this.conditionHistory.filter((h) => h.t >= cutoff);
    if (recent.length === 0) return false;

    const matchCount = recent.filter((h) => h.condition === condition).length;
    return matchCount / recent.length >= 0.6; // 60% of recent window
  }

  private chooseClass(
    candidates: InterventionClass[],
    _state: LearningConditionState,
  ): InterventionClass {
    // Filter by preferences
    const filtered = candidates.filter((c) => {
      if (c === 'reset' && !this.config.preferences.offer_breaks) return false;
      if (c === 'hint' && !this.config.preferences.offer_hints) return false;
      return true;
    });

    // Avoid repeating the last intervention class
    const lastClass = this.history.length > 0
      ? this.history[this.history.length - 1].class
      : null;
    const varied = filtered.filter((c) => c !== lastClass);

    return (varied.length > 0 ? varied : filtered)[0] ?? candidates[0];
  }

  private buildIntervention(
    cls: InterventionClass,
    state: LearningConditionState,
  ): Intervention {
    const messages = RESPONSE_GRAMMAR[cls];
    const message = messages[Math.floor(Math.random() * messages.length)];

    const options = [
      { id: 'accept', label: this.acceptLabel(cls), action: 'accept' as const },
      { id: 'dismiss', label: 'Not now', action: 'dismiss' as const },
    ];

    // Agency interventions get an alternative option
    if (cls === 'agency' || cls === 'modality') {
      options.splice(1, 0, {
        id: 'alternative',
        label: 'Something else',
        action: 'alternative' as const,
      });
    }

    return {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      class: cls,
      message,
      options,
      triggered_by: state.drivers.map((d) => d.description),
      confidence: state.confidence,
    };
  }

  private acceptLabel(cls: InterventionClass): string {
    switch (cls) {
      case 'pace': return 'Slow down';
      case 'modality': return 'Show me';
      case 'hint': return 'Yes, a hint';
      case 'reset': return 'Take a break';
      case 'agency': return 'Choose for me';
    }
  }

  // -------------------------------------------------------------------------
  // Private: housekeeping
  // -------------------------------------------------------------------------

  private pruneConditionHistory(now: number): void {
    const cutoff = now - this.config.sustained_window_s * 2;
    while (this.conditionHistory.length > 0 && this.conditionHistory[0].t < cutoff) {
      this.conditionHistory.shift();
    }
  }
}
