import { Plugin } from "obsidian";
import { ChartRenderer } from "./chartRenderer";
import { pluginApi } from "@vanakat/plugin-api";
import type { SQLSealApi, SQLSealRegisterApi } from "@hypersphere/sqlseal";
import { uniqBy } from "lodash";
import { SQLSealChartsSettings, DEFAULT_SETTINGS } from "./settings";
import { SQLSealChartsSettingTab } from "./settingsTab";

const SQLSEAL_API_KEY = "___sqlSeal";
const SQLSEAL_QUEUED_PLUGINS = "___sqlSeal_queue";

const registerApi = (plugin: Plugin, fn: (api: SQLSealApi) => void) => {
  if (SQLSEAL_API_KEY in window) {
    // SQLSeal already registered
    const api = window[SQLSEAL_API_KEY] as SQLSealApi as any;

    api.registerForPluginNew({ plugin, run: fn });
    return;
  } else {
    // SQLSeal not registered, adding it to the queue
    const data = {
      plugin,
      run: (api: SQLSealApi) => {
        fn(api);
      },
    };
    if (SQLSEAL_QUEUED_PLUGINS in window) {
      if (Array.isArray(window[SQLSEAL_QUEUED_PLUGINS])) {
        window[SQLSEAL_QUEUED_PLUGINS] = uniqBy(
          [...window[SQLSEAL_QUEUED_PLUGINS], data],
          (i) => i.plugin
        );
      } else {
        window[SQLSEAL_QUEUED_PLUGINS] = [data];
      }
    } else {
      (window as any)[SQLSEAL_QUEUED_PLUGINS] = [data];
    }
  }
};

export default class SQLSealCharts extends Plugin {
  settings: SQLSealChartsSettings;

  async onload() {
    await this.loadSettings();
    
    // Add settings tab
    this.addSettingTab(new SQLSealChartsSettingTab(this.app, this));
    
    registerApi(this, (api) => this.sqlSealRegistered(api));
  }

  sqlSealRegistered(api: SQLSealApi) {
    api.registerView("sqlseal-charts", new ChartRenderer(this.app, this.settings));
    if ((api as any).apiVersion >= 2) {
      api.registerFlag({ key: "isAdvancedMode", name: "ADVANCED MODE" });
    }
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
