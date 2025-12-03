import { App, TFile } from 'obsidian';
import TidyNotesPlugin from './main';

interface StateData {
    fileMatches: Record<string, string[]>; // FilePath -> RulesetIDs
}

export class StateManager {
    plugin: TidyNotesPlugin;
    data: StateData;

    constructor(plugin: TidyNotesPlugin) {
        this.plugin = plugin;
        this.data = { fileMatches: {} };
    }

    async load() {
        // We can store this in a separate data file or part of settings.
        // For simplicity and to avoid cluttering settings, let's use a separate file or just settings for now.
        // Using a separate file is cleaner but requires more setup.
        // Let's piggyback on settings for now but keep it in a separate key if possible, 
        // or just manage it here and save to a separate JSON.
        // Actually, `plugin.loadData()` loads `data.json`. We can store it there alongside settings if we merge it,
        // or we can use `app.vault.adapter` to write a separate file.
        // Let's use a separate file `.obsidian/plugins/obsidian-tidynotes/state.json` if possible,
        // or just `data.json` but separate from "settings".
        // Obsidian's `loadData` returns the whole `data.json`.

        // Let's assume we store it in `data.json` under a `state` key if we modify `loadData`?
        // Or simpler: just use a separate file using adapter.

        try {
            const path = `${this.plugin.manifest.dir}/state.json`;
            if (await this.plugin.app.vault.adapter.exists(path)) {
                const content = await this.plugin.app.vault.adapter.read(path);
                this.data = JSON.parse(content);
            }
        } catch (e) {
            console.error("TidyNotes: Failed to load state", e);
            this.data = { fileMatches: {} };
        }
    }

    async save() {
        try {
            const path = `${this.plugin.manifest.dir}/state.json`;
            await this.plugin.app.vault.adapter.write(path, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error("TidyNotes: Failed to save state", e);
        }
    }

    getMatches(file: TFile): string[] {
        return this.data.fileMatches[file.path] || [];
    }

    setMatches(file: TFile, rulesetIds: string[]) {
        this.data.fileMatches[file.path] = rulesetIds;
        // Debounce save?
        this.save();
    }

    // Clean up entries for deleted files?
    // We can do this periodically or on file delete event.
}
