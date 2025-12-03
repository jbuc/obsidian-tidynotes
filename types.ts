export interface TidyNotesSettings {
    rulesets: Ruleset[];
}

export const DEFAULT_SETTINGS: TidyNotesSettings = {
    rulesets: []
}

export interface Ruleset {
    id: string;
    name: string;
    enabled: boolean;
    trigger: Trigger;
    rules: Rule[];
}

export type TriggerType = 'on-load' | 'note-change' | 'manual';

export interface Trigger {
    type: TriggerType;
    options?: any;
}

export interface Rule {
    id: string;
    name: string;
    scope: string; // Dataview query or similar
    actions: Action[];
}

export interface Action {
    type: string;
    options?: any;
}
