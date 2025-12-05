import { App, PluginSettingTab, Setting, Modal, MarkdownRenderer, Component, setIcon } from 'obsidian';
import TidyNotesPlugin from './main';
import { RulesetEditor } from './ui/RulesetEditor';
import { Ruleset } from './types';
import { addQueryInput } from './ui/QueryInput';

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
        containerEl.createEl('h3', { text: 'Global Settings' });

        const excludedQuerySetting = new Setting(containerEl)
            .setName('Excluded Notes Query')
            .setDesc('Dataview query to exclude notes from all rules and triggers.');

        addQueryInput(
            excludedQuerySetting,
            this.plugin,
            this.plugin.settings.excludedQuery || '',
            async (value) => {
                this.plugin.settings.excludedQuery = value;
                await this.plugin.saveSettings();
            },
            'e.g. #exclude',
            false // Do not filter exclusions for the exclusion query itself
        );

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
                    this.plugin.settings.rulesets.push(newRuleset);
                    await this.plugin.saveSettings();
                    this.display();
                }));

        const rulesetsContainer = containerEl.createDiv({ cls: 'tidynotes-rulesets-list' });

        this.plugin.settings.rulesets.forEach((ruleset, index) => {
            const rulesetDiv = rulesetsContainer.createDiv({ cls: 'tidynotes-ruleset-container' });

            // Header
            const header = new Setting(rulesetDiv);
            header.setClass('tidynotes-ruleset-header');

            // Collapse Button
            const collapseBtn = header.controlEl.createEl('div', { cls: 'tidynotes-collapse-btn' });
            // Default to collapsed unless it's a new ruleset (maybe?) or persist state?
            // For now, default collapsed.
            setIcon(collapseBtn, 'chevron-right');

            const editorContainer = rulesetDiv.createDiv({ cls: 'tidynotes-ruleset-editor' });
            editorContainer.style.display = 'none'; // Hidden by default

            collapseBtn.onclick = () => {
                const isCollapsed = editorContainer.style.display === 'none';
                if (isCollapsed) {
                    editorContainer.style.display = 'block';
                    setIcon(collapseBtn, 'chevron-down');
                    // Render editor only when expanded to save resources? Or just toggle visibility.
                    // Let's render immediately but hide.
                } else {
                    editorContainer.style.display = 'none';
                    setIcon(collapseBtn, 'chevron-right');
                }
            };
            header.controlEl.prepend(collapseBtn);

            // Enabled Toggle
            header.addToggle(toggle => toggle
                .setValue(ruleset.enabled)
                .setTooltip('Enable/Disable Ruleset')
                .onChange(async (value) => {
                    ruleset.enabled = value;
                    await this.plugin.saveSettings();
                }));

            // Name (Inline Editable)
            header.addText(text => {
                text.setValue(ruleset.name)
                    .setPlaceholder('Ruleset Name')
                    .onChange(async (value) => {
                        ruleset.name = value;
                        await this.plugin.saveSettings();
                        // TODO: Validate unique name here too?
                    });
                text.inputEl.addClass('tidynotes-editable-name');
                text.inputEl.style.fontSize = '1.1em';
            });

            // Reorder Buttons
            const reorderContainer = header.controlEl.createDiv({ cls: 'tidynotes-reorder-btns' });

            const upBtn = reorderContainer.createEl('button', { cls: 'clickable-icon' });
            setIcon(upBtn, 'arrow-up');
            upBtn.onclick = async () => {
                if (index > 0) {
                    const temp = this.plugin.settings.rulesets[index];
                    this.plugin.settings.rulesets[index] = this.plugin.settings.rulesets[index - 1];
                    this.plugin.settings.rulesets[index - 1] = temp;
                    await this.plugin.saveSettings();
                    this.display();
                }
            };
            if (index === 0) upBtn.disabled = true;

            const downBtn = reorderContainer.createEl('button', { cls: 'clickable-icon' });
            setIcon(downBtn, 'arrow-down');
            downBtn.onclick = async () => {
                if (index < this.plugin.settings.rulesets.length - 1) {
                    const temp = this.plugin.settings.rulesets[index];
                    this.plugin.settings.rulesets[index] = this.plugin.settings.rulesets[index + 1];
                    this.plugin.settings.rulesets[index + 1] = temp;
                    await this.plugin.saveSettings();
                    this.display();
                }
            };
            if (index === this.plugin.settings.rulesets.length - 1) downBtn.disabled = true;

            reorderContainer.style.marginLeft = 'auto';

            // Delete Button
            header.addButton(btn => btn
                .setIcon('trash')
                .setWarning()
                .setTooltip('Delete Ruleset')
                .onClick(async () => {
                    if (confirm(`Are you sure you want to delete ruleset "${ruleset.name}"?`)) {
                        this.plugin.settings.rulesets.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }
                }));

            // Editor Body
            const editor = new RulesetEditor(this.app, this.plugin, ruleset, editorContainer);
            editor.display();
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
