/**
 * Ægis — Main entry point
 *
 * Wires the pipeline (perception → inference → policy) to the UI.
 *
 * "I may be mistaken." — a.Weil
 */

import './styles/aegis.css';
import { AegisPipeline } from './pipeline/aegis-pipeline';
import { AppUI } from './ui/app-ui';

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

const pipeline = new AegisPipeline({
  onConditionUpdate: (state) => {
    ui.updateCondition(state);
  },
  onIntervention: (intervention) => {
    ui.showIntervention(intervention);
  },
  onTierChange: (tier) => {
    ui.updateTier(tier);
  },
  onPerceptionStateChange: (state) => {
    ui.updatePerceptionState(state);
  },
  onPolicyReasoning: (reasoning) => {
    ui.updatePolicyReasoning(reasoning);
  },
});

const ui = new AppUI(pipeline);

// Start on the home screen
ui.showScreen('home');

// Log startup
console.info(
  '%c◉ Ægis %c— instrument for attentive learning',
  'color: #1a1a1a; font-weight: bold; font-size: 14px;',
  'color: #9a9590; font-size: 14px;',
);
console.info(
  '%c"Attention, taken to its highest degree, is the same thing as generosity."',
  'color: #9a9590; font-style: italic;',
);
