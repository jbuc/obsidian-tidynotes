import { Setting, setIcon, Notice, App } from 'obsidian';
import TidyNotesPlugin from '../main';

export function addQueryInput(
    setting: Setting,
    plugin: TidyNotesPlugin,
    value: string,
    onChange: (value: string) => void,
    placeholder: string = 'e.g. FROM "Inbox"',
    filterExclusions: boolean = true
) {
    let toggleBtnElement: HTMLElement;
    let runPreview: () => Promise<void>;

    // Content Area (Text Area) - Appended after the setting
    const content = createDiv({ cls: 'tidynotes-query-content' });
    content.style.display = 'none'; // Hidden by default

    // Append content to the parent of the setting element, so it sits below the setting row
    if (setting.settingEl.parentElement) {
        setting.settingEl.parentElement.insertBefore(content, setting.settingEl.nextSibling);
    } else {
        console.warn("TidyNotes: Setting element not attached to DOM, cannot append query editor.");
    }

    const textArea = content.createEl('textarea');
    textArea.placeholder = placeholder;
    textArea.value = value;
    textArea.spellcheck = false;

    // State Management
    const updateState = () => {
        const hasContent = textArea.value.trim().length > 0;
        const isActive = content.style.display !== 'none';

        // Toggle Button State
        if (isActive) {
            toggleBtnElement.addClass('is-active');
            toggleBtnElement.removeClass('has-content'); // Active overrides content color
        } else {
            toggleBtnElement.removeClass('is-active');
            if (hasContent) {
                toggleBtnElement.addClass('has-content');
            } else {
                toggleBtnElement.removeClass('has-content');
            }
        }
    };

    // Preview Logic
    runPreview = async () => {
        const query = textArea.value;
        if (!query.trim()) {
            setting.setDesc(placeholder); // Revert to default/placeholder if empty
            setting.descEl.style.color = ''; // Reset color
            return;
        }

        try {
            let files = await plugin.core.dataview.query(query);

            // Check global exclusion
            if (filterExclusions) {
                const excludedQuery = plugin.settings.excludedQuery;
                if (excludedQuery) {
                    const excludedFiles = await plugin.core.dataview.query(excludedQuery);
                    const excludedPaths = new Set(excludedFiles.map((f: any) => f.path));
                    files = files.filter((f: any) => !excludedPaths.has(f.path));
                }
            }

            setting.setDesc(`Matches ${files.length} notes`);
            setting.descEl.style.color = 'var(--text-accent)';
        } catch (e) {
            setting.setDesc('Error with query');
            setting.descEl.style.color = 'var(--text-error)';
            console.error(e);
        }
    };

    // Toggle Button (Text Button) - Added to Setting Header
    setting.addButton(btn => {
        btn.setButtonText('Edit Query')
            .setTooltip('Toggle Query Editor')
            .onClick(() => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                updateState();

                // Run preview when closing
                if (!isHidden) { // If it was visible (not hidden), we are closing it
                    runPreview();
                }
            });
        toggleBtnElement = btn.buttonEl;
    });

    toggleBtnElement.addClass('tidynotes-query-toggle');

    // Initial State
    updateState();
    // Run preview initially if there is a value
    if (value.trim()) {
        runPreview();
    }

    textArea.oninput = () => {
        onChange(textArea.value);
        updateState();
    };

    // Optional: Keep the manual preview button?
    // User said "have preview run whenever the query box is closed".
    // But a manual button might still be useful while editing.
    // Let's keep it but maybe rename or style it?
    // The previous implementation had it. Let's keep it for now.
    const previewBtn = content.createEl('button', { text: 'Preview', cls: 'tidynotes-preview-btn' });
    previewBtn.onclick = async () => {
        await runPreview();
        new Notice(setting.descEl.innerText); // Show notice as well for manual click
    };
}
