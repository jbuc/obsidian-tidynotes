# TidyNotes Features

## Trigger Types

### On Load
Run rules when Obsidian starts up based on time-based conditions.
- **Frequency**: How often the ruleset should run.
    - **Every Startup**: Runs every time Obsidian loads.
    - **Once Every...**: (Currently behaves as "Once per session" or similar, pending refinement).
- **Delay**: How long to wait (in seconds) after Obsidian loads before running the ruleset. (defaults to "0")
- **Schedule**: Restrict execution to specific times.
    - **Days of Week**: Comma separated list of 1-7 (Mon-Sun).
    - **Hours of Day**: Comma separated list of ranges (e.g., "9-17").
    - **Weeks of Month**: Comma separated list of 1-4.
    - **Months of Year**: Comma separated list of 1-12.

### Note Changes
Run rules when you switch away from a note that has changed to match or stop matching a Dataview query.
*NOTE: This trigger runs when you change the active leaf (e.g., switch tabs or close a note) to minimize performance impact while typing.*
- **Match Type**: Defines when to run the ruleset based on the query match state.
    - **To (Starts Matching)**: Runs when a note *starts* matching the query.
    - **From (Stops Matching)**: Runs when a note *stops* matching the query.
    - **Both**: Runs when a note either starts or stops matching.
- **Trigger Query**: The Dataview query to check against (e.g., `FROM "Inbox"`). This defines the scope of the trigger.
- **Delay**: Defines an additional delay to wait after the trigger fires before running the ruleset. (defaults to "0")

### Manual
Run rules manually via a command.
- **Command Name**: This lets the user create a new command that can be executed to run the ruleset.

## Rules
Rulesets support one trigger and multiple rules. Rules are evaluated in order, and **only the first matching rule** is executed for a given note. This allows for `If / Else If / Else` logic.

### Rule Types
- **If**: The primary condition.
- **Else If**: Checked only if previous rules didn't match.
- **Else**: A catch-all if no other rules matched.

### Scope
Define which notes to target (e.g., using Dataview queries).
- Example: `FROM #task AND -"Task"` (any note in the vault that has the #task tag but isn't in the Task folder)
- **Preview**: You can validate your Dataview query directly in the settings to see how many and which files it matches.

### Actions

### Actions
- **Move Note**: Move the note to a specific folder.
- **Update Property**: Update a frontmatter property of the note.
