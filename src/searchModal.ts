import { App, Notice, SuggestModal } from "obsidian";
import { parseMapText } from "./clipboard";
import { formatSubtitle } from "./placeListModal";
import { Translator } from "./i18n";
import { GeoPlace, SearchProvider } from "./types";

export class PlaceSearchModal extends SuggestModal<GeoPlace> {
  private provider: SearchProvider;
  private language: string;
  private onChoose: (place: GeoPlace) => void;
  private t: Translator;
  private lastQuery = "";
  private places: GeoPlace[] = [];

  constructor(
    app: App,
    provider: SearchProvider,
    language: string,
    t: Translator,
    onChoose: (place: GeoPlace) => void,
  ) {
    super(app);
    this.provider = provider;
    this.language = language;
    this.t = t;
    this.onChoose = onChoose;
    this.setPlaceholder(t("placeholderQuickInsert"));
  }

  async getSuggestions(query: string): Promise<GeoPlace[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    if (trimmed === this.lastQuery) {
      return this.places;
    }

    this.lastQuery = trimmed;

    try {
      const parsedPlace = parseMapText(trimmed);
      const searchResults = parsedPlace ? [] : await this.provider.search(trimmed, this.language);
      this.places = parsedPlace ? [parsedPlace] : searchResults;
      return this.places;
    } catch (error) {
      console.error(error);
      new Notice(this.t("noticePlaceSearchFailed"));
      return [];
    }
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
