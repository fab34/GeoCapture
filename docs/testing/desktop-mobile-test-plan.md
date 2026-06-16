# Geo Capture Desktop and Mobile Test Plan

This checklist is for validating Geo Capture before submitting it to the Obsidian Community Plugins directory.

## Test Environments

- macOS desktop Obsidian.
- Windows desktop Obsidian, if available before submission.
- Linux desktop Obsidian, if available before submission.
- iOS Obsidian.
- Android Obsidian, if available before submission.

The community submission checklist asks maintainers to test desktop platforms and mobile platforms when applicable.

## Install For Local Testing

Build the plugin:

```bash
npm install
npm run build
```

Copy or symlink the repository folder into the test vault:

```bash
ln -s /Users/fab34/Desktop/Git/GeoCapture /path/to/vault/.obsidian/plugins/geo-capture
```

Then enable the plugin from Obsidian settings.

For mobile testing, sync or copy the built plugin folder into:

```text
<vault>/.obsidian/plugins/geo-capture
```

Required files in that folder:

- `main.js`
- `manifest.json`
- `styles.css`

## Core Functional Tests

### Quick Insert Place

- Run `Geo Capture: Quick insert place`.
- Search a known place name.
- Select a candidate.
- Confirm a Markdown location snippet is inserted at the cursor.
- Type coordinates such as `25.033964, 121.564468`.
- Confirm the coordinate candidate can be inserted.
- Paste a Google Maps, Apple Maps, or OpenStreetMap link.
- Confirm the parsed location can be inserted.

### Current Location

- Run `Geo Capture: Insert current location`.
- Grant location permission if prompted.
- Confirm coordinates are inserted.
- Deny location permission in a separate test.
- Confirm the plugin shows a clear error and does not modify the note.

### Nearby Capture With Google Places

- Set `Place search provider` to `Google Places`.
- Enter a valid Google Places API key.
- Run `Geo Capture: Capture nearby place`.
- Confirm nearby candidates appear with name, address, and distance.
- Select a candidate.
- Confirm the selected place is inserted.

### Clipboard Parsing

- Copy a supported map link or coordinate pair.
- Run `Geo Capture: Insert location from clipboard`.
- Confirm insertion succeeds.
- Copy unrelated text.
- Confirm no note content is modified.

### Image EXIF Flow

- Insert a local JPG/JPEG image with GPS EXIF metadata into a note.
- Place the cursor near the image.
- Run `Geo Capture: Suggest place from nearest image`.
- Confirm GPS is detected.
- If Google Places is configured, confirm nearby candidates appear.
- Select a candidate and confirm insertion.

### Image Fallback Flow

- Insert a local image without GPS EXIF metadata.
- Run `Geo Capture: Suggest place from nearest image`.
- Confirm the plugin opens manual place input.
- Enter a place name or coordinates and confirm insertion succeeds.

### Image Insert Position

- Set `Image place insert position` to `At current cursor`.
- Confirm image-based place snippets insert at the cursor.
- Set it to `Below the image`.
- Confirm image-based place snippets insert directly below the detected image line.

### Localization

- Set `Display language` to `System`.
- Confirm the UI follows Obsidian language where possible.
- Set `Display language` to English.
- Confirm commands, settings, notices, and placeholders are English.
- Set `Display language` to Traditional Chinese.
- Confirm commands, settings, notices, and placeholders are Traditional Chinese.
- Set `Display language` to Simplified Chinese.
- Confirm commands, settings, notices, and placeholders are Simplified Chinese.

## Release Checklist

- `npm run check` passes.
- `main.js`, `manifest.json`, and `styles.css` exist at repository root.
- `manifest.json` version matches `versions.json`.
- GitHub release name equals the manifest version exactly, without a `v` prefix.
- GitHub release assets include individual `main.js`, `manifest.json`, and `styles.css` files.
- README describes the purpose, setup, commands, limitations, privacy, and Google Places API usage.
- LICENSE file exists.
