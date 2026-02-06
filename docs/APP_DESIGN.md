# ÆGIS App Design Document

**Atelier Instrument for Attentive Learning**
iOS / iPadOS / Android / Web

Steward: **a.Weil**
Product class: Atelier → Instruments
Core promise: adaptive pedagogy from attentional signals, without surveillance

---

## 1. Goals and Non-Goals

### Goals

- Run the same learning experience across:
  - iPhone / iPad (best fidelity via TrueDepth / ARKit where available)
  - Android (RGB-based via MediaPipe / ML Kit)
  - Web (laptop camera via browser APIs + on-device inference)
- Estimate **learning conditions** (not "emotions"):
  - Attentive, Wandering, Confused, Overloaded, Fatigued
- Provide gentle pedagogical interventions:
  - pace shift, modality shift, hint ladders, micro-breaks
- Be privacy-first:
  - no raw video storage by default
  - features-only stream
  - clear user controls and uncertainty disclosure

### Non-Goals

- No "emotion detection" labels as truth
- No identity recognition
- No teacher/authority surveillance dashboards with individual-level metrics
- No cloud-required inference

---

## 2. Platform Strategy

### Delivery Model

- **Primary:** Capacitor (iOS / Android) + shared TypeScript codebase
- **Web:** PWA build of the same app (Vite / Next / Astro — whichever matches II stack)

### Camera / Sensing Approach by Platform

All platforms emit the same **Feature Stream** schema so the pedagogy engine is shared.

| Platform | Best Tier | Fallback | Notes |
|----------|-----------|----------|-------|
| **iOS / iPadOS** | Tier 2: ARKit Face Tracking (TrueDepth) | Tier 1: Vision-based face landmarks (RGB) | TrueDepth adds stable gaze vector, blendshapes |
| **Android** | Tier 1: MediaPipe Face Landmarker (+ Iris) | Tier 0: no camera, telemetry only | MediaPipe WASM for consistency |
| **Web** | Tier 1: MediaPipe Tasks (WASM) in browser | Tier 0: telemetry only | `getUserMedia` camera feed, on-device inference |

**Key design choice:** The pedagogy engine never depends on "TrueDepth-only" features. Those only increase confidence.

---

## 3. Capability Tiers

### Tier 0 — Camera Off

- **Inputs:** interaction telemetry, timing, performance, optional self-report
- **Outputs:** learning condition estimates (low confidence), interventions

### Tier 1 — RGB Perception

- **Inputs:** face presence, approximate head pose, blink proxy, gaze proxy, face-size distance proxy
- **Platforms:** Android, Web, iOS fallback

### Tier 2 — TrueDepth / ARKit (iOS Premium)

- **Adds:** stable gaze vector, head pose stability, blendshape richness, better robustness in low light / occlusion
- **Platforms:** iPhone / iPad with TrueDepth

---

## 4. System Architecture

### High-Level Modules

```
┌──────────────────────────────────────────────────────┐
│                  Learning Experience                   │
│              (shared UI — content, exercises,          │
│               hints, micro-breaks, reflections)       │
├──────────────────────────────────────────────────────┤
│            Pedagogical Policy Engine                  │
│         (condition + confidence + preferences         │
│          → intervention selection + cooldowns)         │
├──────────────────────────────────────────────────────┤
│              Inference Layer                           │
│      (sliding-window state estimation 30–120s,        │
│       probabilistic conditions, explanations)         │
├──────────────────────────────────────────────────────┤
│            Feature Stream Bus                         │
│       (normalized schema, buffering, timestamps,      │
│        quality flags, tier detection)                 │
├───────────┬──────────────┬───────────────────────────┤
│  iOS      │   Android    │   Web                     │
│  ARKit /  │   MediaPipe  │   MediaPipe WASM          │
│  Vision   │   Face       │   + getUserMedia          │
│           │   Landmarker │                           │
└───────────┴──────────────┴───────────────────────────┘
         Perception Layer (native / web)
     Produces features at 10–30 Hz
     Never persists raw frames by default
```

1. **Perception Layer** (native / web)
   - Captures camera frames (or ARKit callbacks)
   - Produces features at 10–30 Hz
   - Never persists raw frames by default

2. **Feature Stream Bus** (shared)
   - Normalizes to common schema
   - Handles buffering, timestamps, quality flags

3. **Inference Layer** (shared TS + optional native acceleration)
   - Sliding-window state estimation (30–120s)
   - Outputs: learning condition probabilities, confidence / uncertainty, "why" explanations

4. **Pedagogical Policy Engine** (shared)
   - Chooses interventions based on: condition + confidence, content type, learner preferences, recent intervention history (avoid nagging)

5. **Learning Experience Layer** (shared UI)
   - Content playback (text / audio / video)
   - Exercises, hint ladders, micro-breaks
   - Journaling / reflections

6. **Storage + Sync** (optional)
   - Local first (SQLite / IndexedDB)
   - Optional sync to II infra (Supabase) for user-owned summaries only

---

## 5. Feature Stream Schema (Contract)

**Principle:** features-only; no identity; no raw imagery.

```json
{
  "t": 1738860000.123,
  "source": "ios_arkit | android_mediapipe | web_mediapipe | telemetry_only",
  "quality": {
    "face_present": true,
    "multiple_faces": false,
    "occluded": false,
    "low_light": false,
    "confidence": 0.82
  },
  "pose": { "yaw": -0.08, "pitch": 0.02, "roll": 0.01 },
  "gaze": { "x": 0.12, "y": -0.05, "confidence": 0.76 },
  "eyes": { "blink_rate_30s": 0.21, "openness_l": 0.64, "openness_r": 0.61 },
  "distance": { "face_scale": 0.37 },
  "expressivity": {
    "smile": 0.08,
    "brow_furrow": 0.31
  },
  "interaction": {
    "scroll_speed": 0.0,
    "tap_rate_10s": 0.2,
    "retry_count_60s": 1
  }
}
```

**Notes:**
- `gaze` may be `null` on Tier 1. The inference layer must handle missing fields.
- `expressivity` is optional and should be treated as weak evidence (never "emotion").

---

## 6. Learning-Condition Inference

### Output State (every ~2–5 seconds)

```json
{
  "t": 1738860005.0,
  "condition": {
    "attentive": 0.62,
    "wandering": 0.18,
    "confused": 0.31,
    "overloaded": 0.09,
    "fatigued": 0.12
  },
  "confidence": 0.71,
  "drivers": [
    "frequent gaze breaks",
    "slower response times",
    "two retries in last minute"
  ]
}
```

### Model Approach (MVP → v2)

| Phase | Approach | Notes |
|-------|----------|-------|
| **MVP** | Rule + smoothing (EWMA) + thresholds per tier + cooldowns | Interpretable, debuggable |
| **v2** | Lightweight temporal model (HMM / GRU) trained on opt-in labeled data | Better sensitivity |
| **Personalization** | Per-user baselines (blink, typical gaze breaks), tuned via occasional self-report | Consent-driven |

---

## 7. Pedagogical Interventions

### Intervention Catalog

| Class | Description |
|-------|-------------|
| **Pace** | Slow down narration, increase spacing, chunk content |
| **Modality** | Diagram / worked example / analogy / brief summary |
| **Hints** | Hint ladder (nudge → partial → worked solution) |
| **Reset** | 15–30s micro-break (breath, stretch, look away) |
| **Agency** | Ask preference ("example or diagram?") |

### Intervention Rules (a.Weil Doctrine)

- Intervene only when:
  - confidence ≥ threshold **AND**
  - a sustained signal window triggers **AND**
  - cooldown has elapsed
- Never more than N interruptions per 10 minutes (configurable)
- Always offer an **"Ignore for now"** option

---

## 8. UX Design

### Learner-Facing Screens

1. **Session Home** — "Continue / New lesson / Practice / Reflection"
2. **Lesson Player** — content + subtle "pulse" indicator (no score)
3. **Intervention Sheet** — gentle suggestion + choice buttons
4. **Explainability Drawer** — "What Ægis used" + confidence + what it did **not** use
5. **Privacy Controls** — camera toggle, data retention, export / delete

### The Pulse Indicator

- Not a meter
- Indicates: steady / wavering / uncertain
- Tap for explanation

### Web UX Specifics

- First-run camera permission dialog with plain-language rationale
- Handle camera absence gracefully (Tier 0)

---

## 9. Privacy, Safety, and Governance

### Defaults

- On-device processing
- No raw video storage
- Store only: session summaries, coarse time-series aggregates (optional), user self-reports
- Clear data deletion controls

### Classroom / "Authority" Mode (If Ever)

- Aggregate-only, anonymized, coarse bins
- No per-student attention scoring
- No real-time monitoring feed

### Abuse Prevention

- Detect multiple faces → drop confidence, disable certain inferences
- Detect screen recording (where possible) → warn + disable camera stream option
- Strong permission boundaries

---

## 10. Implementation Plan

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 0 — Prototype** | Tier 0 + Tier 1 (Web first, MediaPipe). Feature stream schema. Rule-based inference + 3 interventions. Privacy UI + explainability drawer. | 2–3 weeks |
| **Phase 1 — Capacitor Mobile MVP** | Shared UI codebase. Android plugin (MediaPipe). iOS RGB fallback plugin (Vision / landmarks). Local storage + session summaries. | 3–4 weeks |
| **Phase 2 — iOS Tier 2 Premium** | ARKit TrueDepth plugin. Higher confidence gaze / head pose. Personalization calibration loop. | 2–3 weeks |
| **Phase 3 — Hardening** | Evaluation harness (opt-in). Bias / lighting robustness tests. Intervention A/B (locally, privacy-preserving). | Ongoing |

---

## 11. Key Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Web performance variance | Adaptive frame rate, "low power" mode, Tier 0 fallback |
| Android fragmentation | Baseline on MediaPipe + conservative confidence |
| Misinterpretation as surveillance | UI doctrine, copy, constraints, defaults |
| False positives | Confidence + cooldown + "I may be mistaken" language + learner control |

---

## 12. Build Order

The cleanest path:

1. **Web Tier 1 prototype** — fast iteration, easy demo
2. **Capacitor shell** — reusing same TS inference / pedagogy
3. **Native plugins per platform** — emitting the same feature schema
4. **ARKit Tier 2** — as premium fidelity layer

---

*Stewarded by: a.Weil — Faculty of Attention & Moral Perception*
*Instrument class: Atelier*
*Custodian: Inquiry Institute*
