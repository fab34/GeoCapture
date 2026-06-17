# Geo Capture Security Review

Review date: 2026-06-17

## Summary

No runtime dependency vulnerabilities were found after updating development dependencies. The plugin does not use dynamic code execution, shell execution, Electron APIs, Node filesystem APIs, telemetry, analytics, or background data exfiltration.

## Commands Run

```bash
npm run build
npm audit
npm audit --omit=dev
rg "requestUrl|fetch\\(|eval\\(|Function\\(|child_process|exec\\(|spawn\\(|require\\(|electron|fs\\.|localStorage|indexedDB|navigator\\.clipboard|navigator\\.geolocation|readBinary|read\\(|modify\\(|delete\\(|trash\\(" src package.json manifest.json esbuild.config.mjs -n
```

## Network Access

The plugin only makes network requests for explicit location features:

- OpenStreetMap Nominatim search through `https://nominatim.openstreetmap.org/search`.
- Google Places API New through `https://places.googleapis.com/v1/places:searchText`.
- Google Places API New through `https://places.googleapis.com/v1/places:searchNearby`.

There is no hidden telemetry or analytics.

## Sensitive Data

The optional Google Places API key is stored in Obsidian plugin settings data through `this.saveData`. This is local plugin data, not sent anywhere except to Google Places API requests when Google Places is selected.

Users should restrict their Google API key in Google Cloud where possible.

Geo Capture also stores a small image GPS cache in local Obsidian plugin data after a successful EXIF or metadata lookup. The cache contains image identifiers, coordinates, source path labels, and timestamps. It does not contain image binary data or note content.

## Vault Access

The plugin reads only the active note context and local image files referenced by that note when the user runs image-based commands.

When resolving nearby image references, the plugin may scan vault file metadata for image filenames as a fallback on mobile. This is used to recover from Obsidian mobile link cache or sync timing issues and does not read every image's binary content.

Current implementation does not:

- Delete files.
- Move files.
- Modify files outside the active editor insertion.
- Read arbitrary files outside the vault.
- Upload note content or images.

## Browser APIs

The plugin uses:

- `navigator.geolocation` only when the user runs a current-location or nearby-place command.
- `navigator.clipboard.readText` only when the user runs clipboard insertion.

## Code Execution

The scan did not find:

- `eval`
- `new Function`
- `child_process`
- Shell execution
- Dynamic remote code loading
- Electron API usage

## Known Privacy Considerations

Location searches send user-provided search text or coordinates to the selected provider. The README should continue to disclose this clearly.

Photo EXIF GPS is read locally. Coordinates may be sent to Google Places only when Google Places is configured and the user runs a nearby-place or image-location command.

## Current Assessment

The code is clean enough for local desktop/mobile testing. Before community submission, complete the desktop/mobile test plan and create a release with the required assets.
