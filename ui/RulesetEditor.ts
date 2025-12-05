import { App, Setting, Notice, setIcon, TFile } from 'obsidian';
import { Ruleset, TriggerType } from '../types';
import { addQueryInput } from './QueryInput';
import TidyNotesPlugin from '../main';

export class RulesetEditor {
    app: App;
    plugin: TidyNotesPlugin;
    ruleset: Ruleset;
    containerEl: HTMLElement;
    private isEditingRules: boolean = false;

    constructor(app: App, plugin: TidyNotesPlugin, ruleset: Ruleset, containerEl: HTMLElement) {
        this.app = app;
        this.plugin = plugin;
        this.ruleset = ruleset;
        this.containerEl = containerEl;
    }

    display() {
        this.containerEl.empty();

        const contentEl = this.containerEl;

        // Trigger Type
        new Setting(contentEl)
            .setName('Trigger Type')
            .setDesc('When should this ruleset run?')
            .addDropdown(dropdown => dropdown
                .addOption('on-load', 'On Load')
                .addOption('note-change', 'Note Change')
                .addOption('manual', 'Manual')
                .setValue(this.ruleset.trigger.type)
                .onChange(async (value) => {
                    this.ruleset.trigger.type = value as TriggerType;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        if (this.ruleset.trigger.type === 'manual') {
            new Setting(contentEl)
                .setName('Manual Trigger')
                .setDesc('This ruleset will be available as a command: "TidyNotes: Run [Name]"');
        } else if (this.ruleset.trigger.type === 'note-change') {
            new Setting(contentEl)
                .setName('Match Type')
                .setDesc('When to run: "To" (starts matching), "From" (stops matching), or "Both"')
                .addDropdown(dropdown => dropdown
                    .addOption('to', 'To (Starts Matching)')
                    .addOption('from', 'From (Stops Matching)')
                    .addOption('both', 'Both')
                    .setValue(this.ruleset.trigger.options?.matchType || 'to')
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, matchType: value as 'to' | 'from' | 'both' };
                        await this.plugin.saveSettings();
                    }));

            const triggerQuerySetting = new Setting(contentEl)
                .setName('Trigger Query')
                .setDesc('Dataview query to check against (e.g. FROM "Inbox")');

            addQueryInput(
                triggerQuerySetting,
                this.plugin,
                this.ruleset.trigger.options?.query || '',
                async (value) => {
                    this.ruleset.trigger.options = { ...this.ruleset.trigger.options, query: value };
                    await this.plugin.saveSettings();
                }
            );

            new Setting(contentEl)
                .setName('Delay (seconds)')
                .setDesc('Wait time after change before running')
                .addText(text => text
                    .setValue((this.ruleset.trigger.options?.delay || 0).toString())
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, delay: parseInt(value) || 0 };
                        await this.plugin.saveSettings();
                    }));
        } else if (this.ruleset.trigger.type === 'on-load') {
            new Setting(contentEl)
                .setName('Frequency')
                .setDesc('How often should this ruleset run?')
                .addDropdown(dropdown => dropdown
                    .addOption('every', 'Every Startup')
                    .addOption('once-every', 'Once Every...')
                    .setValue(this.ruleset.trigger.options?.frequency || 'every')
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, frequency: value as 'every' | 'once-every' };
                        await this.plugin.saveSettings();
                    }));

            new Setting(contentEl)
                .setName('Delay (seconds)')
                .setDesc('Wait time after load before running')
                .addText(text => text
                    .setValue((this.ruleset.trigger.options?.delay || 0).toString())
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, delay: parseInt(value) || 0 };
                        await this.plugin.saveSettings();
                    }));

            contentEl.createEl('h4', { text: 'Schedule (Leave empty for "Any")' });

            new Setting(contentEl)
                .setName('Days of Week')
                .setDesc('Comma separated 1-7 (Mon-Sun)')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.daysOfWeek || '')
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, daysOfWeek: value };
                        await this.plugin.saveSettings();
                    }));

            new Setting(contentEl)
                .setName('Hours of Day')
                .setDesc('Comma separated ranges 0-24 (e.g. 9-17)')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.hoursOfDay || '')
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, hoursOfDay: value };
                        await this.plugin.saveSettings();
                    }));

            new Setting(contentEl)
                .setName('Weeks of Month')
                .setDesc('Comma separated 1-4')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.weeksOfMonth || '')
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, weeksOfMonth: value };
                        await this.plugin.saveSettings();
                    }));

            new Setting(contentEl)
                .setName('Months of Year')
                .setDesc('Comma separated 1-12')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.monthsOfYear || '')
                    .onChange(async (value) => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, monthsOfYear: value };
                        await this.plugin.saveSettings();
                    }));
        }

        // Rules Header "Manage Rules"
        new Setting(contentEl)
            .setName('Manage Rules')
            .setDesc('Add or edit rules')
            .addButton(btn => btn
                .setButtonText(this.isEditingRules ? 'Done' : 'Edit')
                .onClick(() => {
                    this.isEditingRules = !this.isEditingRules;
                    this.display();
                }));

        this.ruleset.rules.forEach((rule, index) => {
            const ruleDiv = contentEl.createDiv({ cls: 'tidynotes-rule-container' });
            ruleDiv.style.border = '1px solid var(--background-modifier-border)';
            ruleDiv.style.padding = '10px';
            ruleDiv.style.marginBottom = '10px';
            ruleDiv.style.borderRadius = '5px';

            // In Edit Mode, force collapse visual style if needed, or just handle content visibility
            if (this.isEditingRules) {
                ruleDiv.addClass('is-collapsed');
            }

            const ruleSetting = new Setting(ruleDiv);
            ruleSetting.setClass('tidynotes-rule-header');

            // 0. Collapse Button (Only if NOT editing)
            if (!this.isEditingRules) {
                const collapseBtn = ruleSetting.controlEl.createEl('div', { cls: 'tidynotes-collapse-btn' });
                if (ruleDiv.hasClass('is-collapsed')) {
                    setIcon(collapseBtn, 'chevron-right');
                } else {
                    setIcon(collapseBtn, 'chevron-down');
                }

                collapseBtn.onclick = () => {
                    ruleDiv.toggleClass('is-collapsed', !ruleDiv.hasClass('is-collapsed'));
                    const contentContainer = ruleDiv.querySelector('.tidynotes-rule-content') as HTMLElement;
                    if (ruleDiv.hasClass('is-collapsed')) {
                        setIcon(collapseBtn, 'chevron-right');
                        if (contentContainer) contentContainer.style.display = 'none';
                    } else {
                        setIcon(collapseBtn, 'chevron-down');
                        if (contentContainer) contentContainer.style.display = 'block';
                    }
                };
                ruleSetting.controlEl.prepend(collapseBtn);
            }

            // 1. Label "Rule X:"
            ruleSetting.controlEl.createSpan({
                text: `Rule ${index + 1}:`,
                cls: 'tidynotes-rule-label'
            });

            // 2. Name Input (Always Editable, Styled)
            ruleSetting.addText(text => {
                text.setValue(rule.name)
                    .setPlaceholder('Rule Name')
                    .onChange(async (value) => {
                        rule.name = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.addClass('tidynotes-editable-name');
            });

            // 3. Edit Mode Controls (Reorder / Delete)
            if (this.isEditingRules) {
                const reorderContainer = ruleSetting.controlEl.createDiv({ cls: 'tidynotes-reorder-btns' });

                const upBtn = reorderContainer.createEl('button', { cls: 'clickable-icon' });
                setIcon(upBtn, 'arrow-up');
                upBtn.onclick = async () => {
                    if (index > 0) {
                        const temp = this.ruleset.rules[index];
                        this.ruleset.rules[index] = this.ruleset.rules[index - 1];
                        this.ruleset.rules[index - 1] = temp;
                        await this.plugin.saveSettings();
                        this.display();
                    }
                };
                if (index === 0) upBtn.disabled = true;

                const downBtn = reorderContainer.createEl('button', { cls: 'clickable-icon' });
                setIcon(downBtn, 'arrow-down');
                downBtn.onclick = async () => {
                    if (index < this.ruleset.rules.length - 1) {
                        const temp = this.ruleset.rules[index];
                        this.ruleset.rules[index] = this.ruleset.rules[index + 1];
                        this.ruleset.rules[index + 1] = temp;
                        await this.plugin.saveSettings();
                        this.display();
                    }
                };
                if (index === this.ruleset.rules.length - 1) downBtn.disabled = true;

                reorderContainer.style.marginLeft = 'auto';

                ruleSetting.addButton(btn => btn
                    .setIcon('trash')
                    .setWarning()
                    .onClick(async () => {
                        if (confirm(`Are you sure you want to delete rule "${rule.name}"?`)) {
                            this.ruleset.rules.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    }));
            }

            // Content Container
            const contentContainer = ruleDiv.createDiv({ cls: 'tidynotes-rule-content' });

            // Allow content to be hidden when collapsed or in edit mode
            if (ruleDiv.hasClass('is-collapsed') || this.isEditingRules) {
                contentContainer.style.display = 'none';
            }

            // --- Scope Setting ---
            const scopeSetting = new Setting(contentContainer)
                .setName('Query Match')
                .setDesc('e.g. FROM "Inbox"');

            // Logic Dropdown / Label
            if (index === 0) {
                if (rule.type !== 'if') {
                    rule.type = 'if';
                }
                const logicLabel = createSpan({
                    text: 'IF',
                    cls: 'tidynotes-logic-label'
                });
                scopeSetting.nameEl.prepend(logicLabel);
            } else {
                scopeSetting.addDropdown(dropdown => dropdown
                    .addOption('if', 'If')
                    .addOption('else-if', 'Else If')
                    .addOption('else', 'Else')
                    .setValue(rule.type || 'else-if')
                    .onChange(async (value) => {
                        rule.type = value as 'if' | 'else-if' | 'else';
                        await this.plugin.saveSettings();
                        this.display();
                    }));

                const dropdownEl = scopeSetting.controlEl.firstElementChild as HTMLElement;
                if (dropdownEl) {
                    scopeSetting.nameEl.prepend(dropdownEl);
                    dropdownEl.addClass('tidynotes-logic-dropdown');
                }
            }

            addQueryInput(
                scopeSetting,
                this.plugin,
                rule.scope,
                async (value) => {
                    rule.scope = value;
                    await this.plugin.saveSettings();
                }
            );

            // --- Actions ---
            const actionsHeader = new Setting(contentContainer)
                .setName('Actions')
                .setHeading();

            actionsHeader.addExtraButton(btn => btn
                .setIcon('plus')
                .setTooltip('Add Action')
                .onClick(async () => {
                    rule.actions.push({ type: 'Move Note', options: {} });
                    await this.plugin.saveSettings();
                    this.display();
                }));

            rule.actions.forEach((action, actionIndex) => {
                const actionDiv = contentContainer.createDiv({ cls: 'tidynotes-action' });
                const actionSetting = new Setting(actionDiv);

                actionSetting.addDropdown(d => d
                    .addOption('Move Note', 'Move Note')
                    .addOption('Update Property', 'Update Property')
                    .setValue(action.type)
                    .onChange(async (val) => {
                        action.type = val as any;
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );

                if (action.type === 'Move Note') {
                    actionSetting.addText(t => t
                        .setPlaceholder('Folder Path')
                        .setValue(action.options?.folder || '')
                        .onChange(async (v) => {
                            action.options = { ...action.options, folder: v };
                            await this.plugin.saveSettings();
                        })
                    );
                } else if (action.type === 'Update Property') {
                    actionSetting.addText(t => t
                        .setPlaceholder('Key')
                        .setValue(action.options?.key || '')
                        .onChange(async (v) => {
                            action.options = { ...action.options, key: v };
                            await this.plugin.saveSettings();
                        })
                    );
                    actionSetting.addText(t => t
                        .setPlaceholder('Value')
                        .setValue(action.options?.value || '')
                        .onChange(async (v) => {
                            action.options = { ...action.options, value: v };
                            await this.plugin.saveSettings();
                        })
                    );
                }

                actionSetting.addExtraButton(b => b
                    .setIcon('trash')
                    .onClick(async () => {
                        rule.actions.splice(actionIndex, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );
            });
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add Rule')
                .setDisabled(this.isEditingRules)
                .onClick(async () => {
                    this.ruleset.rules.push({
                        id: Date.now().toString(),
                        name: 'New Rule',
                        type: 'if',
                        scope: '',
                        actions: []
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }
}
