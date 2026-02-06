/**
 * Ægis Pipeline
 *
 * Wires perception → inference → policy into a single coherent loop.
 * The pipeline is the heartbeat of the app.
 */

import type { FeatureStreamEvent } from '@aegis/feature-stream';
import { PerceptionTier } from '@aegis/feature-stream';
import { LearningConditionEstimator } from '@aegis/inference';
import type { LearningConditionState } from '@aegis/inference';
import { PedagogicalPolicyEngine } from '@aegis/policy';
import type { InterventionDecision, Intervention } from '@aegis/policy';
import { WebPerception } from '../perception/web-perception';
import type { PerceptionState } from '../perception/web-perception';
import { InteractionTracker } from '../telemetry/interaction-tracker';

// ---------------------------------------------------------------------------
// Pipeline events
// ---------------------------------------------------------------------------

export interface PipelineCallbacks {
  onConditionUpdate: (state: LearningConditionState) => void;
  onIntervention: (intervention: Intervention) => void;
  onTierChange: (tier: PerceptionTier) => void;
  onPerceptionStateChange: (state: PerceptionState) => void;
  onPolicyReasoning: (reasoning: string) => void;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class AegisPipeline {
  private perception: WebPerception;
  private estimator: LearningConditionEstimator;
  private policy: PedagogicalPolicyEngine;
  private tracker: InteractionTracker;
  private callbacks: PipelineCallbacks;
  private currentTier: PerceptionTier = PerceptionTier.Tier0;
  private lastCondition: LearningConditionState | null = null;
  private inferenceInterval: number | null = null;

  constructor(callbacks: PipelineCallbacks) {
    this.callbacks = callbacks;
    this.tracker = new InteractionTracker();
    this.estimator = new LearningConditionEstimator({
      window_s: 60,
      emit_interval_s: 3,
      confidence_threshold: 0.4,
    });
    this.policy = new PedagogicalPolicyEngine({
      confidence_threshold: 0.45,
      sustained_window_s: 10, // shorter for demo
      cooldown_s: 30, // shorter for demo
      max_per_10min: 5,
    });

    this.perception = new WebPerception({
      onFeature: this.onFeature,
      onTierChange: (tier) => {
        this.currentTier = tier;
        this.estimator.setTier(tier);
        this.callbacks.onTierChange(tier);
      },
      onStateChange: (state) => {
        this.callbacks.onPerceptionStateChange(state);
      },
    });
  }

  /**
   * Attach interaction tracking to a scrollable content element.
   */
  attachTracking(element: HTMLElement): void {
    this.tracker.attach(element);
  }

  /**
   * Initialize perception (requests camera permission).
   */
  async initPerception(): Promise<PerceptionTier> {
    return this.perception.initialize();
  }

  /**
   * Start the full pipeline.
   */
  start(): void {
    this.perception.start();

    // Run inference on a fixed interval (even in Tier 0)
    this.inferenceInterval = window.setInterval(() => {
      this.runInference();
    }, 2000);
  }

  /**
   * Pause the pipeline.
   */
  pause(): void {
    this.perception.pause();
    if (this.inferenceInterval !== null) {
      clearInterval(this.inferenceInterval);
      this.inferenceInterval = null;
    }
  }

  /**
   * Stop everything.
   */
  stop(): void {
    this.pause();
    this.perception.stop();
    this.estimator.reset();
    this.policy.reset();
    this.tracker.reset();
  }

  /**
   * Record learner response to an intervention.
   */
  recordInterventionResponse(interventionId: string, response: 'accept' | 'dismiss' | 'alternative'): void {
    this.policy.recordResponse(interventionId, response);
  }

  /**
   * Record a retry event from the lesson content.
   */
  recordRetry(): void {
    this.tracker.recordRetry();
  }

  /**
   * Set current content element for tracking.
   */
  setContentElement(id: string): void {
    this.tracker.setContentElement(id);
  }

  /**
   * Get the current perception tier.
   */
  getTier(): PerceptionTier {
    return this.currentTier;
  }

  /**
   * Get the perception state.
   */
  getPerceptionState(): PerceptionState {
    return this.perception.getState();
  }

  /**
   * Get the latest learning condition.
   */
  getLastCondition(): LearningConditionState | null {
    return this.lastCondition;
  }

  /**
   * Toggle camera on/off.
   */
  async toggleCamera(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.perception.initialize();
      this.perception.start();
    } else {
      this.perception.stop();
    }
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private onFeature = (event: FeatureStreamEvent): void => {
    // Merge interaction telemetry into the feature event
    const telemetry = this.tracker.getSnapshot();
    event.interaction = telemetry;

    // Feed to estimator
    this.estimator.ingest(event);
  };

  private runInference(): void {
    const now = Date.now() / 1000;

    // In Tier 0, we still generate events from telemetry alone
    if (this.currentTier === PerceptionTier.Tier0) {
      const telemetry = this.tracker.getSnapshot();
      const syntheticEvent: FeatureStreamEvent = {
        t: now,
        source: 'telemetry_only',
        quality: {
          face_present: false,
          multiple_faces: false,
          occluded: false,
          low_light: false,
          confidence: 0,
        },
        pose: null,
        gaze: null,
        eyes: null,
        distance: null,
        interaction: telemetry,
      };
      this.estimator.ingest(syntheticEvent);
    }

    const state = this.estimator.estimate(now);
    if (!state) return;

    this.lastCondition = state;
    this.callbacks.onConditionUpdate(state);

    // Run policy
    const decision: InterventionDecision = this.policy.evaluate(state);
    this.callbacks.onPolicyReasoning(decision.reasoning);

    if (decision.should_intervene && decision.intervention) {
      this.callbacks.onIntervention(decision.intervention);
    }
  }
}
