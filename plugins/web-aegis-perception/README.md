# Web Ægis Perception Plugin

**Browser-based face tracking via MediaPipe Tasks (WASM).**

This is the **Phase 0 prototype** backend — the first to be implemented,
because it enables fast iteration and easy demos without native builds.

## Tiers

| Tier | Backend | Requirements |
|------|---------|--------------|
| Tier 1 | MediaPipe Face Landmarker (WASM) | `getUserMedia` camera access |
| Tier 0 | None | Telemetry only (camera denied or unavailable) |

## Capabilities

- Face presence detection
- Approximate head pose
- Blink proxy
- Approximate gaze direction
- Face-to-screen distance proxy

## Implementation

Implements `PerceptionPlugin` from `@aegis/feature-stream/perception-plugin`.

Uses `@mediapipe/tasks-vision` (WASM build) running entirely in the browser.
No server calls. No frame data leaves the device.

### First-Run Experience

```
"Ægis can use your camera to notice when you might be tired
or confused, so it can offer gentler pacing or a break.

No images are stored. Processing happens entirely on your device.

You can always turn this off."

[Allow camera]  [Not now — continue without]
```

"Not now" gracefully falls back to Tier 0 (telemetry only).

## Status

Phase 0 — first implementation target.
