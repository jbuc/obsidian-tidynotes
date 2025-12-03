# TidyNotes Features

## Trigger Types

### On Load
Run rules when Obsidian starts up based on time-based conditions.
- **Always/Once**: How many times the ruleset should run. (defaults to "Always")
- **On delay**: How long to wait after obsidian loads before running the ruleset. (defaults to "0")
- **Per Day**: The range of hours in a day the ruleset can run. (defaults to "any", options: "any or comma separated list of ranges of 0-24")
- **Per Week**: The days of the week the ruleset can run. (defaults to "any", options: "any or comma separated list of 1,2,3,4,5,6,7")
- **Per Month**: The weeks of the month the ruleset can run. (defaults to "any", options: "any or comma separated list of 1,2,3,4")
- **Per Year**: The months of the year the ruleset can run. (defaults to "any", options: "any or comma separated list of 1,2,3,4,5,6,7,8,9,10,11,12")

### Note Changes
Run rules when notes change to match or stop matching a Dataview query.
*NOTE: changes are calculated after an intelligently calculated delay to minimize performance impact.*
- **On change**: Defines if the note started to match or stops matching the query. (defaults to "both" options: "to or from or both")
- **Query**: The dataview query to match notes against. This is just a normal dataview query. When you fill it out the plugin will allow you to preview dataview's output as though you were adding it to a note.
- **Delay**: Defines an additional delay to wait after a note changes before running the ruleset. (defaults to "0")

### Manual
Run rules manually via a command.
- **Command Name**: This lets the user create a new command that can be executed to run the ruleset.

## Rules
Rulesets support one trigger and multiple rules. Rules can contain multiple actions.

### Scope
Define which notes to target (e.g., using Dataview queries).
- Example: `FROM #task AND -"Task"` (any note in the vault that has the #task tag but isn't in the Task folder)

### Actions
- **Move Note**: Move the note to a specific folder.
- **Update Property**: Update a frontmatter property of the note.
