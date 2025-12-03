import { Plugin, Notice } from 'obsidian';
import { TidyNotesSettings, DEFAULT_SETTINGS } from './types';
import { TidyNotesSettingTab } from './settings';
import { TidyNotesCore } from './core';

export default class TidyNotesPlugin extends Plugin {
    settings: TidyNotesSettings;
    core: TidyNotesCore;

    async onload() {
        console.log('Loading TidyNotes plugin');
        await this.loadSettings();

        this.core = new TidyNotesCore(this.app);

        this.addSettingTab(new TidyNotesSettingTab(this.app, this));

        this.addRibbonIcon('broom', 'TidyNotes Run', () => {
            new Notice('Running TidyNotes Manual Rulesets...');
            this.runManualRulesets();
        });

        this.addCommand({
            id: 'run-manual-rulesets',
            name: 'Run Manual Rulesets',
            callback: () => {
                this.runManualRulesets();
            }
        });

        // Register On Load triggers
        this.app.workspace.onLayoutReady(() => {
            this.runOnLoadRulesets();
        });

        // Register Note Changes triggers
        this.registerEvent(this.app.metadataCache.on('changed', async (file) => {
            await this.runNoteChangeRulesets(file, 'changed');
        }));

        // We might want to handle creation too, but 'changed' usually fires after creation + content update
        // For deletion, we might need a different approach as the file is gone, but Dataview might still have it for a moment
        // or we might want to run rules that don't depend on the file content but on the fact it's gone?
        // For now, let's stick to 'changed' as per requirements "match or no longer match".
    }

    async runManualRulesets() {
        for (const ruleset of this.settings.rulesets) {
            if (ruleset.trigger.type === 'manual') {
                await this.core.runRuleset(ruleset);
            }
        }
    }

    async runOnLoadRulesets() {
        // Simple implementation for now, ignoring complex timing options
        for (const ruleset of this.settings.rulesets) {
            if (ruleset.trigger.type === 'on-load') {
                // TODO: Check for timing options (once, delay, etc)
                await this.core.runRuleset(ruleset);
            }
        }
    }

    async runNoteChangeRulesets(file: any, changeType: string) {
        // This can be expensive, so we should debounce or check if the file is relevant
        // For now, simple implementation
        for (const ruleset of this.settings.rulesets) {
            if (ruleset.trigger.type === 'note-change') {
                // TODO: Check for specific options (on change to/from)
                // We pass the file to runRuleset to optimize? 
                // Currently runRuleset runs queries globally. 
                // Optimization: Only run if the file matches the scope?
                // But scope is a query.

                // For now, just run the ruleset.
                await this.core.runRuleset(ruleset);
            }
        }
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
