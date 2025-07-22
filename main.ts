import { Plugin, PluginSettingTab, App, Setting, Editor, MarkdownView, Menu } from 'obsidian';
// @ts-ignore
import Sanscript from "@indic-transliteration/sanscript";

interface ITransPluginSettings {
	defaultDirection: 'itrans-to-devanagari' | 'devanagari-to-itrans';
}

const DEFAULT_SETTINGS: ITransPluginSettings = {
	defaultDirection: 'itrans-to-devanagari',
};

export default class ITransConverterPlugin extends Plugin {
	settings: ITransPluginSettings;

	async onload() {
		await this.loadSettings();

		// Command: Convert selected (ITRANS → DEV)
		this.addCommand({
			id: 'convert-itrans-to-devanagari',
			name: 'ITRANS → Devanagari',
			editorCallback: (editor) => this.convert(editor, 'itrans', 'devanagari')
		});

		// Command: Convert selected (DEV → ITRANS)
		this.addCommand({
			id: 'convert-devanagari-to-itrans',
			name: 'Devanagari → ITRANS',
			editorCallback: (editor) => this.convert(editor, 'devanagari', 'itrans')
		});

		// Command: Convert entire note using default direction
		this.addCommand({
			id: 'convert-entire-note-default-direction',
			name: 'Convert Entire Note (Default Direction)',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) return;

				const editor = view.editor;
				const fullText = editor.getValue();

				const [from, to] = this.settings.defaultDirection === 'itrans-to-devanagari'
					? ['itrans', 'devanagari']
					: ['devanagari', 'itrans'];

				const converted = Sanscript.t(fullText, from, to);
				const result = `${fullText} (*${converted}*)`;

				editor.setValue(result);
			}
		});

		// Right-click editor context menu
		this.registerEvent(this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
			menu.addItem(item => {
				item.setTitle('ITRANS → Devanagari')
					.setIcon('arrow-right')
					.onClick(() => this.convert(editor, 'itrans', 'devanagari'));
			});
			menu.addItem(item => {
				item.setTitle('Devanagari → ITRANS')
					.setIcon('arrow-left')
					.onClick(() => this.convert(editor, 'devanagari', 'itrans'));
			});
		}));

		// Status bar icon with shift-click direction toggle
		const statusBarItem = this.addStatusBarItem();
		const updateStatus = () => {
			const isItransToDev = this.settings.defaultDirection === 'itrans-to-devanagari';
			const icon = isItransToDev ? '🆎' : '🕉️';
			const tooltip = isItransToDev ? 'ITRANS → Devanagari' : 'Devanagari → ITRANS';

			statusBarItem.setText(icon);
			statusBarItem.setAttr('aria-label', tooltip);
			statusBarItem.setAttr('title', tooltip);
		};

		statusBarItem.addClass('itrans-status-bar');
		statusBarItem.onClickEvent((evt: MouseEvent) => {
			if (evt.shiftKey) {
				this.settings.defaultDirection =
					this.settings.defaultDirection === 'itrans-to-devanagari'
						? 'devanagari-to-itrans'
						: 'itrans-to-devanagari';
				this.saveSettings();
				updateStatus();
			}
		});
		updateStatus();

		this.addSettingTab(new ITransSettingTab(this.app, this));
	}

	async convert(editor: Editor, from: string, to: string) {
		const selected = editor.getSelection();
		if (!selected) return;

		const converted = Sanscript.t(selected, from, to);
		const result = `${selected} (*${converted}*)`;
		editor.replaceSelection(result);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

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
			.setDesc('Used for full note conversion and status bar icon')
			.addDropdown(drop => drop
				.addOption('itrans-to-devanagari', 'ITRANS → Devanagari')
				.addOption('devanagari-to-itrans', 'Devanagari → ITRANS')
				.setValue(this.plugin.settings.defaultDirection)
				.onChange(async (value) => {
					this.plugin.settings.defaultDirection = value as any;
					await this.plugin.saveSettings();
				})
			);
	}
}
