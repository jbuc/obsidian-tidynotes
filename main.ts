import { Plugin, Notice, TFile } from 'obsidian';
import { TidyNotesSettings, DEFAULT_SETTINGS } from './types';
import { TidyNotesSettingTab } from './settings';
import { TidyNotesCore } from './core';
import { StateManager } from './state';
import { LogService } from './logger';

export default class TidyNotesPlugin extends Plugin {
    settings: TidyNotesSettings;
    core: TidyNotesCore;
    stateManager: StateManager;
    logger: LogService;
    lastActiveFile: TFile | null = null;

    async onload() {
        console.log('Loading TidyNotes plugin');
        await this.loadSettings();

        this.logger = new LogService(this);
        this.core = new TidyNotesCore(this.app, this.logger, () => this.settings);
        this.stateManager = new StateManager(this);
        await this.stateManager.load();

        this.addSettingTab(new TidyNotesSettingTab(this.app, this));

        this.addRibbonIcon('broom', 'TidyNotes Run', () => {
            new Notice('Running TidyNotes Manual Rulesets...');
            this.runManualRulesets();
        });

        this.addCommand({
            id: 'run-manual-rulesets',
            name: 'Run All Manual Rulesets',
            callback: () => {
                this.runManualRulesets();
            }
        });

        // Register custom commands for manual rulesets
        this.settings.rulesets.forEach(ruleset => {
            if (ruleset.trigger.type === 'manual') {
                this.addCommand({
                    id: `run-ruleset-${ruleset.id}`,
                    name: `Run: ${ruleset.name}`,
                    callback: async () => {
                        new Notice(`Running TidyNotes: ${ruleset.name}`);
                        await this.core.runRuleset(ruleset);
                    }
                });
            }
        });

        // Register On Load triggers
        this.app.workspace.onLayoutReady(() => {
            // Run asynchronously to not block Obsidian startup
            (async () => {
                // Wait for Dataview to be ready
                await this.waitForDataview();
                // Add a small buffer to ensure index is ready even after API is available
                await new Promise(resolve => setTimeout(resolve, 2000));
                this.runOnLoadRulesets();
            })();
        });

        // Register Note Changes triggers (Move Away / Active Leaf Change)
        this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf) => {
            // If we have a last active file, check it for changes
            if (this.lastActiveFile) {
                const fileToCheck = this.lastActiveFile;
                // Ensure file still exists
                if (this.app.vault.getAbstractFileByPath(fileToCheck.path)) {
                    await this.runNoteChangeRulesets(fileToCheck);
                }
            }

            // Update last active file
            // @ts-ignore
            if (leaf && leaf.view.file instanceof TFile) {
                // @ts-ignore
                this.lastActiveFile = leaf.view.file;
            } else {
                this.lastActiveFile = null;
            }
        }));
    }

    async waitForDataview(): Promise<void> {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 20; // 10 seconds total

            const check = () => {
                attempts++;
                if ((this.app as any).plugins.enabledPlugins.has("dataview")) {
                    const api = this.core.dataview.isAvailable();
                    // Check if index is ready if possible, otherwise just API presence
                    if (api) {
                        // @ts-ignore
                        if ((this.app as any).plugins.plugins.dataview?.api?.index?.initialized) {
                            console.log("TidyNotes: Dataview index initialized.");
                            resolve();
                            return;
                        } else if (attempts > 5) {
                            // If we've waited a bit and index isn't explicitly ready, maybe it is but we can't check.
                            // Proceeding.
                            console.log("TidyNotes: Dataview API found.");
                            resolve();
                            return;
                        }
                    }
                }

                if (attempts >= maxAttempts) {
                    console.warn("TidyNotes: Timed out waiting for Dataview.");
                    resolve(); // Resolve anyway to try running
                    return;
                }

                setTimeout(check, 500);
            };

            check();
        });
    }

    async runManualRulesets() {
        for (const ruleset of this.settings.rulesets) {
            if (ruleset.trigger.type === 'manual') {
                await this.core.runRuleset(ruleset);
            }
        }
    }

    async runOnLoadRulesets() {
        const now = new Date();

        for (const ruleset of this.settings.rulesets) {
            if (ruleset.trigger.type !== 'on-load') continue;
            if (!ruleset.enabled) continue;

            const options = ruleset.trigger.options || {};

            // Check Frequency
            // 'once-every' behavior depends on requirement. Assuming it means "run once, then not again until reset or time passed?"
            // For now, treating 'once-every' as "run if not run recently" or just "run once" if no duration specified?
            // The user changed it to 'every' | 'once-every'. 
            // 'every' = always run on load.
            // 'once-every' = run if enough time has passed since last run? Or just "Once" behavior?
            // Reverting to "Once" behavior for 'once-every' if no other param, or maybe it implies a duration?
            // Given the previous "Once" logic:
            if (options.frequency === 'once-every' && ruleset.lastRun) {
                // If we want to support "Once every X days", we need that param.
                // For now, treating it as "Once" (run only if never run before)
                continue;
            }

            // Check Schedule
            if (!this.checkSchedule(now, options)) {
                continue;
            }

            // Apply Delay
            const delay = (options.delay || 0) * 1000;

            if (delay > 0) {
                console.log(`TidyNotes: Waiting ${delay}ms before running ruleset "${ruleset.name}"`);
                setTimeout(async () => {
                    await this.core.runRuleset(ruleset);
                    ruleset.lastRun = Date.now();
                    await this.saveSettings();
                }, delay);
            } else {
                await this.core.runRuleset(ruleset);
                ruleset.lastRun = Date.now();
                await this.saveSettings();
            }
        }
    }

    checkSchedule(date: Date, options: any): boolean {
        // Days of Week (1-7, Mon-Sun)
        if (options.daysOfWeek) {
            const currentDay = date.getDay() || 7; // Convert 0 (Sun) to 7
            const days = options.daysOfWeek.split(',').map((d: string) => parseInt(d.trim()));
            if (!days.includes(currentDay)) return false;
        }

        // Hours of Day (ranges like 9-17)
        if (options.hoursOfDay) {
            const currentHour = date.getHours();
            const ranges = options.hoursOfDay.split(',');
            let match = false;
            for (const range of ranges) {
                const [start, end] = range.split('-').map((h: string) => parseInt(h.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    if (currentHour >= start && currentHour <= end) {
                        match = true;
                        break;
                    }
                } else if (!isNaN(start)) {
                    if (currentHour === start) {
                        match = true;
                        break;
                    }
                }
            }
            if (!match) return false;
        }

        // Weeks of Month (1-4)
        if (options.weeksOfMonth) {
            const currentWeek = Math.ceil(date.getDate() / 7);
            const weeks = options.weeksOfMonth.split(',').map((w: string) => parseInt(w.trim()));
            if (!weeks.includes(currentWeek)) return false;
        }

        // Months of Year (1-12)
        if (options.monthsOfYear) {
            const currentMonth = date.getMonth() + 1;
            const months = options.monthsOfYear.split(',').map((m: string) => parseInt(m.trim()));
            if (!months.includes(currentMonth)) return false;
        }

        return true;
    }

    async runNoteChangeRulesets(file: TFile) {
        // Check global exclusion
        if (this.settings.excludedQuery) {
            const isExcluded = await this.core.dataview.matchesQuery(file, this.settings.excludedQuery);
            if (isExcluded) {
                return;
            }
        }

        const oldMatches = this.stateManager.getMatches(file);
        const newMatches: string[] = [];
        const rulesetsToRun: any[] = [];

        for (const ruleset of this.settings.rulesets) {
            if (ruleset.trigger.type !== 'note-change') continue;
            if (!ruleset.enabled) continue;

            const options = ruleset.trigger.options || {};
            const query = options.query || '';
            const matchType = options.matchType || 'to';

            // Check if file matches the query
            const matchesNow = await this.core.dataview.matchesQuery(file, query);

            if (matchesNow) {
                newMatches.push(ruleset.id);
            }

            const matchedBefore = oldMatches.includes(ruleset.id);

            let shouldRun = false;

            if (matchType === 'to' && matchesNow && !matchedBefore) {
                shouldRun = true;
            } else if (matchType === 'from' && !matchesNow && matchedBefore) {
                shouldRun = true;
            } else if (matchType === 'both') {
                if ((matchesNow && !matchedBefore) || (!matchesNow && matchedBefore)) {
                    shouldRun = true;
                }
            }

            if (shouldRun) {
                rulesetsToRun.push({ ruleset, delay: options.delay || 0 });
            }
        }

        // Update state
        this.stateManager.setMatches(file, newMatches);

        // Run rulesets
        for (const { ruleset, delay } of rulesetsToRun) {
            if (delay > 0) {
                setTimeout(async () => {
                    await this.core.runRulesetForFile(ruleset, file);
                }, delay * 1000);
            } else {
                await this.core.runRulesetForFile(ruleset, file);
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
