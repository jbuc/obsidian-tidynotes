import { App, TFile, Notice } from 'obsidian';
import { Ruleset, Rule, Action } from './types';
import { DataviewService } from './dataview';

export class TidyNotesCore {
    app: App;
    dataview: DataviewService;

    constructor(app: App) {
        this.app = app;
        this.dataview = new DataviewService(app);
    }

    public async runRuleset(ruleset: Ruleset, dryRun: boolean = false) {
        if (!ruleset.enabled) return;

        console.log(`TidyNotes: Running ruleset "${ruleset.name}" (Dry Run: ${dryRun})`);

        for (const rule of ruleset.rules) {
            await this.evaluateRule(rule, dryRun);
        }
    }

    private async evaluateRule(rule: Rule, dryRun: boolean) {
        const files = await this.dataview.query(rule.scope);
        console.log(`TidyNotes: Rule "${rule.name}" matched ${files.length} files.`);

        for (const file of files) {
            for (const action of rule.actions) {
                await this.executeAction(file, action, dryRun);
            }
        }
    }

    private async executeAction(file: TFile, action: Action, dryRun: boolean) {
        if (dryRun) {
            console.log(`TidyNotes [Dry Run]: Would execute "${action.type}" on "${file.path}" with options:`, action.options);
            return;
        }

        try {
            switch (action.type) {
                case 'Move Note':
                    await this.actionMoveNote(file, action.options);
                    break;
                case 'Update Property':
                    await this.actionUpdateProperty(file, action.options);
                    break;
                default:
                    console.warn(`TidyNotes: Unknown action type "${action.type}"`);
            }
        } catch (e) {
            console.error(`TidyNotes: Error executing action "${action.type}" on "${file.path}"`, e);
        }
    }

    private async actionMoveNote(file: TFile, options: any) {
        const targetFolder = options.folder;
        if (!targetFolder) return;

        // Ensure folder exists
        if (!this.app.vault.getAbstractFileByPath(targetFolder)) {
            await this.app.vault.createFolder(targetFolder);
        }

        const newPath = `${targetFolder}/${file.name}`;
        if (file.path !== newPath) {
            await this.app.fileManager.renameFile(file, newPath);
            console.log(`TidyNotes: Moved "${file.path}" to "${newPath}"`);
        }
    }

    private async actionUpdateProperty(file: TFile, options: any) {
        const { key, value } = options;
        if (!key) return;

        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter[key] = value;
        });
        console.log(`TidyNotes: Updated property "${key}" to "${value}" in "${file.path}"`);
    }
}
