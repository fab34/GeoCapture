import { App, PluginSettingTab, Setting } from "obsidian";
import { createTranslator } from "./i18n";
import type GeoCapturePlugin from "./main";
import { GooglePlacesProvider } from "./providers/googlePlaces";
import {
  GeoCaptureSettings,
  ImageInsertPosition,
  ImagePromptPosition,
  InsertFormat,
  MapsLinkProvider,
  PlaceProviderKind,
  UiLanguage,
} from "./types";

export const DEFAULT_SETTINGS: GeoCaptureSettings = {
  uiLanguage: "system",
  imageInsertPosition: "cursor",
  enableImageLocationPrompts: true,
  imagePromptPosition: "below-image",
  autoDetectImageExif: true,
  autoDetectMediaSyncMetadata: true,
  defaultFormat: "callout",
  mapsLinkProvider: "google",
  placeProvider: "nominatim",
  googlePlacesApiKey: "",
  nearbyRadiusMeters: 500,
  template:
    "- [{name}]({mapsUrl})\n  - Coordinates: `{lat}, {lon}`\n  - Address: {address}\n  - Source: {source}",
  searchLanguage: "",
  imageGpsCache: {},
};

export class GeoCaptureSettingTab extends PluginSettingTab {
  plugin: GeoCapturePlugin;

  constructor(app: App, plugin: GeoCapturePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const t = createTranslator(this.plugin.settings.uiLanguage);
    containerEl.empty();

    new Setting(containerEl)
      .setName(t("settingUiLanguageName"))
      .setDesc(t("settingUiLanguageDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            system: t("languageSystem"),
            en: t("languageEnglish"),
            "zh-TW": t("languageZhTw"),
            "zh-CN": t("languageZhCn"),
          })
          .setValue(this.plugin.settings.uiLanguage)
          .onChange(async (value) => {
            this.plugin.settings.uiLanguage = value as UiLanguage;
            await this.plugin.saveSettings();
            this.display();
          }),
      );

    new Setting(containerEl)
      .setName(t("settingImageInsertPositionName"))
      .setDesc(t("settingImageInsertPositionDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            cursor: t("imageInsertAtCursor"),
            "below-image": t("imageInsertBelowImage"),
          })
          .setValue(this.plugin.settings.imageInsertPosition)
          .onChange(async (value) => {
            this.plugin.settings.imageInsertPosition = value as ImageInsertPosition;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t("settingEnableImageLocationPromptsName"))
      .setDesc(t("settingEnableImageLocationPromptsDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableImageLocationPrompts).onChange(async (value) => {
          this.plugin.settings.enableImageLocationPrompts = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("settingImagePromptPositionName"))
      .setDesc(t("settingImagePromptPositionDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            "below-image": t("imagePromptBelowImage"),
            inline: t("imagePromptInline"),
          })
          .setValue(this.plugin.settings.imagePromptPosition)
          .onChange(async (value) => {
            this.plugin.settings.imagePromptPosition = value as ImagePromptPosition;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t("settingAutoDetectImageExifName"))
      .setDesc(t("settingAutoDetectImageExifDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoDetectImageExif).onChange(async (value) => {
          this.plugin.settings.autoDetectImageExif = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("settingAutoDetectMediaSyncMetadataName"))
      .setDesc(t("settingAutoDetectMediaSyncMetadataDesc"))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoDetectMediaSyncMetadata).onChange(async (value) => {
          this.plugin.settings.autoDetectMediaSyncMetadata = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t("settingPlaceProviderName"))
      .setDesc(t("settingPlaceProviderDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            nominatim: t("providerNominatim"),
            google: t("providerGoogle"),
          })
          .setValue(this.plugin.settings.placeProvider)
          .onChange(async (value) => {
            this.plugin.settings.placeProvider = value as PlaceProviderKind;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t("settingGoogleApiKeyName"))
      .setDesc(t("settingGoogleApiKeyDesc"))
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("AIza...")
          .setValue(this.plugin.settings.googlePlacesApiKey)
          .onChange(async (value) => {
            this.plugin.settings.googlePlacesApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) => {
        button.setButtonText(t("settingGoogleApiKeyTestButton")).onClick(async () => {
          const apiKey = this.plugin.settings.googlePlacesApiKey.trim();

          if (!apiKey) {
            this.plugin.showNotice("noticeGoogleApiKeyMissing");
            return;
          }

          button.setDisabled(true);
          this.plugin.showNotice("noticeTestingGoogleApiKey");

          try {
            const provider = new GooglePlacesProvider(apiKey);
            const result = await provider.validateApiKey(this.plugin.getSearchLanguage());

            if (result.ok) {
              this.plugin.showNotice("noticeGoogleApiKeyValid");
            } else {
              this.plugin.showNotice("noticeGoogleApiKeyInvalid", { reason: result.reason });
            }
          } catch (error) {
            const reason = error instanceof Error ? error.message : "unknown error.";
            this.plugin.showNotice("noticeGoogleApiKeyInvalid", { reason });
          } finally {
            button.setDisabled(false);
          }
        });
      });

    new Setting(containerEl)
      .setName(t("settingNearbyRadiusName"))
      .setDesc(t("settingNearbyRadiusDesc"))
      .addSlider((slider) =>
        slider
          .setLimits(100, 2000, 100)
          .setValue(this.plugin.settings.nearbyRadiusMeters)
          .onChange(async (value) => {
            this.plugin.settings.nearbyRadiusMeters = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t("settingDefaultFormatName"))
      .setDesc(t("settingDefaultFormatDesc"))
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            compact: t("formatCompact"),
            callout: t("formatCallout"),
            "table-row": t("formatTableRow"),
            "travel-note": t("formatTravelNote"),
            "restaurant-note": t("formatRestaurantNote"),
            "photo-caption": t("formatPhotoCaption"),
            template: t("formatTemplate"),
          })
          .setValue(this.plugin.settings.defaultFormat)
          .onChange(async (value) => {
            this.plugin.settings.defaultFormat = value as InsertFormat;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t("settingMapsLinkProviderName"))
      .setDesc(t("settingMapsLinkProviderDesc"))
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
      .setName(t("settingSearchLanguageName"))
      .setDesc(t("settingSearchLanguageDesc"))
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
      .setName(t("settingCustomTemplateName"))
      .setDesc(t("settingCustomTemplateDesc"))
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
