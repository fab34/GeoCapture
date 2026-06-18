import { App, SuggestModal } from "obsidian";
import { translateConfidence, translatePlaceSource, Translator } from "./i18n";
import { GeoPlace } from "./types";

export class PlaceListModal extends SuggestModal<GeoPlace> {
  private places: GeoPlace[];
  private onChoose: (place: GeoPlace) => void;
  private t: Translator;

  constructor(app: App, places: GeoPlace[], t: Translator, onChoose: (place: GeoPlace) => void) {
    super(app);
    this.places = places;
    this.t = t;
    this.onChoose = onChoose;
    this.setPlaceholder(t("placeholderNearbyChoice"));
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
      text: formatSubtitle(place, this.t),
      cls: "geo-capture-place-subtitle",
    });
  }

  onChooseSuggestion(place: GeoPlace): void {
    this.onChoose(place);
  }
}

export function formatSubtitle(place: GeoPlace, t: Translator): string {
  const parts = [];

  if (place.address) {
    parts.push(place.address);
  }

  if (typeof place.distanceMeters === "number") {
    parts.push(`${place.distanceMeters}m`);
  }

  if (place.confidence) {
    parts.push(translateConfidence(t, place.confidence));
  }

  if (place.source) {
    parts.push(translatePlaceSource(t, place.source));
  }

  return parts.join(" · ") || `${place.lat}, ${place.lon}`;
}
