import { App, Modal, Setting, Notice } from 'obsidian';
import { Ruleset, TriggerType } from '../types';

export class RulesetModal extends Modal {
    ruleset: Ruleset;
    onSubmit: (ruleset: Ruleset) => void;

    constructor(app: App, ruleset: Ruleset, onSubmit: (ruleset: Ruleset) => void) {
        super(app);
        this.ruleset = ruleset;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Edit Ruleset' });

        new Setting(contentEl)
            .setName('Name')
            .setDesc('Name of the ruleset')
            .addText(text => text
                .setValue(this.ruleset.name)
                .onChange(value => {
                    this.ruleset.name = value;
                }));

        new Setting(contentEl)
            .setName('Trigger Type')
            .setDesc('When should this ruleset run?')
            .addDropdown(dropdown => dropdown
                .addOption('on-load', 'On Load')
                .addOption('note-change', 'Note Change')
                .addOption('manual', 'Manual')
                .setValue(this.ruleset.trigger.type)
                .onChange(value => {
                    this.ruleset.trigger.type = value as TriggerType;
                    this.display(); // Refresh to show trigger specific options
                }));

        if (this.ruleset.trigger.type === 'manual') {
            new Setting(contentEl)
                .setName('Command Name')
                .setDesc('Custom command name to run this ruleset (requires reload)')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.commandName || '')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, commandName: value };
                    }));
        } else if (this.ruleset.trigger.type === 'note-change') {
            new Setting(contentEl)
                .setName('Match Type')
                .setDesc('When to run: "To" (starts matching), "From" (stops matching), or "Both"')
                .addDropdown(dropdown => dropdown
                    .addOption('to', 'To (Starts Matching)')
                    .addOption('from', 'From (Stops Matching)')
                    .addOption('both', 'Both')
                    .setValue(this.ruleset.trigger.options?.matchType || 'to')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, matchType: value as 'to' | 'from' | 'both' };
                    }));

            new Setting(contentEl)
                .setName('Trigger Query')
                .setDesc('Dataview query to check against (e.g. FROM "Inbox")')
                .addTextArea(text => text
                    .setValue(this.ruleset.trigger.options?.query || '')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, query: value };
                    }));

            new Setting(contentEl)
                .setName('Delay (seconds)')
                .setDesc('Wait time after change before running')
                .addText(text => text
                    .setValue((this.ruleset.trigger.options?.delay || 0).toString())
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, delay: parseInt(value) || 0 };
                    }));
        } else if (this.ruleset.trigger.type === 'on-load') {
            new Setting(contentEl)
                .setName('Frequency')
                .setDesc('How often should this ruleset run?')
                .addDropdown(dropdown => dropdown
                    .addOption('every', 'Every Startup')
                    .addOption('once-every', 'Once Every...')
                    .setValue(this.ruleset.trigger.options?.frequency || 'every')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, frequency: value as 'every' | 'once-every' };
                    }));

            new Setting(contentEl)
                .setName('Delay (seconds)')
                .setDesc('Wait time after load before running')
                .addText(text => text
                    .setValue((this.ruleset.trigger.options?.delay || 0).toString())
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, delay: parseInt(value) || 0 };
                    }));

            contentEl.createEl('h4', { text: 'Schedule (Leave empty for "Any")' });

            new Setting(contentEl)
                .setName('Days of Week')
                .setDesc('Comma separated 1-7 (Mon-Sun)')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.daysOfWeek || '')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, daysOfWeek: value };
                    }));

            new Setting(contentEl)
                .setName('Hours of Day')
                .setDesc('Comma separated ranges 0-24 (e.g. 9-17)')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.hoursOfDay || '')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, hoursOfDay: value };
                    }));

            new Setting(contentEl)
                .setName('Weeks of Month')
                .setDesc('Comma separated 1-4')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.weeksOfMonth || '')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, weeksOfMonth: value };
                    }));

            new Setting(contentEl)
                .setName('Months of Year')
                .setDesc('Comma separated 1-12')
                .addText(text => text
                    .setValue(this.ruleset.trigger.options?.monthsOfYear || '')
                    .onChange(value => {
                        this.ruleset.trigger.options = { ...this.ruleset.trigger.options, monthsOfYear: value };
                    }));
        }

        contentEl.createEl('h3', { text: 'Rules' });

        this.ruleset.rules.forEach((rule, index) => {
            const ruleDiv = contentEl.createDiv({ cls: 'tidynotes-rule-container' });
            ruleDiv.style.border = '1px solid var(--background-modifier-border)';
            ruleDiv.style.padding = '10px';
            ruleDiv.style.marginBottom = '10px';
            ruleDiv.style.borderRadius = '5px';

            new Setting(ruleDiv)
                .setName(`Rule ${index + 1}`)
                .addText(text => text
                    .setPlaceholder('Rule Name')
                    .setValue(rule.name)
                    .onChange(value => rule.name = value))
                .addDropdown(dropdown => dropdown
                    .addOption('if', 'If')
                    .addOption('else-if', 'Else If')
                    .addOption('else', 'Else')
                    .setValue(rule.type || 'if')
                    .onChange(value => {
                        rule.type = value as 'if' | 'else-if' | 'else';
                        this.display();
                    }))
                .addButton(btn => btn
                    .setButtonText('Delete')
                    .setWarning()
                    .onClick(() => {
                        this.ruleset.rules.splice(index, 1);
                        this.display();
                    }));

            const scopeSetting = new Setting(ruleDiv)
                .setName('Scope (Dataview Query)')
                .setDesc('e.g. FROM "Inbox"')
                .addTextArea(text => text
                    .setValue(rule.scope)
                    .onChange(value => rule.scope = value));

            scopeSetting.addButton(btn => btn
                .setButtonText('Preview')
                .onClick(async () => {
                    // @ts-ignore
                    const plugin = this.app.plugins.plugins['obsidian-tidynotes'];
                    if (plugin) {
                        const files = await plugin.core.dataview.query(rule.scope);
                        new Notice(`Found ${files.length} matching files.`);
                        console.log("TidyNotes Preview Results:", files.map((f: any) => f.path));
                    }
                }));

            // Actions for this rule
            ruleDiv.createEl('h4', { text: 'Actions' });
            rule.actions.forEach((action, actionIndex) => {
                const actionDiv = ruleDiv.createDiv({ cls: 'tidynotes-action-container' });
                actionDiv.style.marginLeft = '20px';

                new Setting(actionDiv)
                    .setName(action.type)
                    .addDropdown(dropdown => dropdown
                        .addOption('Move Note', 'Move Note')
                        .addOption('Update Property', 'Update Property')
                        .setValue(action.type)
                        .onChange(value => {
                            action.type = value;
                            this.display();
                        }))
                    .addButton(btn => btn
                        .setIcon('trash')
                        .onClick(() => {
                            rule.actions.splice(actionIndex, 1);
                            this.display();
                        }));

                if (action.type === 'Move Note') {
                    new Setting(actionDiv)
                        .setName('Target Folder')
                        .addText(text => text
                            .setValue(action.options?.folder || '')
                            .onChange(value => {
                                action.options = { ...action.options, folder: value };
                            }));
                } else if (action.type === 'Update Property') {
                    new Setting(actionDiv)
                        .setName('Property Key')
                        .addText(text => text
                            .setValue(action.options?.key || '')
                            .onChange(value => {
                                action.options = { ...action.options, key: value };
                            }));
                    new Setting(actionDiv)
                        .setName('Property Value')
                        .addText(text => text
                            .setValue(action.options?.value || '')
                            .onChange(value => {
                                action.options = { ...action.options, value: value };
                            }));
                }
            });

            new Setting(ruleDiv)
                .addButton(btn => btn
                    .setButtonText('Add Action')
                    .onClick(() => {
                        rule.actions.push({ type: 'Move Note', options: {} });
                        this.display();
                    }));
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Add Rule')
                .onClick(() => {
                    this.ruleset.rules.push({
                        id: Date.now().toString(),
                        name: 'New Rule',
                        type: 'if',
                        scope: '',
                        actions: []
                    });
                    this.display();
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(() => {
                    this.onSubmit(this.ruleset);
                    this.close();
                }));
    }

    display() {
        this.onOpen();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
