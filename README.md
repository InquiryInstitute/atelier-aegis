# Ægis

**An Atelier Instrument for Attentive Learning**

Stewarded by **a.Weil** — Faculty of Attention & Moral Perception

---

> *"Attention, taken to its highest degree, is the same thing as generosity."*
> — Simone Weil

---

## What Ægis Is

Ægis exists to support attention as a moral and pedagogical act. It notices when learning falters, responds with care, protects the dignity of the pupil, and refuses coercion, ranking, or extraction.

- **An instrument** — not emotion recognition software
- **A studio aid** — not behavior scoring
- **A listening device for learning rhythms** — not affective surveillance
- **A guardian of pace** — not classroom analytics for authority

## Architecture

```
atelier-aegis/
├── app/                                  # Capacitor + shared UI
├── packages/
│   ├── feature-stream/                   # Canonical schema + PerceptionPlugin API
│   ├── inference/                        # Learning-condition estimator (rule-based MVP)
│   └── policy/                           # Pedagogical intervention engine
├── plugins/
│   ├── web-aegis-perception/             # MediaPipe WASM (Phase 0 — first target)
│   ├── ios-aegis-perception/             # ARKit / Vision (Phase 1–2)
│   └── android-aegis-perception/         # MediaPipe Face Landmarker (Phase 1)
├── docs/
│   ├── AEGIS.md                          # Instrument spec & moral charter
│   └── APP_DESIGN.md                     # Full app design document
├── index.html                            # GitHub Pages project page
├── package.json                          # Monorepo (npm workspaces)
└── tsconfig.json                         # Project references
```

## Platform Strategy

All platforms emit the same **Feature Stream** schema. The pedagogy engine is shared.

| Platform | Best Tier | Backend |
|----------|-----------|---------|
| Web | Tier 1 | MediaPipe Tasks (WASM) — Phase 0 prototype |
| Android | Tier 1 | MediaPipe Face Landmarker |
| iOS / iPadOS | Tier 2 | ARKit Face Tracking (TrueDepth) |

**Key design choice:** The pedagogy engine never depends on TrueDepth-only features. Those only increase confidence.

## Capability Tiers

| Tier | Input | Available On |
|------|-------|-------------|
| **Tier 0** | Interaction telemetry only | All platforms (camera off) |
| **Tier 1** | RGB face tracking | Web, Android, iOS fallback |
| **Tier 2** | TrueDepth / ARKit | iPhone X+, iPad Pro |

## Learning Conditions (Not Emotions)

Ægis never infers emotion. It infers **learning conditions**:

| Condition | Signals |
|-----------|---------|
| **Attentive** | sustained orientation + interaction flow |
| **Wandering** | frequent gaze breaks, posture drift |
| **Confused** | retries + hesitation + micro-withdrawal |
| **Overloaded** | elevated arousal + reduced precision |
| **Fatigued** | blink rate + slowing responses |

Each state is probabilistic, time-windowed, confidence-scored, and explicitly revisable.

## Ethical Safeguards (Architectural)

1. Local-first inference
2. No raw perceptual retention
3. User-visible opt-out at all times
4. No silent mode changes
5. No teacher-facing individual data
6. Aggregate-only classroom views (optional)
7. Explicit uncertainty disclosure

## Build Order

1. **Web Tier 1 prototype** — fast iteration, easy demo
2. **Capacitor shell** — reusing same TS inference / pedagogy
3. **Native plugins per platform** — emitting the same feature schema
4. **ARKit Tier 2** — premium fidelity layer

## Placement

```
Atelier → Instruments → Ægis
```

| Related Faculty | Domain |
|----------------|--------|
| a.Montessori | readiness |
| a.James | attention & habit |
| a.Dewey | feedback & experience |
| **a.Weil** | **moral steward** |

## Documentation

- [`docs/AEGIS.md`](docs/AEGIS.md) — Instrument specification & moral charter
- [`docs/APP_DESIGN.md`](docs/APP_DESIGN.md) — Full app design document
- [`packages/feature-stream/`](packages/feature-stream/) — Feature stream schema + plugin API

## Project Page

https://inquiryinstitute.github.io/atelier-aegis/

---

*Stewarded by: a.Weil — Faculty of Attention & Moral Perception*
*Instrument class: Atelier*
*Custodian: Inquiry Institute*
