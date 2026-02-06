# iOS Ægis Perception Plugin

**Capacitor plugin for iOS face tracking and feature extraction.**

## Tiers

| Tier | Backend | Requirements |
|------|---------|--------------|
| Tier 2 | ARKit Face Tracking | TrueDepth camera (iPhone X+, iPad Pro) |
| Tier 1 | Vision framework | Any front-facing camera |
| Tier 0 | None | Telemetry only (camera denied or unavailable) |

## Capabilities

- Stable gaze vector (Tier 2 only)
- Head pose (yaw, pitch, roll)
- Blink detection via eye openness
- Face-to-screen distance proxy
- Blendshape expressivity (Tier 2 only)

## Implementation

This plugin implements `PerceptionPlugin` from `@aegis/feature-stream/perception-plugin`.

The native Swift layer captures ARKit face anchors (or Vision landmarks) and maps them
to `FeatureStreamEvent` objects, which are emitted to the shared TypeScript layer
via the Capacitor bridge.

### Privacy

- **No raw frames** cross the native → JS bridge
- **No face geometry** is stored
- Camera session is released on `stop()`
- Usage description: "Ægis uses the camera to notice when you might be tired or confused, so it can offer help. No images are stored."

## Status

Stub — implementation in Phase 1/2.
