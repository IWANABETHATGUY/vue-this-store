"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const completionUtil_1 = require("../util/completionUtil");
const mutationsProvider_1 = require("./mutationsProvider");
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
exports.getGettersFromNameSpace = getGettersFromNameSpace;
class StoreGettersProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
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
        let newModule = completionUtil_1.getModuleFromPath(this.storeInfo, pathArray);
        if (!newModule)
            return undefined;
        let getters = newModule.getters;
        return getters
            ? getters.map(getterInfo => {
                let getterCompletion = new vscode.CompletionItem(getterInfo.identifier, vscode.CompletionItemKind.Variable);
                getterCompletion.documentation = getterInfo.defination;
                getterCompletion.sortText = `1${getterInfo.identifier}`;
                return getterCompletion;
            })
            : [];
    }
}
exports.StoreGettersProvider = StoreGettersProvider;
class StoreMapGettersProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position) {
        console.time('mapState');
        let reg = /\bmapGetters\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
        let cursorInfo = mutationsProvider_1.getCursorInfoFromRegExp(reg, document, position, completionUtil_1.getMapGMACursorInfo, 'ast');
        if (cursorInfo) {
            let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .map(item => item.split('/').join('.'))
                .filter(item => item.length)
                .join('.');
            let getterCompletionList = [];
            let namespaceCompletionList = completionUtil_1.getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                NSCompletion.sortText = `0${nextNS}`;
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                getterCompletionList = getGettersFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.identifier, vscode.CompletionItemKind.Variable);
                    getterCompletion.documentation = getterInfo.defination;
                    getterCompletion.detail = 'getter';
                    getterCompletion.sortText = `1${getterInfo.identifier}`;
                    return getterCompletion;
                });
            }
            console.timeEnd('mapState');
            return getterCompletionList.concat(namespaceCompletionList);
        }
        return undefined;
    }
}
exports.StoreMapGettersProvider = StoreMapGettersProvider;
//# sourceMappingURL=gettersProvider.js.map