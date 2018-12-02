"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
// import { stateKeysList } from './extension';
class storeStateProvider {
    constructor(stateInfoList) {
        this.stateKeysList = stateInfoList;
    }
    setStateKeysList(newList) {
        this.stateKeysList = newList;
    }
    provideCompletionItems(document, position, token) {
        let linePrefix = document
            .lineAt(position)
            .text.substr(0, position.character);
        let trimLinePrefix = linePrefix.trim();
        let reg = /(return this)?(.$store)?state/;
        if (!reg.test(trimLinePrefix)) {
            return undefined;
        }
        return this.stateKeysList.map(stateInfo => {
            let stateCompletion = new vscode.CompletionItem(stateInfo.stateKey, vscode.CompletionItemKind.Property);
            stateCompletion.documentation = new vscode.MarkdownString(`${stateInfo.defination}`);
            return stateCompletion;
        });
    }
}
exports.storeStateProvider = storeStateProvider;
//# sourceMappingURL=provider.js.map