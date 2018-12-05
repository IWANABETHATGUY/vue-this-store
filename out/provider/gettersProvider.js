"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
class storeGettersProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setGettersKeyList(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, token) {
        let linePrefix = document
            .lineAt(position)
            .text.substr(0, position.character);
        let trimLinePrefixExpressions = linePrefix.trim().split(' ');
        let lastPrefixExpression = trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
        let reg = /(?=return this\.)?(?=\$store\.)?getters\.(.*\.)?/;
        let regRes = reg.exec(lastPrefixExpression);
        if (!regRes) {
            return undefined;
        }
        let path = regRes[1];
        let pathArray = path
            ? path.split('.').filter(item => item.length > 0)
            : undefined;
        let newModule = util_1.getModuleFromPath(this.storeInfo, pathArray);
        if (!newModule)
            return undefined;
        let getters = newModule.getters;
        let modules = newModule.modules;
        return (getters
            ? getters.map(getterInfo => {
                let stateCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Property);
                stateCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
                return stateCompletion;
            })
            : []).concat(Object.keys(modules ? modules : {}).map(module => {
            let moduleCompletion = new vscode.CompletionItem(module, vscode.CompletionItemKind.Module);
            return moduleCompletion;
        }));
    }
}
exports.storeGettersProvider = storeGettersProvider;
class storeMapStateProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStateKeysList(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position) {
        let docContent = document.getText();
        let posIndex = 0;
        // console.time('mapState');
        let reg = /\bmapState\(([\[\{])[\s\S]*?([\}\]]).*?\)/;
        let regRes = reg.exec(docContent);
        if (!regRes) {
            return undefined;
        }
        docContent.split('\n').some((line, index) => {
            posIndex += line.length + 1;
            return index >= position.line - 1;
        });
        posIndex += position.character;
        // console.timeEnd('mapState');
        if (posIndex >= regRes.index + 10 &&
            posIndex < regRes.index + regRes[0].length - 2) {
            return this.storeInfo.state.map(stateInfo => {
                let stateCompletion = new vscode.CompletionItem(stateInfo.rowKey, vscode.CompletionItemKind.Value);
                stateCompletion.documentation = new vscode.MarkdownString('```' + stateInfo.defination + '```');
                return stateCompletion;
            });
        }
        return undefined;
    }
}
exports.storeMapStateProvider = storeMapStateProvider;
//# sourceMappingURL=gettersProvider.js.map