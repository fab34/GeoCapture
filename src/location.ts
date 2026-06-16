import { GeoPlace } from "./types";

interface CurrentPositionLabels {
  currentLocation: string;
  gpsAccuracy: (meters: number) => string;
}

export function getCurrentPosition(labels?: CurrentPositionLabels): Promise<GeoPlace> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Geolocation is not available in this environment."));
  }

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
      (error) => reject(new Error(error.message || "Unable to get current location.")),
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 15_000,
      },
    );
  });
}
