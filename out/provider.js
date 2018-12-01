"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
// import { stateKeysList } from './extension';
class storeStateProvider {
    constructor(stateKeysList) {
        this.stateKeysList = stateKeysList;
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
        return this.stateKeysList.map(stateKey => {
            return new vscode.CompletionItem(stateKey, vscode.CompletionItemKind.Property);
        });
    }
}
exports.storeStateProvider = storeStateProvider;
// export const storeStateProvider = vscode.languages.registerCompletionItemProvider(
//   { language: 'vue' },
//   {
//
//   },
//   '.', // triggered whenever a '.' is being typed
// );
//# sourceMappingURL=provider.js.map