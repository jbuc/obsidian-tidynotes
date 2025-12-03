# TidyNotes Usage

## Getting Started
1. Install and enable **BRAT** (v1.3.2 or later).
2. Install and enable **Dataview** (v0.5.68 or later).
3. Install and enable **TidyNotes**.

## Creating a Ruleset
1. Open TidyNotes settings.
2. Go to the "Rulesets" tab.
3. Click "Add Ruleset".
4. Name your ruleset and select a trigger type.

## Examples

### Basic Ruleset: Move Tasks
Find any notes that need to move to the "Tasks" folder.
- **Trigger**: "On Load"
- **Rule**: "if"
    - **Scope**: `FROM #task AND -"Task"` (any note in the vault that has the #task tag but isn't in the Task folder)
    - **Action**: "Move Note" to "Tasks" (path of folder)

### Complex Ruleset: Organize Inbox
Run when new notes are added to a folder and are updated based on logical criteria.
- **Trigger**: "On Change"
    - **When**: "to"
    - **Query**: `FROM "Inbox"`
    - **Delay**: "60" seconds
- **Rule**: "if"
    - **Scope**: `FROM "Inbox" WHERE contains(type,"task")`
    - **Action**: "Move Note" to "Tasks"
    - **Action**: "Update Property" "Status" to "To Do"
- **Rule**: "else if"
    - **Scope**: `FROM "Inbox" WHERE contains(type,"project")`
    - **Action**: "Move Note" to "Projects"
    - **Action**: "Update Property" "Status" to "To Do"
- **Rule**: "else"
    - **Scope**: `LIST FROM "" WHERE file.size <= 1`
    - **Action**: "Move Note" to "Trash"

## Testing your Ruleset
When you are happy with your ruleset, you can activate a **dry-run** to see a list of TidyNotes' operations. The output would contain lines like:
- found X notes matching rule Y
- found X notes matching rule Y

You can then run the ruleset for real to perform the operations or leave the settings to let the trigger run. If you ever want to know how things are going you can view/manage/clear TidyNotes' activity log in the settings under the "History" tab.
