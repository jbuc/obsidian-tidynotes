import { App, PluginSettingTab, Setting, Modal, MarkdownRenderer, Component } from 'obsidian';
import TidyNotesPlugin from './main';
import { RulesetModal } from './ui/RulesetModal';
import { Ruleset } from './types';

export class TidyNotesSettingTab extends PluginSettingTab {
    plugin: TidyNotesPlugin;

    constructor(app: App, plugin: TidyNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    activeTab: 'rulesets' | 'log' = 'rulesets';

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'TidyNotes Settings' });

        // Tabs
        const tabContainer = containerEl.createDiv({ cls: 'tidynotes-tabs' });
        tabContainer.style.display = 'flex';
        tabContainer.style.marginBottom = '20px';
        tabContainer.style.borderBottom = '1px solid var(--background-modifier-border)';

        const rulesetTab = tabContainer.createDiv({ cls: 'tidynotes-tab' });
        rulesetTab.setText('Rulesets');
        rulesetTab.style.padding = '10px 20px';
        rulesetTab.style.cursor = 'pointer';
        rulesetTab.style.fontWeight = this.activeTab === 'rulesets' ? 'bold' : 'normal';
        rulesetTab.style.borderBottom = this.activeTab === 'rulesets' ? '2px solid var(--interactive-accent)' : 'none';
        rulesetTab.onclick = () => {
            this.activeTab = 'rulesets';
            this.display();
        };

        const logTab = tabContainer.createDiv({ cls: 'tidynotes-tab' });
        logTab.setText('Activity Log');
        logTab.style.padding = '10px 20px';
        logTab.style.cursor = 'pointer';
        logTab.style.fontWeight = this.activeTab === 'log' ? 'bold' : 'normal';
        logTab.style.borderBottom = this.activeTab === 'log' ? '2px solid var(--interactive-accent)' : 'none';
        logTab.onclick = () => {
            this.activeTab = 'log';
            this.display();
        };

        if (this.activeTab === 'rulesets') {
            this.displayRulesets(containerEl);
        } else {
            this.displayLog(containerEl);
        }
    }

    displayRulesets(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Manage Rulesets')
            .setDesc('View and edit your rulesets')
            .addButton(button => button
                .setButtonText('Add Ruleset')
                .onClick(async () => {
                    const newRuleset: any = {
                        id: Date.now().toString(),
                        name: 'New Ruleset',
                        enabled: true,
                        trigger: { type: 'manual', options: {} },
                        rules: []
                    };
                    new RulesetModal(this.app, newRuleset, async (ruleset) => {
                        this.plugin.settings.rulesets.push(ruleset);
                        await this.plugin.saveSettings();
                        this.display();
                    }).open();
                }));

        this.plugin.settings.rulesets.forEach((ruleset, index) => {
            const setting = new Setting(containerEl)
                .setName(ruleset.name)
                .setDesc(`${ruleset.trigger.type} - ${ruleset.rules.length} rules`)
                .addToggle(toggle => toggle
                    .setValue(ruleset.enabled)
                    .onChange(async (value) => {
                        ruleset.enabled = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setButtonText('Edit')
                    .onClick(() => {
                        new RulesetModal(this.app, ruleset, async (updatedRuleset) => {
                            this.plugin.settings.rulesets[index] = updatedRuleset;
                            await this.plugin.saveSettings();
                            this.display();
                        }).open();
                    }))
                .addButton(button => button
                    .setButtonText('Delete')
                    .setWarning()
                    .onClick(async () => {
                        this.plugin.settings.rulesets.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        });
    }

    displayLog(containerEl: HTMLElement) {
        new Setting(containerEl)
            .setName('Activity Log')
            .setDesc('View recent plugin activity')
            .addButton(btn => btn
                .setButtonText('Clear Log')
                .setWarning()
                .onClick(() => {
                    this.plugin.logger.clear();
                    this.display();
                }));

        const logContainer = containerEl.createDiv({ cls: 'tidynotes-log' });
        logContainer.style.maxHeight = '400px';
        logContainer.style.overflowY = 'auto';
        logContainer.style.padding = '10px';
        logContainer.style.border = '1px solid var(--background-modifier-border)';
        logContainer.style.borderRadius = '5px';
        logContainer.style.backgroundColor = 'var(--background-primary)';
        logContainer.style.fontFamily = 'monospace';
        logContainer.style.fontSize = '11px'; // Smaller font
        logContainer.style.userSelect = 'text'; // Ensure copyable
        logContainer.style.whiteSpace = 'pre-wrap'; // Preserve formatting but wrap if needed

        const logs = this.plugin.logger.getLogs();

        if (logs.length === 0) {
            logContainer.setText('No activity recorded.');
        } else {
            logs.forEach(entry => {
                const entryDiv = logContainer.createDiv();
                entryDiv.style.borderBottom = '1px solid var(--background-modifier-border)';
                entryDiv.style.padding = '2px 0'; // Compact padding
                entryDiv.style.lineHeight = '1.2'; // Compact line height
                entryDiv.style.display = 'flex';
                entryDiv.style.gap = '8px';

                const time = new Date(entry.timestamp).toLocaleTimeString();
                const color = entry.level === 'error' ? 'var(--text-error)' :
                    entry.level === 'warn' ? 'var(--text-warning)' : 'var(--text-normal)';

                entryDiv.createSpan({ text: `[${time}]`, cls: 'log-time' }).style.color = 'var(--text-muted)';
                entryDiv.createSpan({ text: `[${entry.level.toUpperCase()}]`, cls: 'log-level' }).style.color = color;

                const msgSpan = entryDiv.createSpan({ text: entry.message, cls: 'log-message' });
                msgSpan.style.flex = '1';
                msgSpan.style.wordBreak = 'break-all'; // Ensure long paths don't overflow

                if (entry.details) {
                    const detailsSpan = entryDiv.createSpan({ text: JSON.stringify(entry.details), cls: 'log-details' });
                    detailsSpan.style.color = 'var(--text-muted)';
                    detailsSpan.style.marginLeft = '10px';
                }
            });
        }
    }
}
