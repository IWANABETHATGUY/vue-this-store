"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
const mutationsProvider_1 = require("./mutationsProvider");
const traverse_1 = require("@babel/traverse");
const generator_1 = require("@babel/generator");
function getNextStateNamespace(obj, namespace) {
    let targetModule = namespace
        .split('.')
        .filter(item => item.length)
        .reduce((acc, cur) => {
        let modules = acc['modules'];
        return modules && modules[cur] ? modules[cur] : {};
    }, obj);
    if (targetModule.modules) {
        return Object.keys(targetModule.modules);
    }
    return [];
}
function getStateFromNameSpace(obj, namespace) {
    let targetModule = namespace
        .split('.')
        .filter(item => item.length)
        .reduce((acc, cur) => {
        let modules = acc['modules'];
        return modules && modules[cur] ? modules[cur] : {};
    }, obj);
    if (targetModule.state) {
        return targetModule.state;
    }
    return [];
}
function getStateCursorInfo(regExecArray, relativePos) {
    return {
        isNamespace: false,
        namespace: '',
        secondNameSpace: regExecArray[1]
            .split('.')
            .map(ns => ns.trim())
            .filter(ns => ns.length)
            .join('.'),
    };
}
function getMapStateCursorInfo(mapStateAst, relativePos) {
    let program = mapStateAst.program;
    let exp = program.body[0];
    let callExp = exp.expression;
    let args = callExp.arguments;
    if (args.length === 1) {
        let firstArg = args[0];
        if (firstArg.type === 'ArrayExpression') {
            let cursorAtExp = firstArg.elements.filter(item => {
                return relativePos >= item.start && relativePos < item.end;
            })[0];
            if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
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
            if (cursorAtExp) {
                return {
                    isNamespace: true,
                    namespace: firstArg.value,
                    secondNameSpace: '',
                };
            }
        }
        else if (firstArg.type === 'ObjectExpression') {
            return getObjectExpressionCursorInfo(mapStateAst, relativePos, firstArg);
        }
    }
    else if (args.length === 2) {
        let firstArg = args[0];
        let secondArg = args[1];
        if (firstArg.type === 'StringLiteral') {
            if (relativePos >= firstArg.start && relativePos < firstArg.end) {
                return {
                    isNamespace: true,
                    namespace: firstArg.value,
                    secondNameSpace: '',
                };
            }
            if (secondArg.type === 'ArrayExpression') {
                let cursorAtExp = secondArg.elements.filter(item => {
                    return relativePos >= item.start && relativePos < item.end;
                })[0];
                if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
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
            else if (secondArg.type === 'ObjectExpression') {
                return getObjectExpressionCursorInfo(mapStateAst, relativePos, secondArg, firstArg);
            }
        }
    }
    return null;
}
class storeStateProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, token, context) {
        let reg = /this\n?\s*\.\$store\n?\s*\.state((?:\n?\s*\.[\w\$]*)+)/g;
        let cursorInfo = mutationsProvider_1.getCursorInfoFromRegExp(reg, document, position, getStateCursorInfo, 'regexp');
        // debugger;
        if (cursorInfo) {
            let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .map(item => item.split('/').join('.'))
                .filter(item => item.length)
                .join('.');
            let getterCompletionList = [];
            let namespaceCompletionList = getNextStateNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                getterCompletionList = getStateFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
                    let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Variable);
                    getterCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
                    getterCompletion.detail = 'state';
                    return getterCompletion;
                });
            }
            return getterCompletionList.concat(namespaceCompletionList);
        }
    }
}
exports.storeStateProvider = storeStateProvider;
class storeMapStateProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, token, context) {
        console.time('mapState');
        let reg = /\bmapState\(([\'\"](.*)[\'\"](?:,\s*)?)?((\[[\s\S]*?\])|(\{[\s\S]*?\}))?\s*\)/g;
        let cursorInfo = mutationsProvider_1.getCursorInfoFromRegExp(reg, document, position, getMapStateCursorInfo, 'ast', context.triggerCharacter === '.');
        if (cursorInfo) {
            let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .map(item => item.split('/').join('.'))
                .filter(item => item.length)
                .join('.');
            let stateCompletionList = [];
            let namespaceCompletionList = util_1.getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                stateCompletionList = getStateFromNameSpace(this.storeInfo, fullNamespace).map(stateInfo => {
                    let stateCompletion = new vscode.CompletionItem(stateInfo.rowKey, vscode.CompletionItemKind.Variable);
                    stateCompletion.documentation = new vscode.MarkdownString('```' + stateInfo.defination + '```');
                    stateCompletion.detail = 'state';
                    return stateCompletion;
                });
            }
            console.timeEnd('mapState');
            return stateCompletionList.concat(namespaceCompletionList);
        }
        return undefined;
    }
}
exports.storeMapStateProvider = storeMapStateProvider;
function getObjectExpressionCursorInfo(mapStateAst, relativePos, arg, namespaceArg) {
    let triggerProperty = null;
    let cursorAtExp = arg.properties.filter(property => {
        let flag = (property.type === 'ObjectMethod' ||
            property.type === 'ObjectProperty') &&
            relativePos >= property.start &&
            relativePos <= property.end;
        if (flag) {
            triggerProperty = property;
        }
        return flag;
    })[0];
    if (cursorAtExp) {
        if (triggerProperty &&
            triggerProperty.type === 'ObjectMethod' &&
            triggerProperty.params.length === 0) {
            return null;
        }
        let retCursorInfo = {
            match: false,
            isNamespace: false,
            namespace: '',
            secondNameSpace: '',
        };
        traverse_1.default(mapStateAst, {
            Identifier(path) {
                let node = path.node;
                if (relativePos >= node.start && relativePos <= node.end) {
                    let cur = path;
                    while (cur.parent.type === 'MemberExpression') {
                        cur = cur.parentPath;
                    }
                    let file = generator_1.default(cur.node, {}).code;
                    let namespaceList = file.slice(0, -1).split('.');
                    if (namespaceList.length) {
                        switch (triggerProperty.type) {
                            case 'ObjectMethod':
                                if (triggerProperty.params[0].name ===
                                    namespaceList[0]) {
                                    retCursorInfo.match = true;
                                }
                                break;
                            case 'ObjectProperty':
                                switch (triggerProperty.value.type) {
                                    case 'ArrowFunctionExpression':
                                    case 'FunctionExpression':
                                        let functionExpression = triggerProperty.value;
                                        if (functionExpression.params[0].name ===
                                            namespaceList[0]) {
                                            retCursorInfo.match = true;
                                        }
                                }
                        }
                        if (retCursorInfo.match) {
                            retCursorInfo.secondNameSpace = namespaceList.slice(1).join('.');
                            if (namespaceArg) {
                                retCursorInfo.namespace = namespaceArg.value;
                            }
                        }
                        path.stop();
                    }
                }
            },
        });
        if (retCursorInfo.match) {
            return retCursorInfo;
        }
        return null;
    }
}
//# sourceMappingURL=stateProvider.js.map