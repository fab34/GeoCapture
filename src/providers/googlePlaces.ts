import { requestUrl } from "obsidian";
import { distanceMeters } from "../geo";
import { GeoPlace, GeoPoint, NearbySearchProvider, SearchProvider } from "../types";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.googleMapsUri",
  "places.types",
].join(",");

interface GooglePlacesResponse {
  places?: GooglePlace[];
  error?: {
    message?: string;
    status?: string;
  };
}

interface GooglePlace {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  googleMapsUri?: string;
  types?: string[];
}

export class GooglePlacesProvider implements SearchProvider, NearbySearchProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, language: string): Promise<GeoPlace[]> {
    const response = await this.post("https://places.googleapis.com/v1/places:searchText", {
      textQuery: query,
      languageCode: language,
      maxResultCount: 8,
    });

    return this.toPlaces(response, undefined, "search-selected");
  }

  async searchNearby(point: GeoPoint, language: string, radiusMeters: number): Promise<GeoPlace[]> {
    const radius = Math.min(Math.max(radiusMeters, 100), 50_000);
    const response = await this.post("https://places.googleapis.com/v1/places:searchNearby", {
      maxResultCount: 10,
      rankPreference: "DISTANCE",
      languageCode: language,
      locationRestriction: {
        circle: {
          center: {
            latitude: point.lat,
            longitude: point.lon,
          },
          radius,
        },
      },
    });

    return this.toPlaces(response, point, "gps-derived");
  }

  async validateApiKey(language: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!this.apiKey) {
      return { ok: false, reason: "API key is missing." };
    }

    const response = await requestUrl({
      url: "https://places.googleapis.com/v1/places:searchText",
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        textQuery: "Taipei 101",
        languageCode: language,
        maxResultCount: 1,
      }),
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      throw: false,
    });

    if (response.status >= 200 && response.status < 300) {
      return { ok: true };
    }

    const reason = this.describeError(response.status, response.json as GooglePlacesResponse, response.text);
    return { ok: false, reason };
  }

  private async post(url: string, body: unknown): Promise<GooglePlacesResponse> {
    if (!this.apiKey) {
      throw new Error("Google Places API key is missing.");
    }

    const response = await requestUrl({
      url,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify(body),
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      throw: false,
    });

    const bodyJson = response.json as GooglePlacesResponse;

    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.describeError(response.status, bodyJson, response.text));
    }

    if (bodyJson.error) {
      throw new Error(this.describeError(response.status, bodyJson, response.text));
    }

    return bodyJson;
  }

  private toPlaces(
    response: GooglePlacesResponse,
    origin: GeoPoint | undefined,
    confidence: GeoPlace["confidence"],
  ): GeoPlace[] {
    return (response.places ?? [])
      .map((place) => this.toPlace(place, origin, confidence))
      .filter((place): place is GeoPlace => place !== null);
  }

  private toPlace(
    place: GooglePlace,
    origin: GeoPoint | undefined,
    confidence: GeoPlace["confidence"],
  ): GeoPlace | null {
    const lat = place.location?.latitude;
    const lon = place.location?.longitude;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }

    const point = { lat: lat as number, lon: lon as number };

    return {
      ...point,
      name: place.displayName?.text || place.formattedAddress || "Google Maps place",
      address: place.formattedAddress,
      source: "google-places",
      sourceUrl: place.googleMapsUri,
      mapsUrl: place.googleMapsUri,
      distanceMeters: origin ? distanceMeters(origin, point) : undefined,
      confidence,
    };
  }

  private describeError(status: number, body: GooglePlacesResponse, text: string): string {
    const statusText = body.error?.status ?? "";
    const message = body.error?.message ?? text;

    if (status === 400 || statusText === "INVALID_ARGUMENT") {
      return "invalid API key or request parameters.";
    }

    if (status === 401 || statusText === "UNAUTHENTICATED") {
      return "authentication failed. Check the API key.";
    }

    if (status === 403 || statusText === "PERMISSION_DENIED") {
      return "permission denied. Check API restrictions, billing, or whether Places API (New) is enabled.";
    }

    if (status === 429 || statusText === "RESOURCE_EXHAUSTED") {
      return "quota exceeded or rate limited.";
    }

    if (status >= 500) {
      return "Google Places service is temporarily unavailable.";
    }

    return message || `request failed with status ${status}.`;
  }
}
