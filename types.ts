export interface TidyNotesSettings {
    rulesets: Ruleset[];
    excludedQuery?: string;
}

export const DEFAULT_SETTINGS: TidyNotesSettings = {
    rulesets: [],
    excludedQuery: ""
}

export interface Ruleset {
    id: string;
    name: string;
    enabled: boolean;
    trigger: Trigger;
    rules: Rule[];
    lastRun?: number;
}

export type TriggerType = 'on-load' | 'note-change' | 'manual';

export interface Trigger {
    type: TriggerType;
    options?: {
        commandName?: string;
        frequency?: 'every' | 'once-every';
        delay?: number; // seconds
        matchType?: 'to' | 'from' | 'both';
        query?: string; // Dataview query for trigger scope
        daysOfWeek?: string; // comma separated 1-7
        hoursOfDay?: string; // "all" or comma separated ranges 0-24
        weeksOfMonth?: string; // "all" or comma separated 1-4
        monthsOfYear?: string; // "all" or comma separated 1-12
    };
}

export interface Rule {
    id: string;
    name: string;
    type: 'if' | 'else-if' | 'else';
    scope: string; // Dataview query or similar
    actions: Action[];
}

export interface Action {
    type: string;
    options?: any;
}
