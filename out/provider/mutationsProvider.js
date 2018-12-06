"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
const parser_1 = require("@babel/parser");
function getPositionIndex(doc, position) {
    let docContent = doc.getText();
    let posIndex = 0;
    docContent.split('\n').some((line, index) => {
        posIndex += line.length + 1;
        return index >= position.line - 1;
    });
    posIndex += position.character;
    return posIndex;
}
function getCommitCursorInfo(commitAst, relativePos) {
    let program = commitAst.program;
    let exp = program.body[0];
    let callExp = exp.expression;
    let args = callExp.arguments;
    if (args.length === 1) {
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
    }
}
function getMutationsFromNameSpace(obj, namespace) {
    // debugger;
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
function getCursorInfo(mapGetterAst, relativePos) {
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
            // debugger;
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
class storeMutationsProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, token) {
        let lineContent = document.lineAt(position);
        let trimLineExpressions = lineContent.text;
        // TODO: getters没有对象的说法，只能通过['namespace/namespace/somegetters']的方式访问
        let reg = /((?:this\.)?(?:\$store\.)commit\(.*\))/;
        let regRes = reg.exec(trimLineExpressions);
        // debugger;
        if (!regRes) {
            return undefined;
        }
        let commitExpression = regRes[1];
        let commitAst = parser_1.parse(commitExpression);
        let posIndex = position.character;
        let cursorInfo = getCommitCursorInfo(commitAst, posIndex - regRes.index);
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
                getterCompletionList = getMutationsFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Property);
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
        let docContent = document.getText();
        // console.time('mapState');
        let reg = /\bmapMutations\(([\'\"](.*)[\'\"],\s*)?([\[\{])[\s\S]*?([\}\]]).*?\)/;
        let regRes = reg.exec(docContent);
        if (!regRes) {
            return undefined;
        }
        // console.timeEnd('mapState');
        let mapGetterAst = parser_1.parse(regRes[0]);
        let posIndex = getPositionIndex(document, position);
        let cursorInfo = getCursorInfo(mapGetterAst, posIndex - regRes.index);
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
                getterCompletionList = getMutationsFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Property);
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