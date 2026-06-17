import { App, normalizePath } from "obsidian";
import { GeoPoint } from "./types";

const MEDIA_SYNC_METADATA_PATH = "plugins/cloudflare-media-sync/image_metadata.json";

interface MediaSyncGps extends GeoPoint {
  source?: string;
}

interface MediaSyncMetadataEntry {
  fileName?: string;
  originalPath?: string;
  url?: string;
  gps?: MediaSyncGps;
}

export interface ImageMetadataMatch {
  point: GeoPoint;
  label: string;
  sourcePath?: string;
}

export async function findMediaSyncGps(app: App, imageTarget: string): Promise<ImageMetadataMatch | null> {
  const metadata = await readMediaSyncMetadata(app);
  if (!metadata) {
    return null;
  }

  const target = cleanTarget(imageTarget);
  const targetFileName = fileNameFromTarget(target);

  for (const entry of Object.values(metadata)) {
    if (!entry.gps || !isValidPoint(entry.gps)) {
      continue;
    }

    if (matchesEntry(entry, target, targetFileName)) {
      return {
        point: {
          lat: entry.gps.lat,
          lon: entry.gps.lon,
        },
        label: entry.fileName || targetFileName || "synced image",
        sourcePath: entry.originalPath || entry.url,
      };
    }
  }

  return null;
}

async function readMediaSyncMetadata(app: App): Promise<Record<string, MediaSyncMetadataEntry> | null> {
  try {
    const path = `${app.vault.configDir}/${MEDIA_SYNC_METADATA_PATH}`;
    const raw = await app.vault.adapter.read(path);
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? (parsed as Record<string, MediaSyncMetadataEntry>) : null;
  } catch {
    return null;
  }
}

function matchesEntry(entry: MediaSyncMetadataEntry, target: string, targetFileName: string): boolean {
  const entryUrl = cleanTarget(entry.url || "");
  const entryPath = cleanTarget(entry.originalPath || "");
  const entryFileName = fileNameFromTarget(entry.fileName || entryPath);

  return (
    (!!entryUrl && entryUrl === target) ||
    (!!entryPath && normalizePath(entryPath) === normalizePath(target)) ||
    (!!entryFileName && !!targetFileName && entryFileName === targetFileName)
  );
}

function cleanTarget(value: string): string {
  const trimmed = value.trim().replace(/^<|>$/g, "");

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function fileNameFromTarget(value: string): string {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.pathname.split("/").pop() || "";
  } catch {
    return value.split("/").pop() || value;
  }
}

function isValidPoint(point: MediaSyncGps): boolean {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lon >= -180 &&
    point.lon <= 180
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
