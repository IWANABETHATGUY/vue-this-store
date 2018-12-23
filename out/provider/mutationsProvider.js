"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
const parser_1 = require("@babel/parser");
/**
 *
 *
 * @export
 * @param {RegExp} reg
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 * @param {Function} parseMatchFn
 * @param {CursorType} type
 * @param {boolean} [needToCut=false] 判断是否需要将尾部触发字符切断。
 * @returns
 */
function getCursorInfoFromRegExp(reg, document, position, parseMatchFn, type, needToCut = false) {
    let docContent = document.getText();
    let cursorInfo = null;
    let match = null;
    let matchList = [];
    while ((match = reg.exec(docContent))) {
        matchList.push(match);
    }
    if (!matchList.length) {
        return null;
    }
    let posIndex = util_1.getPositionIndex(document, position);
    let commitExpression = util_1.whichCommit(matchList, posIndex);
    if (!commitExpression)
        return null;
    if (type === 'ast') {
        if (needToCut) {
            commitExpression[0] = commitExpression[0].replace(/(\b\w+(?:\.\w+)*)(?:\.)([^\w])/g, ($, $1, $2) => {
                return $1 + 'ß' + $2;
            });
        }
        let commitAst = parser_1.parse(commitExpression[0]);
        // debugger;
        cursorInfo = parseMatchFn(commitAst, posIndex - commitExpression.index);
    }
    else {
        cursorInfo = parseMatchFn(commitExpression, posIndex - commitExpression.index);
    }
    return cursorInfo;
}
exports.getCursorInfoFromRegExp = getCursorInfoFromRegExp;
function getCommitCursorInfo(commitAst, relativePos) {
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
                secondNameSpace: '',
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
                    secondNameSpace: '',
                };
            }
        }
    }
    return null;
}
function getMutationsFromNameSpace(obj, namespace) {
    let mutationInfoList = [];
    if (obj.namespace === namespace && obj.mutations) {
        mutationInfoList.push(...obj.mutations);
    }
    if (obj.modules) {
        Object.keys(obj.modules).forEach(key => {
            let curModule = obj.modules[key];
            mutationInfoList.push(...getMutationsFromNameSpace(curModule, namespace));
        });
    }
    return mutationInfoList;
}
class storeMutationsProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, token) {
        let reg = /((?:this\.)?(?:\$store\.)\n?commit\([\s\S]*?\))/g;
        let cursorInfo = getCursorInfoFromRegExp(reg, document, position, getCommitCursorInfo, 'ast');
        if (cursorInfo) {
            let fullNamespace = cursorInfo.namespace;
            let getterCompletionList = [];
            let namespaceCompletionList = util_1.getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                getterCompletionList = getMutationsFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Method);
                    getterCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
                    getterCompletion.detail = 'mutation';
                    return getterCompletion;
                });
            }
            return getterCompletionList.concat(namespaceCompletionList);
        }
    }
}
exports.storeMutationsProvider = storeMutationsProvider;
class storeMapMutationsProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position) {
        let reg = 33;
        let cursorInfo = getCursorInfoFromRegExp(reg, document, position, util_1.getMapGMACursorInfo, 'ast');
        if (cursorInfo) {
            let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .map(item => item.split('/').join('.'))
                .filter(item => item.length)
                .join('.');
            let getterCompletionList = [];
            let namespaceCompletionList = util_1.getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                getterCompletionList = getMutationsFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Method);
                    getterCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
                    getterCompletion.detail = 'mutation';
                    return getterCompletion;
                });
            }
            return getterCompletionList.concat(namespaceCompletionList);
        }
        return undefined;
    }
}
exports.storeMapMutationsProvider = storeMapMutationsProvider;
//# sourceMappingURL=mutationsProvider.js.map