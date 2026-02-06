/**
 * @aegis/inference
 *
 * Learning-condition inference from the Ægis feature stream.
 *
 * Ægis never infers emotion. It infers learning conditions:
 * Attentive, Wandering, Confused, Overloaded, Fatigued.
 *
 * Each state is probabilistic, time-windowed, confidence-scored,
 * and explicitly revisable. No state is ever final or named as fact.
 */

export { LearningConditionEstimator } from './estimator';
export type {
  LearningCondition,
  LearningConditionState,
  ConditionDriver,
  EstimatorConfig,
} from './types';
