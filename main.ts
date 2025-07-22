import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, MarkdownView, Modal } from "obsidian";
import Sanscript from "@indic-transliteration/sanscript";

interface TransliterationSettings {
	defaultDirection: "ITRANS_TO_DEV" | "DEV_TO_ITRANS";
	appendMode: boolean;
}

const DEFAULT_SETTINGS: TransliterationSettings = {
	defaultDirection: "ITRANS_TO_DEV",
	appendMode: true,
};

export default class TransliterationPlugin extends Plugin {
	settings: TransliterationSettings;
	statusBarEl: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new TransliterationSettingTab(this.app, this));

		this.statusBarEl = this.addStatusBarItem();
		this.updateStatusBar();

		this.addCommand({
			id: "convert-selection-or-note",
			name: "Convert Selection or Entire Note",
			callback: () => this.convertCurrentNoteOrSelection(),
		});

		this.addCommand({
			id: "convert-preview",
			name: "Preview Transliteration of Selection",
			callback: () => this.previewTransliteration(),
		});

		this.addCommand({
			id: "toggle-direction",
			name: "Toggle Transliteration Direction",
			callback: () => {
				this.settings.defaultDirection =
					this.settings.defaultDirection === "ITRANS_TO_DEV" ? "DEV_TO_ITRANS" : "ITRANS_TO_DEV";
				this.saveSettings();
				this.updateStatusBar();
			},
		});

		this.addCommand({
			id: "convert-selection-itrans-to-dev",
			name: "Convert Selection from ITRANS to Devanagari",
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return;
				this.convertSelection(view.editor, "ITRANS_TO_DEV");
			},

		});
		
		this.addCommand({
			id: "convert-selection-dev-to-itrans",
			name: "Convert Selection from Devanagari to ITRANS",
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return;
				this.convertSelection(view.editor, "DEV_TO_ITRANS");
			},

		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				menu.addItem((item) => {
					item
						.setTitle("🆎→🕉")
						.onClick(() => this.convertSelection(editor, "ITRANS_TO_DEV"));
				});
				menu.addItem((item) => {
					item
						.setTitle("🕉→🆎")
						.onClick(() => this.convertSelection(editor, "DEV_TO_ITRANS"));
				});
			})
		);

		this.statusBarEl.onclick = () => {
			this.settings.defaultDirection =
				this.settings.defaultDirection === "ITRANS_TO_DEV" ? "DEV_TO_ITRANS" : "ITRANS_TO_DEV";
			this.saveSettings();
			this.updateStatusBar();
		};
	}

	updateStatusBar() {
		const icon =
			this.settings.defaultDirection === "ITRANS_TO_DEV" ? "🆎→🕉" : "🕉→🆎";
		this.statusBarEl.setText(icon);
	}

	async previewTransliteration() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const selectedText = editor.getSelection();
		if (!selectedText) {
			new Notice("No text selected for preview.");
			return;
		}

		const converted = this.convertText(selectedText, this.settings.defaultDirection);
		const previewText = `${selectedText} (${converted})`;

		new PreviewModal(this.app, previewText, () => {
			editor.replaceSelection(this.settings.appendMode
				? `${selectedText} (${converted})`
				: converted);
		}).open();
	}

	convertText(text: string, direction: "ITRANS_TO_DEV" | "DEV_TO_ITRANS"): string {
		if (direction === "ITRANS_TO_DEV") {
			return Sanscript.t(text, "itrans", "devanagari");
		} else {
			return Sanscript.t(text, "devanagari", "itrans");
		}
	}

	convertSelection(editor: any, direction: "ITRANS_TO_DEV" | "DEV_TO_ITRANS") {
		const selectedText = editor.getSelection();
		if (!selectedText) return;

		const converted = this.convertText(selectedText, direction);
		editor.replaceSelection(this.settings.appendMode
			? `${selectedText} (${converted})`
			: converted);
	}

	convertCurrentNoteOrSelection() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const editor = view.editor;
		const selectedText = editor.getSelection();
		const direction = this.settings.defaultDirection;

		if (selectedText) {
			this.convertSelection(editor, direction);
		} else {
			const fullText = editor.getValue();
			const converted = this.convertText(fullText, direction);
			editor.setValue(this.settings.appendMode
				? `${fullText}\n\n---\n\n${converted}`
				: converted);
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class PreviewModal extends Modal {
	constructor(app: App, private previewText: string, private onConfirm: () => void) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		const display = contentEl.createEl("div", { text: this.previewText });
		display.style.fontSize = "1.2em";
		display.style.marginBottom = "1em";

		const btn = contentEl.createEl("button", { text: "✅ Convert" });
		btn.onclick = () => {
			this.onConfirm();
			this.close();
		};
	}

	onClose() {
		this.contentEl.empty();
	}
}

class TransliterationSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: TransliterationPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Default Transliteration Direction")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("ITRANS_TO_DEV", "🆎 → 🕉 ITRANS → Devanagari")
					.addOption("DEV_TO_ITRANS", "🕉 → 🆎 Devanagari → ITRANS")
					.setValue(this.plugin.settings.defaultDirection)
					.onChange(async (value: any) => {
						this.plugin.settings.defaultDirection = value;
						await this.plugin.saveSettings();
						this.plugin.updateStatusBar();
					})
			);

		new Setting(containerEl)
			.setName("Append instead of Replace")
			.setDesc("If ON, conversion will be appended in parentheses instead of replacing.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.appendMode)
					.onChange(async (value) => {
						this.plugin.settings.appendMode = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
