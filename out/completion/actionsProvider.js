"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const completionUtil_1 = require("../util/completionUtil");
const parser_1 = require("@babel/parser");
const mutationsProvider_1 = require("./mutationsProvider");
function getDispatchCursorInfo(commitAst, relativePos) {
    let program = commitAst.program;
    let exp = program.body[0];
    let callExp = exp.expression;
    let args = callExp.arguments;
    let firstArg = args[0];
    if (firstArg.type === 'StringLiteral') {
        if (relativePos >= firstArg.start && relativePos < firstArg.end) {
            return {
                isNamespace: false,
                namespace: firstArg.value
                    .split('/')
                    .filter(ns => ns.length)
                    .join('.'),
            };
        }
    }
    else if (firstArg.type === 'ObjectExpression') {
        let typeProperty = firstArg.properties.filter((property) => {
            let key = property.key;
            return key.name === 'type';
        })[0];
        if (typeProperty) {
            let value = typeProperty
                .value;
            if (relativePos >= value.start && relativePos < value.end) {
                return {
                    isNamespace: false,
                    namespace: value.value
                        .split('/')
                        .filter(ns => ns.length)
                        .join('.'),
                };
            }
        }
    }
    return null;
}
function getActionsFromNameSpace(obj, namespace) {
    let actionInfoList = [];
    if (obj.namespace === namespace && obj.actions) {
        actionInfoList.push(...obj.actions);
    }
    if (obj.modules) {
        Object.keys(obj.modules).forEach(key => {
            let curModule = obj.modules[key];
            actionInfoList.push(...getActionsFromNameSpace(curModule, namespace));
        });
    }
    return actionInfoList;
}
exports.getActionsFromNameSpace = getActionsFromNameSpace;
class StoreActionsProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, token) {
        let docContent = document.getText();
        //TODO: export default 也需要判断是否export default的是一个已经定义过的变量，而不是一个obj字面量
        let reg = /((?:this\.)?(?:\$store\.)\n?dispatch\([\s\S]*?\))/g;
        let match = null;
        let matchList = [];
        while ((match = reg.exec(docContent))) {
            matchList.push(match);
        }
        if (!matchList.length) {
            return undefined;
        }
        let posIndex = completionUtil_1.getPositionIndex(document, position);
        let commitExpression = completionUtil_1.whichCommit(matchList, posIndex);
        if (!commitExpression)
            return undefined;
        let commitAst = parser_1.parse(commitExpression[0]);
        let cursorInfo = getDispatchCursorInfo(commitAst, posIndex - commitExpression.index);
        if (cursorInfo) {
            let fullNamespace = cursorInfo.namespace;
            let actionCompletionList = [];
            let namespaceCompletionList = completionUtil_1.getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                NSCompletion.sortText = `0${nextNS}`;
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                actionCompletionList = getActionsFromNameSpace(this.storeInfo, fullNamespace).map(actionInfo => {
                    let actionCompletion = new vscode.CompletionItem(actionInfo.rowKey, vscode.CompletionItemKind.Method);
                    actionCompletion.documentation = new vscode.MarkdownString('```' + actionInfo.defination + '```');
                    actionCompletion.detail = 'action';
                    actionCompletion.sortText = `1${actionInfo.rowKey}`;
                    return actionCompletion;
                });
            }
            return actionCompletionList.concat(namespaceCompletionList);
        }
    }
}
exports.StoreActionsProvider = StoreActionsProvider;
class StoreMapActionsProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position) {
        let reg = /\bmapActions\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
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
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                getterCompletionList = getActionsFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Method);
                    getterCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
                    getterCompletion.detail = 'action';
                    return getterCompletion;
                });
            }
            return getterCompletionList.concat(namespaceCompletionList);
        }
        return undefined;
    }
}
exports.StoreMapActionsProvider = StoreMapActionsProvider;
//# sourceMappingURL=actionsProvider.js.map