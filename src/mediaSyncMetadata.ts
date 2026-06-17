import { App, normalizePath } from "obsidian";
import { GeoPoint } from "./types";

const MEDIA_SYNC_METADATA_PATH = "plugins/cloudflare-media-sync/image_metadata.json";

interface MediaSyncMetadataEntry {
  fileName?: string;
  filename?: string;
  name?: string;
  originalPath?: string;
  localPath?: string;
  path?: string;
  sourcePath?: string;
  url?: string;
  r2Url?: string;
  publicUrl?: string;
  remoteUrl?: string;
  markdownUrl?: string;
  key?: string;
  gps?: unknown;
  exifGps?: unknown;
  location?: unknown;
  coordinates?: unknown;
  gpsSummary?: unknown;
}

export interface ImageMetadataMatch {
  point: GeoPoint;
  label: string;
  sourcePath?: string;
}

export interface MediaSyncGpsDiagnostics {
  metadataFound: boolean;
  entriesChecked: number;
  entriesWithGps: number;
  target: string;
  targetFileName: string;
  matchedEntry: boolean;
  matchedEntryHadGps: boolean;
  reason: string;
}

export async function findMediaSyncGps(app: App, imageTarget: string): Promise<ImageMetadataMatch | null> {
  const result = await findMediaSyncGpsWithDiagnostics(app, imageTarget);
  return result.match;
}

export async function findMediaSyncGpsWithDiagnostics(
  app: App,
  imageTarget: string,
): Promise<{ match: ImageMetadataMatch | null; diagnostics: MediaSyncGpsDiagnostics }> {
  const target = cleanTarget(imageTarget);
  const targetFileName = fileNameFromTarget(target);
  const metadata = await readMediaSyncMetadata(app);

  if (!metadata) {
    return {
      match: null,
      diagnostics: {
        metadataFound: false,
        entriesChecked: 0,
        entriesWithGps: 0,
        target,
        targetFileName,
        matchedEntry: false,
        matchedEntryHadGps: false,
        reason: "metadata file not found or unreadable",
      },
    };
  }

  let entriesChecked = 0;
  let entriesWithGps = 0;
  let matchedEntry = false;
  let matchedEntryHadGps = false;

  for (const [key, entry] of metadata) {
    entriesChecked += 1;
    const point = extractPoint(entry);

    if (point) {
      entriesWithGps += 1;
    }

    if (!matchesEntry(key, entry, target, targetFileName)) {
      continue;
    }

    matchedEntry = true;

    if (!point) {
      continue;
    }

    matchedEntryHadGps = true;
    return {
      match: {
        point,
        label: entry.fileName || entry.filename || entry.name || targetFileName || "synced image",
        sourcePath: getEntrySourcePath(entry),
      },
      diagnostics: {
        metadataFound: true,
        entriesChecked,
        entriesWithGps,
        target,
        targetFileName,
        matchedEntry,
        matchedEntryHadGps,
        reason: "matched metadata entry with GPS",
      },
    };
  }

  return {
    match: null,
    diagnostics: {
      metadataFound: true,
      entriesChecked,
      entriesWithGps,
      target,
      targetFileName,
      matchedEntry,
      matchedEntryHadGps,
      reason: matchedEntry ? "matched metadata entry has no GPS" : "no metadata entry matched image target",
    },
  };
}

async function readMediaSyncMetadata(app: App): Promise<Array<[string, MediaSyncMetadataEntry]> | null> {
  try {
    const path = `${app.vault.configDir}/${MEDIA_SYNC_METADATA_PATH}`;
    const raw = await app.vault.adapter.read(path);
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(isRecord).map((entry, index) => [String(index), entry as MediaSyncMetadataEntry]);
    }

    if (isRecord(parsed)) {
      return Object.entries(parsed)
        .filter(([, entry]) => isRecord(entry))
        .map(([key, entry]) => [key, entry as MediaSyncMetadataEntry]);
    }

    return null;
  } catch {
    return null;
  }
}

function matchesEntry(key: string, entry: MediaSyncMetadataEntry, target: string, targetFileName: string): boolean {
  return getEntryCandidates(key, entry).some((candidate) => {
    const cleaned = cleanTarget(candidate);
    const candidateFileName = fileNameFromTarget(cleaned);

    return (
      (!!cleaned && cleaned === target) ||
      (!!cleaned && normalizePath(cleaned) === normalizePath(target)) ||
      (!!candidateFileName && !!targetFileName && candidateFileName === targetFileName)
    );
  });
}

function getEntryCandidates(key: string, entry: MediaSyncMetadataEntry): string[] {
  return [
    key,
    entry.fileName,
    entry.filename,
    entry.name,
    entry.originalPath,
    entry.localPath,
    entry.path,
    entry.sourcePath,
    entry.url,
    entry.r2Url,
    entry.publicUrl,
    entry.remoteUrl,
    entry.markdownUrl,
    entry.key,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function getEntrySourcePath(entry: MediaSyncMetadataEntry): string | undefined {
  return (
    entry.originalPath ||
    entry.localPath ||
    entry.path ||
    entry.sourcePath ||
    entry.url ||
    entry.r2Url ||
    entry.publicUrl ||
    entry.remoteUrl ||
    entry.markdownUrl
  );
}

function extractPoint(entry: MediaSyncMetadataEntry): GeoPoint | null {
  for (const candidate of [entry.gps, entry.exifGps, entry.location, entry.coordinates, entry.gpsSummary]) {
    const point = parsePoint(candidate);
    if (point) {
      return point;
    }
  }

  return null;
}

function parsePoint(value: unknown): GeoPoint | null {
  if (Array.isArray(value) && value.length >= 2) {
    return createPoint(Number(value[0]), Number(value[1]));
  }

  if (typeof value === "string") {
    const match = value.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    return match ? createPoint(Number(match[1]), Number(match[2])) : null;
  }

  if (isRecord(value)) {
    const lat = firstNumber(value, ["lat", "latitude"]);
    const lon = firstNumber(value, ["lon", "lng", "longitude"]);
    return createPoint(lat, lon);
  }

  return null;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" || typeof value === "string") {
      return Number(value);
    }
  }

  return Number.NaN;
}

function createPoint(lat: number, lon: number): GeoPoint | null {
  const point = { lat, lon };
  return isValidPoint(point) ? point : null;
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

function isValidPoint(point: GeoPoint): boolean {
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
