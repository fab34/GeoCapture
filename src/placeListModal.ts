import { App, SuggestModal } from "obsidian";
import { GeoPlace } from "./types";

export class PlaceListModal extends SuggestModal<GeoPlace> {
  private places: GeoPlace[];
  private onChoose: (place: GeoPlace) => void;

  constructor(app: App, places: GeoPlace[], onChoose: (place: GeoPlace) => void) {
    super(app);
    this.places = places;
    this.onChoose = onChoose;
    this.setPlaceholder("Choose a nearby place...");
  }

  getSuggestions(query: string): GeoPlace[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return this.places;
    }

    return this.places.filter((place) =>
      [place.name, place.address].some((value) => value?.toLowerCase().includes(trimmed)),
    );
  }

  renderSuggestion(place: GeoPlace, el: HTMLElement): void {
    el.createEl("div", { text: place.name });
    el.createEl("div", {
      text: formatSubtitle(place),
      cls: "geo-capture-place-subtitle",
    });
  }

  onChooseSuggestion(place: GeoPlace): void {
    this.onChoose(place);
  }
}

export function formatSubtitle(place: GeoPlace): string {
  const parts = [];

  if (place.address) {
    parts.push(place.address);
  }

  if (typeof place.distanceMeters === "number") {
    parts.push(`${place.distanceMeters}m`);
  }

  if (place.confidence) {
    parts.push(place.confidence);
  }

  return parts.join(" · ") || `${place.lat}, ${place.lon}`;
}
