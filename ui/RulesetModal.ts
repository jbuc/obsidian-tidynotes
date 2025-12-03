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

        // Trigger specific options could go here

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
                .addButton(btn => btn
                    .setButtonText('Delete')
                    .setWarning()
                    .onClick(() => {
                        this.ruleset.rules.splice(index, 1);
                        this.display();
                    }));

            new Setting(ruleDiv)
                .setName('Scope (Dataview Query)')
                .setDesc('e.g. FROM "Inbox"')
                .addTextArea(text => text
                    .setValue(rule.scope)
                    .onChange(value => rule.scope = value));

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
