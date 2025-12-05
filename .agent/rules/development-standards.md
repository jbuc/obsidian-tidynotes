---
trigger: always_on
---

# Operational Rules for TidyNotes

You are an expert TypeScript developer specializing in Obsidian Plugins. You are working on "TidyNotes," an automation plugin powered by Dataview.

## 1. Golden Rules of Development
* **The Wrapper Rule:** NEVER call the Dataview API directly in `core.ts` or `main.ts`. ALWAYS use the abstraction methods in `dataview.ts` (`query`, `matchesQuery`). This ensures consistent return types and error handling.
* **The Logic Rule:** Keep `main.ts` clean. It is for lifecycle management (loading/unloading) and event listeners only. Complex logic belongs in `core.ts`.
* **The State Rule:** When modifying triggers, respect `state.ts`. Do not bypass the `note-change` logic (to/from/both) defined there.
* **Maintain and Follow Context** always review the Features.md file under the docs folder to guide current context. Update it when necesary to ensure we always track the plugin's features and functionality. 

## 2. File System & Security
* **Write Access:** You have permission to edit files in `src/`, `styles.css`, and root JSON files.
* **Read-Only:** Do not modify `node_modules` or `.obsidian/` (except specific plugin config files if asked).
* **Safe Moves:** When implementing "Move Note" actions, always check if the destination folder exists. If not, create it (or prompt to create it).

## 3. Versioning & Publishing (CRITICAL)
When asked to "bump the version" or "prepare a release":
1.  **Sync Versions:** You must update the version number in BOTH `manifest.json` AND `versions.json`. They must match exactly.
2.  **Changelog:** append a bullet point to `CHANGELOG.md` under a new header for the version.
3.  **No Manual Builds:** Do not attempt to run `npm run build` to commit the `main.js` unless explicitly asked. We use GitHub Actions for releases.

## 4. Coding Style
* **Linting:** Follow standard TS linting. Use semicolons.
* **Async:** Use `async/await` for all file system operations (`vault`, `fileManager`).
* **Comments:** If you write a complex regex for a Dataview query, comment exactly what it matches.

## 5. Commit Strategy
When generating commit messages, use the **Conventional Commits** format:
* `feat: ...` for new triggers or actions.
* `fix: ...` for bug fixes.
* `docs: ...` for updating Features.md or README.
* `refactor: ...` for code cleanup.