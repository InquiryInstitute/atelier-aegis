# Android Ægis Perception Plugin

**Capacitor plugin for Android face tracking via MediaPipe.**

## Tiers

| Tier | Backend | Requirements |
|------|---------|--------------|
| Tier 1 | MediaPipe Face Landmarker (+ Iris) | Front-facing camera |
| Tier 0 | None | Telemetry only (camera denied or unavailable) |

## Capabilities

- Face presence detection
- Approximate head pose (yaw, pitch, roll)
- Blink proxy via eye landmark distances
- Approximate gaze direction via iris position
- Face-to-screen distance proxy via face bounding box

## Implementation

This plugin implements `PerceptionPlugin` from `@aegis/feature-stream/perception-plugin`.

The native Kotlin/Java layer runs MediaPipe Face Landmarker and maps 478 landmarks
to the compact `FeatureStreamEvent` schema, emitted to TypeScript via Capacitor bridge.

### Privacy

- **No raw frames** cross the native → JS bridge
- **No face mesh** is stored — only derived features
- Camera session is released on `stop()`
- Permission rationale: "Ægis uses the camera to notice when you might need help with learning. No images are saved."

## Status

Stub — implementation in Phase 1.
