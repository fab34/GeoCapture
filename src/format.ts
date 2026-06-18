import { buildMapsUrl } from "./maps";
import { createTranslator, translatePlaceSource } from "./i18n";
import { GeoCaptureSettings, GeoPlace, InsertFormat } from "./types";

export function formatPlace(place: GeoPlace, settings: GeoCaptureSettings, format?: InsertFormat): string {
  const t = createTranslator(settings.uiLanguage);
  const selectedFormat = format ?? settings.defaultFormat;
  const mapsUrl = buildMapsUrl(place, settings.mapsLinkProvider);
  const address = place.address || t("unknownAddress");
  const lat = trimCoordinate(place.lat);
  const lon = trimCoordinate(place.lon);
  const sourceLabel = getSourceLabel(place, t);

  if (selectedFormat === "compact") {
    return `[${place.name}](${mapsUrl}) (${lat}, ${lon}) · ${sourceLabel}`;
  }

  if (selectedFormat === "table-row") {
    return `| [${place.name}](${mapsUrl}) | ${address} | ${lat}, ${lon} | ${sourceLabel} |`;
  }

  if (selectedFormat === "travel-note") {
    return [
      `- [${place.name}](${mapsUrl})`,
      `  - ${t("fieldAddress")}: ${address}`,
      `  - ${t("fieldCoordinates")}: \`${lat}, ${lon}\``,
      `  - ${t("fieldSource")}: ${sourceLabel}`,
      `  - ${t("fieldNote")}:`,
    ].join("\n");
  }

  if (selectedFormat === "restaurant-note") {
    return [
      `> [!restaurant] [${place.name}](${mapsUrl})`,
      `> ${t("fieldAddress")}: ${address}`,
      `> ${t("fieldCoordinates")}: \`${lat}, ${lon}\``,
      `> ${t("fieldSource")}: ${sourceLabel}`,
      `> ${t("fieldDishes")}:`,
      `> ${t("fieldImpression")}:`,
    ].join("\n");
  }

  if (selectedFormat === "photo-caption") {
    return [
      `[${place.name}](${mapsUrl})`,
      `${address}`,
      `\`${lat}, ${lon}\` · ${sourceLabel}`,
    ].join("\n");
  }

  if (selectedFormat === "template") {
    return applyTemplate(settings.template, {
      name: place.name,
      address,
      lat,
      lon,
      mapsUrl,
      sourceUrl: place.sourceUrl ?? "",
      source: sourceLabel,
    });
  }

  return [
    `> [!location] [${place.name}](${mapsUrl})`,
    `> ${address}`,
    `> \`${lat}, ${lon}\``,
    `> ${sourceLabel}`,
  ].join("\n");
}

function trimCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "") : "";
}

function applyTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)}/g, (_, key: string) => values[key] ?? "");
}

function getSourceLabel(place: GeoPlace, t: ReturnType<typeof createTranslator>): string {
  return place.source ? translatePlaceSource(t, place.source) : place.confidence ? t("sourceGps") : t("sourceManual");
}
