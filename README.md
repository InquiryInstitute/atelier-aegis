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

## What Ægis Does Not Do

- Monitor compliance
- Optimize productivity
- Label emotions
- Grade attention
- Surveil classrooms

## Design Principles

**Anti-Surveillance Aesthetics**: No meters. No scores. No heatmaps. No red/green. No leaderboards.

**Presence, Not Measurement**: A subtle pulse — steady, wavering, or fading — always tappable, always explainable.

**Response by Offering**: Ægis never forces, interrupts aggressively, escalates authority, or notifies third parties.

**Architectural Safeguards**:
1. Local-first inference
2. No raw perceptual retention
3. User-visible opt-out at all times
4. No silent mode changes
5. No teacher-facing individual data
6. Aggregate-only classroom views (optional)
7. Explicit uncertainty disclosure

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

## Project Page

Visit: https://InquiryInstitute.github.io/atelier-aegis/

## Documentation

The full instrument specification lives in [`docs/AEGIS.md`](docs/AEGIS.md) — this is the canonical design document covering stewardship, sensorium, inference model, pedagogical response engine, UI doctrine, and ethical safeguards.

## RAG Corpus

This project's `docs/` directory serves as the RAG corpus for the a.Weil chat widget on the project page. To process vectors:

```bash
npx tsx scripts/process-project-corpus-vectors.ts --project-id aegis
```

## Setup

This repository was created from the [Atelier Template](https://github.com/InquiryInstitute/atelier-template).

### GitHub Pages

1. Go to repository Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Save

The site deploys automatically on push to `main`.

---

*Stewarded by: a.Weil — Faculty of Attention & Moral Perception*
*Instrument class: Atelier*
*Custodian: Inquiry Institute*
