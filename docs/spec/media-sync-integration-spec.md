# Media Sync Integration Specification

## Goal

Geo Capture should pair naturally with Cloudflare Media Sync for travel notes that contain photos.

The combined workflow should be:

1. The user inserts or uploads a photo into an Obsidian note.
2. Geo Capture suggests a place from image GPS metadata when available.
3. The user chooses or manually enters a place.
4. Geo Capture writes durable location information into the note.
5. Cloudflare Media Sync uploads the image and rewrites the image link.
6. The location information remains useful after the image URL changes.

## Ownership

Cloudflare Media Sync owns media storage and Markdown image URL rewriting.

Geo Capture owns location detection, place selection, and location snippet insertion.

The plugins should not require each other to function.

## Image Location Flow

### Success Flow

1. User runs `Geo Capture: Suggest place from image`.
2. Plugin finds the selected or nearest image in the current note.
3. Plugin resolves the local image file.
4. Plugin reads EXIF GPS metadata.
5. Plugin runs reverse geocoding and nearby search.
6. Plugin shows candidate places.
7. User selects a candidate.
8. Plugin inserts a place snippet near the image.

### Fallback Flow

If EXIF GPS is unavailable:

1. Plugin shows that no image location metadata was found.
2. Plugin opens manual input mode.
3. User enters a place name, coordinates, or map link.
4. Plugin resolves or directly inserts the place.

The fallback flow is required behavior, not an optional error state.

## Durable Image-Place Link

Geo Capture should avoid depending on the image path after a location has been chosen.

Recommended insertion pattern:

```md
![[IMG_1234.HEIC]]

> [!location] [Place name](https://maps.example/...)
> Address
> `25.033, 121.565`
```

Optional hidden metadata can be added later:

```md
%% geo-capture
source-image: IMG_1234.HEIC
source-coordinates: 25.033,121.565
selected-place: Place name
confidence: gps-derived
%%
```

## Integration Levels

### Level 1: Loose Integration

Geo Capture scans the current note for local images and reads EXIF GPS when available.

No Cloudflare Media Sync API is required.

### Level 2: Command Awareness

Geo Capture detects whether Cloudflare Media Sync is installed and can offer a command sequence:

- Insert place from image.
- Then run current-note media sync.

### Level 3: Event Integration

Cloudflare Media Sync may expose events in the future, such as:

- Image discovered.
- Image uploaded.
- Markdown link rewritten.

Geo Capture can use those events to suggest location annotation at the right moment.

## Constraints

- Many images will not contain GPS metadata.
- Remote image URLs usually cannot be trusted as EXIF sources.
- Local image cleanup can remove the original EXIF source.
- HEIC support may require additional parsing work.
- Google Places requires an API key and can incur cost.

## Product Decision

Photo-based place suggestion should be a v2 workflow. The MVP should prepare for it through the candidate model, manual fallback, and Markdown-first insertion format.
