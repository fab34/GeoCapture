import { GeoPlace } from "./types";

const COORDINATE_PAIR = /(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/;

export async function readPlaceFromClipboard(): Promise<GeoPlace | null> {
  const text = await navigator.clipboard.readText();
  if (!text.trim()) {
    return null;
  }

  return parseMapText(text);
}

export function parseMapText(text: string): GeoPlace | null {
  const parsed = parseUrl(text);
  if (!parsed) {
    return parseCoordinateText(text);
  }

  return (
    parseGeoUri(parsed) ??
    parseGoogleUrl(parsed) ??
    parseAppleUrl(parsed) ??
    parseOpenStreetMapUrl(parsed) ??
    parseCoordinateText(decodeURIComponent(parsed.toString()))
  );
}

function parseUrl(text: string): URL | null {
  try {
    return new URL(text.trim());
  } catch {
    return null;
  }
}

function parseGeoUri(url: URL): GeoPlace | null {
  if (url.protocol !== "geo:") {
    return null;
  }

  const match = url.pathname.match(COORDINATE_PAIR);
  return match ? placeFromMatch(match, "Geo URI") : null;
}

function parseGoogleUrl(url: URL): GeoPlace | null {
  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    return placeFromMatch(atMatch, "Google Maps link");
  }

  const query = url.searchParams.get("query") || url.searchParams.get("q") || "";
  const queryMatch = query.match(COORDINATE_PAIR);
  return queryMatch ? placeFromMatch(queryMatch, "Google Maps link") : null;
}

function parseAppleUrl(url: URL): GeoPlace | null {
  const ll = url.searchParams.get("ll");
  const match = ll?.match(COORDINATE_PAIR);
  if (match) {
    return placeFromMatch(match, url.searchParams.get("q") || "Apple Maps link");
  }

  return null;
}

function parseOpenStreetMapUrl(url: URL): GeoPlace | null {
  const mlat = url.searchParams.get("mlat");
  const mlon = url.searchParams.get("mlon");
  if (mlat && mlon) {
    return createClipboardPlace(Number(mlat), Number(mlon), "OpenStreetMap link");
  }

  const hashMatch = url.hash.match(/map=\d+\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/);
  return hashMatch ? placeFromMatch(hashMatch, "OpenStreetMap link") : null;
}

function parseCoordinateText(text: string): GeoPlace | null {
  const match = text.match(COORDINATE_PAIR);
  return match ? placeFromMatch(match, "Clipboard coordinates") : null;
}

function placeFromMatch(match: RegExpMatchArray, name: string): GeoPlace | null {
  return createClipboardPlace(Number(match[1]), Number(match[2]), name);
}

function createClipboardPlace(lat: number, lon: number, name: string): GeoPlace | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  return {
    name,
    lat,
    lon,
    source: "clipboard",
  };
}
