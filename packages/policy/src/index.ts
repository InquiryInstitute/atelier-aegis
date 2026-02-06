/**
 * @aegis/policy
 *
 * Pedagogical Policy Engine for Ægis.
 *
 * Ægis responds only by offering. Never by forcing, interrupting
 * aggressively, escalating authority, or notifying third parties.
 *
 * "A smaller step might be kinder." — a.Weil doctrine
 */

export { PedagogicalPolicyEngine } from './engine';
export type {
  InterventionClass,
  Intervention,
  InterventionDecision,
  PolicyConfig,
  LearnerPreferences,
} from './types';
