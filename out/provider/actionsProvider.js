"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
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
    // debugger;
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
function getmapActionsCursorInfo(mapGetterAst, relativePos) {
    let program = mapGetterAst.program;
    let exp = program.body[0];
    let callExp = exp.expression;
    let args = callExp.arguments;
    if (args.length === 1) {
        let firstArg = args[0];
        if (firstArg.type === 'ArrayExpression') {
            let cursorAtExp = firstArg.elements.filter(item => {
                return relativePos >= item.start && relativePos < item.end;
            })[0];
            if (cursorAtExp) {
                return {
                    isNamespace: false,
                    namespace: '',
                    secondNameSpace: cursorAtExp.value
                        .split('/')
                        .filter(ns => ns.length)
                        .join('.'),
                };
            }
        }
        else if (firstArg.type === 'StringLiteral') {
            let cursorAtExp = relativePos >= firstArg.start && relativePos < firstArg.end;
            // debugger;
            if (cursorAtExp) {
                return {
                    isNamespace: true,
                    namespace: firstArg.value,
                    secondNameSpace: '',
                };
            }
        }
    }
    else if (args.length === 2) {
        let firstArg = args[0];
        let secondArg = args[1];
        if (firstArg.type === 'StringLiteral') {
            if (secondArg.type === 'ArrayExpression') {
                if (relativePos >= firstArg.start && relativePos < firstArg.end) {
                    return {
                        isNamespace: true,
                        namespace: firstArg.value,
                        secondNameSpace: '',
                    };
                }
                let cursorAtExp = secondArg.elements.filter(item => {
                    return relativePos >= item.start && relativePos < item.end;
                })[0];
                if (cursorAtExp) {
                    return {
                        isNamespace: false,
                        namespace: firstArg.value,
                        secondNameSpace: cursorAtExp.value
                            .split('/')
                            .filter(ns => ns.length)
                            .join('.'),
                    };
                }
            }
        }
    }
    return null;
}
class storeActionsProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, token) {
        let docContent = document.getText();
        //TODO: export default 也需要判断是否export default的是一个已经顶一个过的变量，而不是一个obj字面量
        let reg = /((?:this\.)?(?:\$store\.)\n?dispatch\([\s\S]*?\))/g;
        let match = null;
        let matchList = [];
        // debugger;
        while ((match = reg.exec(docContent))) {
            matchList.push(match);
        }
        // debugger;
        if (!matchList.length) {
            return undefined;
        }
        let posIndex = util_1.getPositionIndex(document, position);
        let commitExpression = util_1.whichCommit(matchList, posIndex);
        if (!commitExpression)
            return undefined;
        let commitAst = parser_1.parse(commitExpression[0]);
        let cursorInfo = getDispatchCursorInfo(commitAst, posIndex - commitExpression.index);
        if (cursorInfo) {
            // debugger;
            let fullNamespace = cursorInfo.namespace;
            let getterCompletionList = [];
            let namespaceCompletionList = util_1.getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                getterCompletionList = getActionsFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Property);
                    getterCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
                    getterCompletion.detail = 'action';
                    return getterCompletion;
                });
            }
            return getterCompletionList.concat(namespaceCompletionList);
        }
    }
}
exports.storeActionsProvider = storeActionsProvider;
class storeMapActionsProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position) {
        let docContent = document.getText();
        // console.time('mapState');
        let reg = /\bmapActions\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
        let cursorInfo = mutationsProvider_1.getCursorInfoFromRegExp(reg, document, position, getmapActionsCursorInfo);
        if (cursorInfo) {
            // debugger;
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
                getterCompletionList = getActionsFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Property);
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
exports.storeMapActionsProvider = storeMapActionsProvider;
//# sourceMappingURL=actionsProvider.js.map