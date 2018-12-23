"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function getGettersFromNameSpace(obj, namespace) {
    let getterInfoList = [];
    if (obj.namespace === namespace && obj.getters) {
        getterInfoList.push(...obj.getters);
    }
    if (obj.modules) {
        Object.keys(obj.modules).forEach(key => {
            let curModule = obj.modules[key];
            getterInfoList.push(...getGettersFromNameSpace(curModule, namespace));
        });
    }
    return getterInfoList;
}
class storeGettersProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    setThisCompletionMap(newThisComplationMap) {
        this.thisCompletionMap = newThisComplationMap;
    }
    provideCompletionItems(document, position, token) {
        let linePrefix = document
            .lineAt(position)
            .text.substr(0, position.character);
        let trimLinePrefixExpressions = linePrefix.trim().split(' ');
        let lastPrefixExpression = trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
        let reg = /this/;
        let regRes = reg.exec(lastPrefixExpression);
        if (!regRes) {
            return undefined;
        }
        const thisCompletionMap = this.thisCompletionMap;
        return Array.from(thisCompletionMap.keys()).map(key => {
            let value = thisCompletionMap.get(key);
            let thisCompletion = new vscode.CompletionItem(value.rowKey ? value.rowKey : '', vscode.CompletionItemKind.Variable);
            thisCompletion.documentation = new vscode.MarkdownString('```' + value.defination ? value.defination : '' + '```');
            return thisCompletion;
        });
        // ? getters.map(getterInfo => {
        //     let stateCompletion = new vscode.CompletionItem(
        //       getterInfo.rowKey,
        //       vscode.CompletionItemKind.Variable,
        //     );
        //     stateCompletion.documentation = new vscode.MarkdownString(
        //       '```' + getterInfo.defination + '```',
        //     );
        //     return stateCompletion;
        //   })
        // : [];
    }
}
exports.storeGettersProvider = storeGettersProvider;
//# sourceMappingURL=thisProvider.js.map