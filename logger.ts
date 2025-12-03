import TidyNotesPlugin from './main';

export interface LogEntry {
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    details?: any;
}

export class LogService {
    plugin: TidyNotesPlugin;
    logs: LogEntry[] = [];
    private readonly MAX_LOGS = 200;

    constructor(plugin: TidyNotesPlugin) {
        this.plugin = plugin;
    }

    async load() {
        // We could load from data.json if we want persistence.
        // For now, let's keep it in memory or load from a separate file if needed.
        // Piggybacking on settings for simplicity if we want persistence.
        // Let's try to load from `data.json` via plugin.loadData() if we store it there.
        // But `plugin.settings` is typed.
        // Let's just keep it in memory for this session for now, 
        // or add it to TidyNotesSettings if persistence is critical.
        // User didn't explicitly ask for persistence across restarts, but it's nice.
        // Let's stick to memory for now to avoid bloating settings, unless requested.
    }

    info(message: string, details?: any) {
        this.addEntry('info', message, details);
    }

    warn(message: string, details?: any) {
        this.addEntry('warn', message, details);
    }

    error(message: string, details?: any) {
        this.addEntry('error', message, details);
    }

    private addEntry(level: 'info' | 'warn' | 'error', message: string, details?: any) {
        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            details
        };

        this.logs.unshift(entry); // Add to beginning

        if (this.logs.length > this.MAX_LOGS) {
            this.logs.pop();
        }

        // Console fallback
        const consoleMsg = `TidyNotes [${level.toUpperCase()}]: ${message}`;
        if (level === 'error') console.error(consoleMsg, details);
        else if (level === 'warn') console.warn(consoleMsg, details);
        else console.log(consoleMsg, details);
    }

    getLogs(): LogEntry[] {
        return this.logs;
    }

    clear() {
        this.logs = [];
    }
}
