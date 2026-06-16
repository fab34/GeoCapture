import { Notice } from "obsidian";
import { GeoPlace } from "./types";

interface CurrentPositionLabels {
  currentLocation: string;
  gpsAccuracy: (meters: number) => string;
  retryingCurrentLocation?: string;
}

export class CurrentLocationError extends Error {
  code: "permission-denied" | "unavailable" | "timeout" | "unsupported";

  constructor(code: CurrentLocationError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function getCurrentPosition(labels?: CurrentPositionLabels): Promise<GeoPlace> {
  if (!navigator.geolocation) {
    return Promise.reject(new CurrentLocationError("unsupported", "Geolocation is not available in this environment."));
  }

  try {
    return await requestPosition(labels, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 15_000,
    });
  } catch (error) {
    if (!(error instanceof CurrentLocationError) || error.code !== "timeout") {
      throw error;
    }

    if (labels?.retryingCurrentLocation) {
      new Notice(labels.retryingCurrentLocation);
    }

    return requestPosition(labels, {
      enableHighAccuracy: false,
      maximumAge: 300_000,
      timeout: 10_000,
    });
  }
}

function requestPosition(labels: CurrentPositionLabels | undefined, options: PositionOptions): Promise<GeoPlace> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          name: labels?.currentLocation ?? "Current location",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          address: position.coords.accuracy
            ? labels?.gpsAccuracy(Math.round(position.coords.accuracy)) ??
              `GPS accuracy around ${Math.round(position.coords.accuracy)}m`
            : undefined,
          source: "device",
          confidence: "gps-derived",
        });
      },
      (error) => reject(toCurrentLocationError(error)),
      options,
    );
  });
}

function toCurrentLocationError(error: GeolocationPositionError): CurrentLocationError {
  if (error.code === error.PERMISSION_DENIED) {
    return new CurrentLocationError("permission-denied", error.message || "Location permission denied.");
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return new CurrentLocationError("unavailable", error.message || "Current location unavailable.");
  }

  if (error.code === error.TIMEOUT) {
    return new CurrentLocationError("timeout", error.message || "Location request timed out.");
  }

  return new CurrentLocationError("unavailable", error.message || "Unable to get current location.");
}
