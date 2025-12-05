# TidyNotes Technical Reference

## System Overview
TidyNotes is an Obsidian plugin designed to automate note organization and metadata management based on user-defined rules. It operates by monitoring file states and system events, evaluating conditions using Dataview queries, and executing actions like moving files or updating frontmatter.

## Core Architecture

### Entry Point (`main.ts`)
- **Lifecycle**: Manages plugin initialization (`onload`) and cleanup (`onunload`).
- **Event Listeners**:
  - `onLayoutReady`: Triggers `on-load` rulesets after Dataview is initialized.
  - `active-leaf-change`: Monitors user navigation to trigger `note-change` rulesets.
- **Command Registration**: Registers manual commands for specific rulesets.

### Logic Engine (`core.ts`)
- **Rule Evaluation**:
  - `runRuleset`: Executes a ruleset globally (scanning all files matching the scope).
  - `runRulesetForFile`: Executes a ruleset against a specific file (used by triggers).
  - **Logic Flow**: Implements `If / Else If / Else` grouping. Once a rule in a group matches a file, subsequent rules in that group are skipped for that file.
- **Global Exclusion**: Checks `settings.excludedQuery` before processing.
  - **Single File**: Checks if the file matches the exclusion query.
  - **Global Run**: Pre-fetches all excluded files and filters the working set.
- **Action Execution**: Dispatches actions (`Move Note`, `Update Property`) via Obsidian's `FileManager`.

### Data Access (`dataview.ts`)
- **Abstraction**: Wraps the `obsidian-dataview` API.
- **Querying**:
  - `query(source)`: Returns a list of `TFile` objects matching a Dataview query.
  - `matchesQuery(file, query)`: Boolean check if a specific file matches a query.
- **Normalization**: Handles query cleanup (stripping `TABLE`/`LIST` prefixes) to ensure consistent return types.

### State Management (`state.ts`)
- **Purpose**: Tracks the "match state" of files to detect changes.
- **Mechanism**: Stores a map of `File Path -> [Matched Ruleset IDs]`.
- **Usage**: Used by `note-change` triggers to determine if a file has *started* or *stopped* matching a criteria (`to`, `from`, `both` logic).

## Data Models (`types.ts`)

### Settings
```typescript
interface TidyNotesSettings {
    rulesets: Ruleset[];
    excludedQuery?: string; // Global Dataview query for exclusion
}
```

### Ruleset
- **Structure**: Contains a `Trigger` and a list of `Rule` objects.
- **Trigger**:
  - `type`: `'on-load' | 'note-change' | 'manual'`
  - `options`: Schedule (days/hours), Frequency, Delay, Match Type.
- **Rule**:
  - `type`: `'if' | 'else-if' | 'else'`
  - `scope`: Dataview query string.
  - `actions`: List of `Action` objects.

### Actions
- **Types**:
  - `Move Note`: Requires `folder` path.
  - `Update Property`: Requires `key` and `value`.

## Feature Specifications

### Triggers
1.  **On Load**:
    - Runs on startup.
    - **Scheduling**: Checks `daysOfWeek`, `hoursOfDay`, `weeksOfMonth`, `monthsOfYear` against current time.
    - **Delays**: Supports execution delays to allow system stabilization.
2.  **Note Change**:
    - **Event**: Fires on `active-leaf-change` (when leaving a note).
    - **Logic**: Compares previous match state (from `state.ts`) with current state.
    - **Modes**:
        - `to`: Matches NOW but NOT BEFORE.
        - `from`: Matched BEFORE but NOT NOW.
        - `both`: State changed in either direction.
3.  **Manual**:
    - Triggered via Ribbon icon or Command Palette.

### Global Exclusion
- **Setting**: `excludedQuery` (e.g., `#exclude`).
- **Behavior**: Any file matching this query is strictly ignored by ALL triggers and rulesets.
- **UI**: The Ruleset Modal "Preview" button filters these files out of the count.

## UI Components (`ui/`)
- **RulesetModal**: Complex modal for creating/editing rulesets.
  - Dynamic form fields based on Trigger Type.
  - Rule list management with drag-and-drop (implied order).
  - "Preview" functionality to test Dataview queries immediately.

## External Dependencies
- **Obsidian API**: Core file system operations (`Vault`, `FileManager`), Metadata (`processFrontMatter`), and UI (`Modal`, `Setting`).
- **Dataview**: Required for all query evaluations. The plugin waits for Dataview to be available on load.
