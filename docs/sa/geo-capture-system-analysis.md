# Geo Capture System Analysis

## Purpose

Geo Capture is an Obsidian plugin for note-first location capture. Its primary goal is to help travel journal writers, place collectors, and trip reviewers insert useful place information into notes with minimal interruption.

The system is not intended to replace a full map workspace. It should make location capture feel natural inside writing.

## Problem Statement

Obsidian users who write travel journals often need to capture restaurants, attractions, hotels, stations, viewpoints, and current locations while they are moving. Existing map plugins tend to be map-first, property-first, or batch-import oriented. They are useful, but they often add too many steps when the user only wants to insert a place into the current note.

Geo Capture should reduce the workflow to:

1. Provide a location clue.
2. Show likely place candidates.
3. Insert a readable Markdown snippet.

## User Scenarios

### Travel Capture

The user is currently at or near a place and wants to record it quickly in a travel note.

Expected behavior:

- The user runs a command from the editor.
- The plugin can use current location when available.
- The plugin lists nearby place candidates.
- The user selects a candidate and inserts it at the cursor.

### Travel Review

The user is back home and wants to reconstruct a trip from memory, notes, coordinates, or copied map links.

Expected behavior:

- The user types a place name, coordinate pair, or map URL.
- The plugin resolves the input into place candidates.
- The user inserts a clean location snippet into the note.

### Photo-Based Annotation

The user has inserted travel photos into an Obsidian note and wants to annotate them with place information.

Expected behavior:

- The plugin reads EXIF GPS data when available.
- The plugin uses coordinates for reverse geocoding and nearby search.
- If no coordinates are available, the plugin switches to manual input.
- The selected place remains in Markdown even if the image is later synced to Cloudflare R2.

## Functional Requirements

- Capture current device coordinates.
- Search by place name.
- Parse coordinate text.
- Parse common map URLs.
- Read photo GPS metadata when the image format and file access allow it.
- Resolve coordinates into nearby place candidates when a provider supports it.
- Insert location data into the active editor.
- Support multiple Markdown output formats.
- Preserve enough metadata to identify whether a place came from GPS, search, map link, or manual input.

## Fallback Requirements

The system must not fail the user's note-taking flow when location metadata is unavailable.

When image EXIF GPS is missing, unreadable, stripped, or inaccessible, the plugin should offer manual input. Manual input must support:

- Place name search.
- Raw coordinates.
- Google Maps, Apple Maps, or OpenStreetMap links.

When provider lookup fails, the user should still be able to insert raw coordinates or plain place text.

## Non-Functional Requirements

- Keep editor workflows fast and keyboard-friendly.
- Prefer Markdown-first output over private plugin storage.
- Make location snippets useful even without the plugin installed.
- Keep provider implementations replaceable.
- Treat Google Places as an optional provider because it requires an API key and may incur cost.
- Avoid assuming every image still has local EXIF metadata after media sync.

## Integration Boundary

Geo Capture and Cloudflare Media Sync should remain separate plugins.

Cloudflare Media Sync owns:

- Image upload.
- Markdown image URL rewriting.
- Optional local image cleanup.

Geo Capture owns:

- Location extraction.
- Place candidate resolution.
- Place selection.
- Markdown insertion.

The integration should happen through editor context, commands, and stable note content rather than direct dependence on private implementation details.

## Suggested Architecture

- `Command layer`: Obsidian commands and modals.
- `Input parser layer`: coordinates, map links, image references, and manual text.
- `Provider layer`: Nominatim, Google Places, reverse geocoding, nearby search.
- `Formatting layer`: Markdown snippets, callouts, table rows, templates, properties.
- `Integration layer`: current note image scanning and optional Cloudflare Media Sync command awareness.

## Decision

Geo Capture should be designed as a location capture assistant for notes, not as a map database. Nearby place search, image-derived suggestions, and manual fallback all support the same core objective: helping the user write useful travel notes faster.
