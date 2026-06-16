import { App, PluginSettingTab, Setting } from "obsidian";
import GeoCapturePlugin from "./main";
import { GeoCaptureSettings, InsertFormat, MapsLinkProvider, PlaceProviderKind } from "./types";

export const DEFAULT_SETTINGS: GeoCaptureSettings = {
  defaultFormat: "callout",
  mapsLinkProvider: "google",
  placeProvider: "nominatim",
  googlePlacesApiKey: "",
  nearbyRadiusMeters: 500,
  template:
    "- [{name}]({mapsUrl})\n  - Coordinates: `{lat}, {lon}`\n  - Address: {address}",
  searchLanguage: "zh-TW",
};

export class GeoCaptureSettingTab extends PluginSettingTab {
  plugin: GeoCapturePlugin;

  constructor(app: App, plugin: GeoCapturePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Geo Capture" });

    new Setting(containerEl)
      .setName("Place search provider")
      .setDesc("Nominatim is free. Google Places enables nearby place capture when an API key is configured.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            nominatim: "OpenStreetMap Nominatim",
            google: "Google Places",
          })
          .setValue(this.plugin.settings.placeProvider)
          .onChange(async (value) => {
            this.plugin.settings.placeProvider = value as PlaceProviderKind;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Google Places API key")
      .setDesc("Required only when using Google Places. Enable Places API (New) in Google Cloud.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("AIza...")
          .setValue(this.plugin.settings.googlePlacesApiKey)
          .onChange(async (value) => {
            this.plugin.settings.googlePlacesApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Nearby search radius")
      .setDesc("Radius in meters for current-location place suggestions.")
      .addSlider((slider) =>
        slider
          .setLimits(100, 2000, 100)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.nearbyRadiusMeters)
          .onChange(async (value) => {
            this.plugin.settings.nearbyRadiusMeters = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Default insert format")
      .setDesc("Choose the Markdown shape used by capture commands.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            compact: "Compact line",
            callout: "Callout",
            "table-row": "Table row",
            template: "Custom template",
          })
          .setValue(this.plugin.settings.defaultFormat)
          .onChange(async (value) => {
            this.plugin.settings.defaultFormat = value as InsertFormat;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Maps link provider")
      .setDesc("Used for generated map links in inserted snippets.")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            google: "Google Maps",
            apple: "Apple Maps",
            openstreetmap: "OpenStreetMap",
          })
          .setValue(this.plugin.settings.mapsLinkProvider)
          .onChange(async (value) => {
            this.plugin.settings.mapsLinkProvider = value as MapsLinkProvider;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Search language")
      .setDesc("Preferred language sent to the search provider.")
      .addText((text) =>
        text
          .setPlaceholder("zh-TW")
          .setValue(this.plugin.settings.searchLanguage)
          .onChange(async (value) => {
            this.plugin.settings.searchLanguage = value.trim() || "zh-TW";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Custom template")
      .setDesc("Available tokens: {name}, {address}, {lat}, {lon}, {mapsUrl}, {sourceUrl}.")
      .addTextArea((text) => {
        text.inputEl.rows = 5;
        text
          .setValue(this.plugin.settings.template)
          .onChange(async (value) => {
            this.plugin.settings.template = value;
            await this.plugin.saveSettings();
          });
      });
  }
}
