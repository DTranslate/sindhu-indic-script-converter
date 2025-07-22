import { Plugin, PluginSettingTab, App, Setting, Editor, MarkdownView, Menu } from 'obsidian';
// @ts-ignore
import Sanscript from "@indic-transliteration/sanscript";

interface ITransPluginSettings {
	defaultDirection: 'itrans-to-devanagari' | 'devanagari-to-itrans';
	appendInstead: boolean;
}

const DEFAULT_SETTINGS: ITransPluginSettings = {
	defaultDirection: 'itrans-to-devanagari',
	appendInstead: false
};

export default class ITransConverterPlugin extends Plugin {
	settings: ITransPluginSettings;

	async onload() {
		await this.loadSettings();

		// Command: Convert ITRANS → Devanagari
		this.addCommand({
			id: 'convert-itrans-to-devanagari',
			name: 'Convert ITRANS to Devanagari',
			editorCallback: (editor) => this.convert(editor, 'itrans', 'devanagari')
		});

		// Command: Convert Devanagari → ITRANS
		this.addCommand({
			id: 'convert-devanagari-to-itrans',
			name: 'Convert Devanagari to ITRANS',
			editorCallback: (editor) => this.convert(editor, 'devanagari', 'itrans')
		});

		// Add context menu entries
		this.registerEvent(this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
			menu.addItem(item => {
				item.setTitle('Convert ITRANS → Devanagari')
					.setIcon('arrow-right')
					.onClick(() => this.convert(editor, 'itrans', 'devanagari'));
			});
			menu.addItem(item => {
				item.setTitle('Convert Devanagari → ITRANS')
					.setIcon('arrow-left')
					.onClick(() => this.convert(editor, 'devanagari', 'itrans'));
			});
		}));

		// Add settings tab
		this.addSettingTab(new ITransSettingTab(this.app, this));
	}

	async convert(editor: Editor, from: string, to: string) {
		const selected = editor.getSelection();
		if (!selected) return;

		const converted = Sanscript.t(selected, from, to);
		const result = this.settings.appendInstead ? `${selected} (*${converted}*)` : converted;

		editor.replaceSelection(result);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Settings UI
class ITransSettingTab extends PluginSettingTab {
	plugin: ITransConverterPlugin;

	constructor(app: App, plugin: ITransConverterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'ITRANS Converter Settings' });

		new Setting(containerEl)
			.setName('Default conversion direction')
			.setDesc('Used by other commands or future global conversion')
			.addDropdown(drop => drop
				.addOption('itrans-to-devanagari', 'ITRANS → Devanagari')
				.addOption('devanagari-to-itrans', 'Devanagari → ITRANS')
				.setValue(this.plugin.settings.defaultDirection)
				.onChange(async (value) => {
					this.plugin.settings.defaultDirection = value as any;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Append converted text instead of replacing')
			.setDesc('E.g., राम → राम (*rAma*)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.appendInstead)
				.onChange(async (value) => {
					this.plugin.settings.appendInstead = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
