# Changelog

## 0.2.0

- Added optional image location prompts in reading view. When a preview image has usable GPS from local EXIF, R2 metadata, or Geo Capture cache, Geo Capture can show an Add place button near the image.
- Added settings for image location prompts, prompt position, local EXIF detection, and R2 metadata detection.
- Reused the existing photo GPS workflow so prompt-based insertion keeps Google Places nearby suggestions, raw GPS fallback, source labels, and duplicate-place protection.

## 0.1.15

- Added clearer source labels to inserted place snippets, including image EXIF, R2 metadata, Geo Capture cache, current location, Google Places, OpenStreetMap, and clipboard sources.
- Added travel-focused insert formats: travel note, restaurant note, and photo caption.
- Added `{source}` as a custom template token.
- Includes the typed translator cleanup introduced in 0.1.14 for the community review `@typescript-eslint/no-unsafe-argument` warning.

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
