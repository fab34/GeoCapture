# Geo Capture

Geo Capture is an Obsidian plugin for fast travel-journal location capture. It focuses on inserting useful place snippets into notes with very few steps, instead of becoming a full map-management surface.

## MVP

- Insert current location from the active note.
- Search places with OpenStreetMap Nominatim and insert the selected result.
- Optionally use Google Places for text search and current-location nearby capture.
- Accept place names, coordinates, or map links from a single quick-insert flow.
- Parse common map URLs from the clipboard and insert a location snippet.
- Offer writing-friendly output formats: compact line, callout block, table row, and configurable template.
- Keep provider choices replaceable so Google Places, Apple Maps links, and richer reverse geocoding can be added later.

## Product Principles

- The note is the source of truth.
- Capture should be possible while standing in line or walking.
- The plugin should insert clean Markdown, not trap data in a private database.
- Map browsing is secondary; capture and formatting are primary.

## Development

```bash
npm install
npm run dev
```

For local testing, copy or symlink this folder into:

```text
<vault>/.obsidian/plugins/geo-capture
```

Required Obsidian release files are `main.js`, `manifest.json`, and optionally `styles.css`.

## Roadmap

### Phase 1: Capture Core

- Current location command
- Place search command
- Nearby place capture with Google Places
- Clipboard map URL parser
- Basic settings and output formats

### Phase 2: Travel Journal Flow

- Recent captures
- One-tap category labels such as restaurant, cafe, hotel, station, viewpoint
- Daily-note insertion helpers
- Frontmatter/properties mode
- Photo-based place suggestion from EXIF GPS metadata
- Manual fallback when image metadata is missing

### Phase 3: Rich Integrations

- Google Places provider option
- Reverse geocoding
- Photo adjacency workflow
- Cloudflare Media Sync command-aware workflow
- Trip itinerary template integration
- Optional Map View compatibility output
