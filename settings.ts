import { App, PluginSettingTab, Setting } from 'obsidian';
import TidyNotesPlugin from './main';

export class TidyNotesSettingTab extends PluginSettingTab {
    plugin: TidyNotesPlugin;

    constructor(app: App, plugin: TidyNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'TidyNotes Settings' });

        new Setting(containerEl)
            .setName('Manage Rulesets')
            .setDesc('View and edit your rulesets')
            .addButton(button => button
                .setButtonText('Add Ruleset')
                .onClick(async () => {
                    // Placeholder for adding a ruleset
                    console.log('Add ruleset clicked');
                }));

        containerEl.createEl('h3', { text: 'Existing Rulesets' });

        if (this.plugin.settings.rulesets.length === 0) {
            containerEl.createEl('p', { text: 'No rulesets defined.' });
        } else {
            this.plugin.settings.rulesets.forEach(ruleset => {
                new Setting(containerEl)
                    .setName(ruleset.name)
                    .setDesc(`Trigger: ${ruleset.trigger.type}`)
                    .addToggle(toggle => toggle
                        .setValue(ruleset.enabled)
                        .onChange(async (value) => {
                            ruleset.enabled = value;
                            await this.plugin.saveSettings();
                        }));
            });
        }
    }
}
