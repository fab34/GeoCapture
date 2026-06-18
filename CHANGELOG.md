# Changelog

## 0.1.14

- Replaced `this.t.bind(this)` modal arguments with an explicitly typed translator wrapper to address the community review `@typescript-eslint/no-unsafe-argument` warning.

## 0.1.13

- Made image-location diagnostics easier to read by highlighting the active source (`EXIF`, `R2 metadata`, or `Geo Capture cache`) and the next recovery step.
- Added simple duplicate-place protection so the same place is not inserted into the same note repeatedly by accident.
- Improved Google Places fallback behavior:
  - current-location nearby search now falls back to inserting raw coordinates
  - image nearby search now falls back to the photo GPS location instead of breaking the flow
- Prepared `0.1.13` release notes and regression checklist updates for desktop/mobile verification.

## 0.1.12

- Added GitHub release attestation workflow and reduced remaining community review warnings.
