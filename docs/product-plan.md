# Geo Capture Product Plan

## MVP Definition

Geo Capture MVP is a fast insertion plugin for travel journaling in Obsidian.

The first version should answer three moments:

1. I am standing somewhere and want to insert my current location.
2. I know the place name and want to search it quickly.
3. I copied a map link and want Obsidian to turn it into clean Markdown.

The MVP should not try to replace Map View. It should be closer to a capture command palette for locations.

## MVP Commands

- Insert current location
- Search place and insert
- Insert location from clipboard

## Insert Formats

### Compact

Useful inside running travel notes.

```md
[Place name](https://maps.example/...) (25.033, 121.565)
```

### Callout

Useful for visual separation in travel journals.

```md
> [!location] [Place name](https://maps.example/...)
> Address
> `25.033, 121.565`
```

### Table Row

Useful for itinerary and checklist notes.

```md
| [Place name](https://maps.example/...) | Address | 25.033, 121.565 |
```

### Custom Template

Useful for personal travel diary conventions.

Supported tokens:

- `{name}`
- `{address}`
- `{lat}`
- `{lon}`
- `{mapsUrl}`
- `{sourceUrl}`

## Provider Strategy

### Phase 1

- Device geolocation through `navigator.geolocation`
- OpenStreetMap Nominatim for place search
- Local parsing for common map URLs and raw coordinates

### Phase 2

- Reverse geocoding for current location
- Google Places provider as an optional API-key feature
- Better short-link expansion for copied map URLs

### Phase 3

- Apple Maps-specific import improvements
- Map View-compatible output option
- Recent places cache

## UX Direction

Geo Capture should favor commands, modals, and predictable Markdown over a large map canvas.

Design priorities:

- Command palette first
- Keyboard-friendly search
- Minimal settings
- One insertion action per workflow
- Markdown-first output that remains useful without the plugin installed

## Future Integration Points

- Daily note insertion
- Trip template variables
- Photo capture adjacency with media-sync plugins
- Itinerary tables
- Place categories such as restaurant, cafe, hotel, station, attraction, viewpoint
