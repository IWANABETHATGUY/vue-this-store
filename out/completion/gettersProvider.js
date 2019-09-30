"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const completionUtil_1 = require("../util/completionUtil");
const mutationsProvider_1 = require("./mutationsProvider");
const vscode_1 = require("vscode");
const stateProvider_1 = require("./stateProvider");
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
    provideCompletionItems(document, position) {
        let reg = /this\n?\s*\.\$store\n?\s*\.getters.\s*((?:[\w\$]+(?:\s*\.)?)+)/g;
        let cursorInfo = mutationsProvider_1.getCursorInfoFromRegExp(reg, document, position, stateProvider_1.getStateCursorInfo, 'regexp');
        // debugger
        if (cursorInfo) {
            let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .map(item => item.split('/').join('.'))
                .filter(item => item.length)
                .join('.');
            let getterCompletionList = [];
            let namespaceCompletionList = completionUtil_1.getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletionList = new vscode_1.CompletionItem(nextNS, vscode_1.CompletionItemKind.Module);
                NSCompletionList.detail = 'module';
                NSCompletionList.sortText = `0${nextNS}`;
                return NSCompletionList;
            });
            if (!cursorInfo.isNamespace) {
                getterCompletionList = getGettersFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode_1.CompletionItem(getterInfo.identifier, vscode_1.CompletionItemKind.Variable);
                    getterCompletion.sortText = `1${getterInfo.identifier}`;
                    getterCompletion.documentation = getterInfo.defination;
                    getterCompletion.detail = 'state';
                    return getterCompletion;
                });
            }
            // debugger
            return getterCompletionList.concat(namespaceCompletionList);
        }
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