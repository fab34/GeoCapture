import { buildMapsUrl } from "./maps";
import { GeoCaptureSettings, GeoPlace, InsertFormat } from "./types";

export function formatPlace(place: GeoPlace, settings: GeoCaptureSettings, format?: InsertFormat): string {
  const selectedFormat = format ?? settings.defaultFormat;
  const mapsUrl = buildMapsUrl(place, settings.mapsLinkProvider);
  const address = place.address || "Unknown address";
  const lat = trimCoordinate(place.lat);
  const lon = trimCoordinate(place.lon);

  if (selectedFormat === "compact") {
    return `[${place.name}](${mapsUrl}) (${lat}, ${lon})`;
  }

  if (selectedFormat === "table-row") {
    return `| [${place.name}](${mapsUrl}) | ${address} | ${lat}, ${lon} |`;
  }

  if (selectedFormat === "template") {
    return applyTemplate(settings.template, {
      name: place.name,
      address,
      lat,
      lon,
      mapsUrl,
      sourceUrl: place.sourceUrl ?? "",
    });
  }

  return [
    `> [!location] [${place.name}](${mapsUrl})`,
    `> ${address}`,
    `> \`${lat}, ${lon}\``,
  ].join("\n");
}

function trimCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") : "";
}

function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)}/g, (_, key: string) => values[key] ?? "");
}
