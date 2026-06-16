import { GeoPlace, MapsLinkProvider } from "./types";

export function buildMapsUrl(place: GeoPlace, provider: MapsLinkProvider): string {
  const lat = encodeURIComponent(String(place.lat));
  const lon = encodeURIComponent(String(place.lon));
  const name = encodeURIComponent(place.name);

  if (provider === "apple") {
    return `https://maps.apple.com/?ll=${lat},${lon}&q=${name}`;
  }

  if (provider === "openstreetmap") {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}
