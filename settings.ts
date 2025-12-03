import { App, PluginSettingTab, Setting, Modal } from 'obsidian';
import TidyNotesPlugin from './main';
import { RulesetModal } from './ui/RulesetModal';
import { Ruleset } from './types';

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
                    const newRuleset: Ruleset = {
                        id: Date.now().toString(),
                        name: 'New Ruleset',
                        enabled: true,
                        trigger: { type: 'manual' },
                        rules: []
                    };
                    new RulesetModal(this.app, newRuleset, async (savedRuleset) => {
                        this.plugin.settings.rulesets.push(savedRuleset);
                        await this.plugin.saveSettings();
                        this.display();
                    }).open();
                }));

        containerEl.createEl('h3', { text: 'Existing Rulesets' });

        if (this.plugin.settings.rulesets.length === 0) {
            containerEl.createEl('p', { text: 'No rulesets defined.' });
        } else {
            this.plugin.settings.rulesets.forEach((ruleset, index) => {
                const setting = new Setting(containerEl)
                    .setName(ruleset.name)
                    .setDesc(`Trigger: ${ruleset.trigger.type} `)
                    .addToggle(toggle => toggle
                        .setValue(ruleset.enabled)
                        .onChange(async (value) => {
                            ruleset.enabled = value;
                            await this.plugin.saveSettings();
                        }))
                    .addButton(btn => btn
                        .setButtonText('Edit')
                        .onClick(() => {
                            new RulesetModal(this.app, ruleset, async (savedRuleset) => {
                                this.plugin.settings.rulesets[index] = savedRuleset;
                                await this.plugin.saveSettings();
                                this.display();
                            }).open();
                        }))
                    .addButton(btn => btn
                        .setButtonText('Delete')
                        .setWarning()
                        .onClick(async () => {
                            this.plugin.settings.rulesets.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        }));
            });
        }
    }
}
