# Geo Capture

[繁體中文說明](./README-zh.md)

Geo Capture is an Obsidian plugin for fast place capture in travel journals, trip logs, restaurant notes, and photo-based memories.

## Positioning

Geo Capture is a note-first location capture plugin for Obsidian. It is built for travel journals, check-in logs, restaurant notes, sightseeing notes, and photo-based trip reviews.

It is not designed to replace a full map workspace. Its job is to help you insert useful place information into the note you are already writing.

## Features

- Insert current device coordinates.
- Capture nearby place candidates with Google Places.
- Search places with OpenStreetMap Nominatim or Google Places.
- Use one quick insert flow for place names, coordinates, and map links.
- Parse map links or coordinates from the clipboard.
- Read EXIF GPS from nearby local JPG/JPEG images in the current note.
- Fall back to R2 Media Sync's local image metadata cache when the nearby image has already been rewritten to an R2 URL or the local attachment is unavailable.
- Insert photo-derived places at the current cursor or directly below the image.
- Fall back to manual place input when image GPS metadata is missing.
- Insert Markdown-friendly place snippets in compact, callout, table row, or custom template formats.
- Generate Google Maps, Apple Maps, or OpenStreetMap links.
- Support multilingual UI with system language detection and manual language override.

## Commands

- `Geo Capture: Quick insert place`
  Search by place name, paste a map link, or type coordinates.

- `Geo Capture: Capture nearby place`
  Get current location and list nearby place candidates with Google Places.

- `Geo Capture: Insert current location`
  Insert raw current device coordinates.

- `Geo Capture: Insert location from clipboard`
  Parse coordinates or common map links from the clipboard.

- `Geo Capture: Suggest place from nearest image`
  Find a nearby image in the current note, read JPG/JPEG EXIF GPS or R2 Media Sync metadata, and suggest nearby places.

## Google Places Setup

Google Places is optional. To enable Google-powered search and nearby capture:

1. Set `Place search provider` to `Google Places`.
2. Enter a `Google Places API key`.
3. Enable `Places API (New)` in Google Cloud.
4. Adjust `Nearby search radius`.

Geo Capture uses Places API New endpoints `places:searchText` and `places:searchNearby`, with a minimal FieldMask for required fields.

## Localization

Geo Capture uses `System` as the default display language and follows the current Obsidian app language. You can also manually choose:

- `English`
- `Traditional Chinese`
- `Simplified Chinese`

Command names, settings, notices, search placeholders, and some default inserted labels are localized.

## Image Insert Position

`Image place insert position` supports:

- `At current cursor`
- `Below the image`

When set to `Below the image`, `Suggest place from nearest image` inserts the selected place immediately below the detected image, which fits a photo-first travel journal layout.

## Cloudflare Media Sync Workflow

Geo Capture is designed to pair with `fab34/cloudflare-media-sync`:

1. Insert photos into an Obsidian note.
2. R2 Media Sync reads available JPEG GPS coordinates before uploading and records them in its local `image_metadata.json` cache.
3. Cloudflare Media Sync uploads the image to Cloudflare R2 and rewrites the image link.
4. Let Geo Capture read local JPG/JPEG EXIF GPS, or fall back to the R2 Media Sync metadata cache when the note already contains an R2 URL.
5. Select a nearby place or enter a place manually.
6. Geo Capture writes durable location Markdown into the note.

The location annotation remains readable even after the local image link is replaced by an R2 URL.

## Current Limitations

- EXIF GPS reading currently supports local JPG/JPEG files.
- R2 URL fallback depends on R2 Media Sync having captured GPS metadata before the image was uploaded.
- HEIC, PNG, WebP, and remote image URL metadata reading are not implemented yet.
- Many photos lose GPS metadata because of privacy settings, compression, social apps, or transfer workflows.
- Google Places requires an API key and may incur Google Maps Platform costs.
- Nearby search is available only when Google Places is selected and configured.

## Privacy and Security

- Geo Capture does not include telemetry or analytics.
- Geo Capture does not upload note content or images.
- Network requests are made only when the user runs search, nearby-place, or photo-location commands.
- The optional Google Places API key is stored in local Obsidian plugin data and is only used for Google Places API requests.
- Photo EXIF GPS is read locally; coordinates are sent to Google only when Google Places is configured and used.
- When Cloudflare Media Sync metadata fallback is used, Geo Capture reads `.obsidian/plugins/cloudflare-media-sync/image_metadata.json` locally and does not modify it.

See [docs/security/security-review.md](docs/security/security-review.md) for the current security review.

## Testing

See [docs/testing/desktop-mobile-test-plan.md](docs/testing/desktop-mobile-test-plan.md) for the desktop and mobile test checklist.

Before release, run:

```bash
npm run check
```

## Development

```bash
npm install
npm run dev
```

For local testing, symlink this folder into your vault:

```bash
ln -s /Users/fab34/Desktop/Git/GeoCapture /path/to/your/vault/.obsidian/plugins/geo-capture
```

Required Obsidian release files:

- `main.js`
- `manifest.json`
- `styles.css`
