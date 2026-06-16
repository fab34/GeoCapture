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
          radius: radiusMeters,
        },
      },
    });

    return this.toPlaces(response, point, "gps-derived");
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
    });

    return response.json as GooglePlacesResponse;
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
}
