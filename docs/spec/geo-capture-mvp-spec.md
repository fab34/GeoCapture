# Geo Capture MVP Specification

## Scope

The MVP provides a reliable location insertion workflow for Obsidian notes.

It supports three primary inputs:

- Current device location.
- Manual search text.
- Coordinates or map links.

Photo-based location suggestion is planned as the next major workflow and must be considered in the data model and UX, but it does not block MVP release.

## Commands

### Quick Insert Place

The user opens a single search modal from the active editor.

Accepted input:

- Place name, such as `Kiyomizu-dera`.
- Coordinates, such as `35.0001, 135.7808`.
- Map links from Google Maps, Apple Maps, or OpenStreetMap.

Behavior:

- If the input is coordinates or a supported map link, show a directly insertable candidate.
- If the input is text, query the active place search provider.
- Insert the selected candidate at the current cursor.

### Insert Current Location

The user inserts current device coordinates.

Behavior:

- Request high-accuracy geolocation.
- Insert current coordinates as a location snippet.
- Include accuracy text when provided by the device.

Future behavior:

- Use current coordinates to run nearby place search.
- Offer nearby candidates before insertion.

### Capture Nearby Place

The user chooses from places near their current device location.

Behavior:

- Requires Google Places provider and an API key.
- Requests current device location.
- Searches nearby places within the configured radius.
- Shows a candidate list with name, address, and distance.
- Includes the raw current location as a fallback candidate.
- Inserts the selected candidate at the current cursor.

### Insert Location From Clipboard

The user inserts a map link or coordinates from the clipboard.

Behavior:

- Read clipboard text.
- Parse supported map links or coordinate pairs.
- Insert a location snippet.
- Show a clear notice if no supported location input is found.

### Suggest Place From Nearest Image

The user inserts location information from an image near the editor cursor.

Behavior:

- Find the nearest local image reference in the active note.
- Support JPG/JPEG EXIF GPS in the first implementation.
- If GPS coordinates exist and Google Places is configured, search nearby places.
- If GPS coordinates exist but no nearby provider is configured, offer the raw photo location as an insertable candidate.
- If GPS coordinates are missing or the image type is unsupported, open manual place input.

## Location Candidate Model

Each candidate should contain:

- `name`
- `address`
- `lat`
- `lon`
- `source`
- `sourceUrl`
- `confidence`

Supported confidence values:

- `gps-derived`
- `search-selected`
- `manual-coordinate`
- `manual-text`
- `map-link`

## Insert Formats

### Compact

```md
[Place name](https://maps.example/...) (25.033, 121.565)
```

### Callout

```md
> [!location] [Place name](https://maps.example/...)
> Address
> `25.033, 121.565`
```

### Table Row

```md
| [Place name](https://maps.example/...) | Address | 25.033, 121.565 |
```

### Custom Template

Supported tokens:

- `{name}`
- `{address}`
- `{lat}`
- `{lon}`
- `{mapsUrl}`
- `{sourceUrl}`

## Provider Requirements

### MVP Provider

Use OpenStreetMap Nominatim for text search.

### Future Google Provider

Google Places supports:

- Text search.
- Nearby search from current location.

Google Places should later support:

- Nearby search from image GPS.
- Place details for address and map URL.

Google provider settings should include:

- API key.
- Language.
- Region.
- Search radius.

## Error Handling

If geolocation permission is denied, show a clear notice and suggest using Quick Insert Place.

If search fails, keep the modal open and show a notice.

If clipboard parsing fails, do not modify the note.

If coordinates are entered manually, allow insertion without reverse geocoding.

## Out Of Scope For MVP

- Full map browsing view.
- Route planning.
- Offline map tiles.
- Google Takeout import.
- Automatic photo upload.
- Review/rating/business metadata.
- Required dependency on Cloudflare Media Sync.
