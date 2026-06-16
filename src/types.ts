export type InsertFormat = "compact" | "callout" | "table-row" | "template";

export type MapsLinkProvider = "google" | "apple" | "openstreetmap";

export type LocationConfidence =
  | "gps-derived"
  | "search-selected"
  | "manual-coordinate"
  | "manual-text"
  | "map-link";

export interface GeoCaptureSettings {
  defaultFormat: InsertFormat;
  mapsLinkProvider: MapsLinkProvider;
  template: string;
  searchLanguage: string;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface GeoPlace extends GeoPoint {
  name: string;
  address?: string;
  source?: string;
  sourceUrl?: string;
  confidence?: LocationConfidence;
}

export interface SearchProvider {
  search(query: string, language: string): Promise<GeoPlace[]>;
}
