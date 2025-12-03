import { App, TFile } from 'obsidian';
import { getAPI, DataviewApi } from 'obsidian-dataview';

export class DataviewService {
    app: App;
    api: DataviewApi | undefined;

    constructor(app: App) {
        this.app = app;
    }

    public isAvailable(): boolean {
        this.api = getAPI(this.app);
        return !!this.api;
    }

    public async query(source: string): Promise<TFile[]> {
        if (!this.isAvailable() || !this.api) {
            console.warn("Dataview API not available");
            return [];
        }

        try {
            // Normalize the query to ensure we get file paths
            // If the user provided a full query starting with LIST or TABLE, strip it
            let dql = source.trim();
            const viewTypeRegex = /^(LIST|TABLE|TASK|CALENDAR)\s+/i;
            if (viewTypeRegex.test(dql)) {
                dql = dql.replace(viewTypeRegex, '');
            }

            // Construct a query that selects the file path
            // We use TABLE file.path to get the path explicitly
            const finalQuery = `TABLE file.path ${dql}`;

            const result = await this.api.query(finalQuery);

            if (!result.successful) {
                console.error("TidyNotes: Dataview query failed", result.error);
                return [];
            }

            const files: TFile[] = [];

            // Result value for TABLE is { type: 'table', headers: [...], values: [...] }
            // values is an array of rows. Each row is an array of columns.
            // We selected file.path as the first (and only?) column.
            // Note: TABLE queries implicitly include the file link as the first column unless 'without id' is used.
            // But we didn't use 'without id'.
            // So column 0 is Link (File), column 1 is file.path.

            // Wait, if we use `TABLE file.path`, the columns are:
            // 0: File Link (Implicit ID)
            // 1: file.path

            // Let's check the result structure type if possible, but assuming standard Dataview behavior:
            const rows = result.value.values;

            for (const row of rows) {
                // row[0] is the file link (implicit)
                // row[1] is the file path (explicitly selected)

                // We can use the path from row[1]
                let path = row[1];

                // If for some reason the user used 'without id' in their part (unlikely if we stripped LIST),
                // we might need to adjust. But let's assume row[1] is safe if we prepended TABLE file.path

                // Actually, if we just want the file, we can use row[0] which is the Link.
                const link = row[0];
                if (link && link.path) {
                    path = link.path;
                }

                if (typeof path === 'string') {
                    const file = this.app.vault.getAbstractFileByPath(path);
                    if (file instanceof TFile) {
                        files.push(file);
                    }
                }
            }

            return files;
        } catch (e) {
            console.error("TidyNotes: Error executing Dataview query", e);
            return [];
        }
    }

    public async matchesQuery(file: TFile, query: string): Promise<boolean> {
        if (!this.isAvailable() || !this.api) return false;

        try {
            // Optimization: Try to use a query that filters by file path directly
            // e.g. TABLE file.path FROM <query> WHERE file.path = "<path>"

            // Normalize query similar to query() method
            let dql = query.trim();
            const viewTypeRegex = /^(LIST|TABLE|TASK|CALENDAR)\s+/i;
            if (viewTypeRegex.test(dql)) {
                dql = dql.replace(viewTypeRegex, '');
            }

            // Escape file path for query
            // Simple escape for quotes
            const safePath = file.path.replace(/"/g, '\\"');

            // Construct query: TABLE file.path <user-query> WHERE file.path = "..."
            // We need to append the WHERE clause carefully.
            // If the user query already has WHERE, we add AND.
            // But parsing that is hard.
            // Easier: Just run the user query and see if the file is in the results.
            // This might be slow if the user query returns 1000s of files.
            // But Dataview is generally fast.

            // Let's try to append WHERE file.path = ... if possible.
            // If we just append `WHERE file.path = ...` it might break if there's already a WHERE.
            // Safest: Run the query as is, but select file.path.

            const finalQuery = `TABLE file.path ${dql}`;
            const result = await this.api.query(finalQuery);

            if (!result.successful) return false;

            const rows = result.value.values;
            for (const row of rows) {
                // Check if this row corresponds to our file
                // row[1] is file.path
                if (row[1] === file.path) return true;

                // Also check row[0] (Link)
                const link = row[0];
                if (link && link.path === file.path) return true;
            }

            return false;
        } catch (e) {
            console.error("TidyNotes: Error checking query match", e);
            return false;
        }
    }
}
