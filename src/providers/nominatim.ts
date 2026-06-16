import { requestUrl } from "obsidian";
import { GeoPlace, SearchProvider } from "../types";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type?: string;
  osm_type?: string;
  osm_id?: number;
}

export class NominatimProvider implements SearchProvider {
  async search(query: string, language: string): Promise<GeoPlace[]> {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("accept-language", language);

    const response = await requestUrl({
      url: url.toString(),
      method: "GET",
      headers: {
        Referer: "app://obsidian.md",
      },
    });

    const results = response.json as NominatimResult[];
    return results
      .map((result) => ({
        name: result.name || firstDisplaySegment(result.display_name),
        address: result.display_name,
        lat: Number(result.lat),
        lon: Number(result.lon),
        source: "nominatim",
        sourceUrl: buildOsmUrl(result),
        confidence: "search-selected" as const,
      }))
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon));
  }
}

function firstDisplaySegment(displayName: string): string {
  return displayName.split(",")[0]?.trim() || displayName;
}

function buildOsmUrl(result: NominatimResult): string | undefined {
  if (!result.osm_type || !result.osm_id) {
    return undefined;
  }

  const type = result.osm_type === "node" ? "node" : result.osm_type === "way" ? "way" : "relation";
  return `https://www.openstreetmap.org/${type}/${result.osm_id}`;
}
