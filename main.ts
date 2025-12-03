import { Plugin } from 'obsidian';
import { TidyNotesSettings, DEFAULT_SETTINGS } from './types';
import { TidyNotesSettingTab } from './settings';

export default class TidyNotesPlugin extends Plugin {
    settings: TidyNotesSettings;

    async onload() {
        console.log('Loading TidyNotes plugin');
        await this.loadSettings();

        this.addSettingTab(new TidyNotesSettingTab(this.app, this));

        this.addRibbonIcon('broom', 'TidyNotes Run', () => {
            console.log('TidyNotes manual run clicked');
        });
    }

    async onunload() {
        console.log('Unloading TidyNotes plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
