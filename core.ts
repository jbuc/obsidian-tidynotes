import { App, TFile, Notice } from 'obsidian';
import { Ruleset, Rule, Action, TidyNotesSettings } from './types';
import { DataviewService } from './dataview';
import { LogService } from './logger';

export class TidyNotesCore {
    app: App;
    dataview: DataviewService;
    logger: LogService;
    getSettings: () => TidyNotesSettings;

    constructor(app: App, logger: LogService, getSettings: () => TidyNotesSettings) {
        this.app = app;
        this.dataview = new DataviewService(app);
        this.logger = logger;
        this.getSettings = getSettings;
    }

    async runRulesetForFile(ruleset: Ruleset, file: TFile, dryRun: boolean = false) {
        if (!ruleset.enabled) return;

        // Check global exclusion
        const excludedQuery = this.getSettings().excludedQuery;
        if (excludedQuery) {
            const isExcluded = await this.dataview.matchesQuery(file, excludedQuery);
            if (isExcluded) {
                this.logger.info(`Skipping file "${file.path}" because it matches global exclusion query: "${excludedQuery}"`);
                return;
            }
        }

        this.logger.info(`Running ruleset "${ruleset.name}" for file "${file.path}"`);
        let groupMatched = false;

        // Iterate rules in order
        for (const rule of ruleset.rules) {
            const ruleType = rule.type || 'if'; // Default to 'if'

            if (ruleType === 'if') {
                groupMatched = false; // Start new group
            }

            if (groupMatched) {
                this.logger.info(`Skipping rule "${rule.name}" (${ruleType}) because group already matched.`);
                continue;
            }

            // Check match
            let matches = false;
            // Handle 'else' without scope as "match everything" (only valid if previous didn't match)
            if (ruleType === 'else' && !rule.scope?.trim()) {
                matches = true;
                this.logger.info(`Rule "${rule.name}" (else) matched (no scope).`);
            } else {
                matches = await this.dataview.matchesQuery(file, rule.scope);
                this.logger.info(`Checking rule "${rule.name}" (${ruleType}) scope: "${rule.scope}" -> Match: ${matches}`);
            }

            if (matches) {
                if (dryRun) {
                    this.logger.info(`[Dry Run] Rule "${rule.name}" (${ruleType}) matched file "${file.path}"`);
                } else {
                    this.logger.info(`Rule "${rule.name}" (${ruleType}) matched file "${file.path}"`);
                    for (const action of rule.actions) {
                        await this.executeAction(file, action, dryRun);
                    }
                }

                // Mark this group as matched so subsequent 'else-if'/'else' are skipped
                groupMatched = true;
            }
        }
    }

    async runRuleset(ruleset: Ruleset, dryRun: boolean = false) {
        if (!ruleset.enabled) return;

        this.logger.info(`Running global ruleset "${ruleset.name}"`);

        // Check global exclusion
        const excludedQuery = this.getSettings().excludedQuery;
        const excludedFiles = new Set<string>();
        if (excludedQuery) {
            const files = await this.dataview.query(excludedQuery);
            files.forEach(f => excludedFiles.add(f.path));
            this.logger.info(`Global exclusion query "${excludedQuery}" found ${excludedFiles.size} files to exclude.`);
        }

        // Global run
        // Track which files have matched in the current "If/Else" group
        let fileMatchedInGroup = new Set<string>();

        for (const rule of ruleset.rules) {
            const ruleType = rule.type || 'if';

            if (ruleType === 'if') {
                fileMatchedInGroup.clear(); // Start new group, reset all files
            }

            // Find matching files
            let matchingFiles: TFile[] = [];
            if (ruleType === 'else' && !rule.scope?.trim()) {
                // For global 'else' without scope, we technically should match ALL files not yet matched.
                // But querying "all files" is expensive and dangerous.
                // For safety, we might skip empty 'else' in global runs, or require a scope.
                // Let's log a warning and skip for now to prevent accidents.
                this.logger.warn(`Rule "${rule.name}" is a global 'else' without scope. Skipping for safety.`);
                continue;
            } else {
                matchingFiles = await this.dataview.query(rule.scope);

                // Filter excluded files
                if (excludedFiles.size > 0) {
                    matchingFiles = matchingFiles.filter(f => !excludedFiles.has(f.path));
                }

                this.logger.info(`Rule "${rule.name}" (${ruleType}) query "${rule.scope}" found ${matchingFiles.length} files (after exclusion).`);
            }

            for (const file of matchingFiles) {
                if (fileMatchedInGroup.has(file.path)) {
                    // this.logger.info(`Skipping file "${file.path}" for rule "${rule.name}" because it already matched in this group.`);
                    continue;
                }

                if (dryRun) {
                    this.logger.info(`[Dry Run] Rule "${rule.name}" (${ruleType}) matched file "${file.path}"`);
                } else {
                    this.logger.info(`Rule "${rule.name}" (${ruleType}) matched file "${file.path}"`);
                    for (const action of rule.actions) {
                        await this.executeAction(file, action, dryRun);
                    }
                }

                fileMatchedInGroup.add(file.path);
            }
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
