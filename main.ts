import { Plugin, Editor, MarkdownView } from 'obsidian';
// @ts-ignore
import Sanscript from "@indic-transliteration/sanscript";

export default class ITransConverterPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'convert-itrans-to-devanagari',
			name: 'Convert ITRANS to Devanagari',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selected = editor.getSelection();
				if (!selected) return;

				const converted = Sanscript.t(selected, 'itrans', 'devanagari');
				editor.replaceSelection(converted);
			}
		});
	}
}
