"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const mutationsProvider_1 = require("./mutationsProvider");
const types_1 = require("@babel/types");
const traverse_1 = require("@babel/traverse");
const generator_1 = require("@babel/generator");
class StoreStateProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position) {
        let reg = /\b(?:this\s*\.\$store\s*\.)?state\.\s*((?:[\w\$]+(?:\s*\.)?)*)/g;
        // debugger
        let cursorInfo = mutationsProvider_1.getCursorInfoFromRegExp(reg, document, position, getStateCursorInfo, 'regexp');
        if (cursorInfo) {
            let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .map(item => item.split('/').join('.'))
                .filter(Boolean)
                .join('.');
            let stateCompletionList = [];
            let namespaceCompletionList = getNextStateNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode_1.CompletionItem(nextNS, vscode_1.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                NSCompletion.sortText = `0${nextNS}`;
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                stateCompletionList = getStateFromNameSpace(this.storeInfo, fullNamespace).map(stateInfo => {
                    let stateCompletion = new vscode_1.CompletionItem(stateInfo.identifier, vscode_1.CompletionItemKind.Variable);
                    stateCompletion.sortText = `1${stateInfo.identifier}`;
                    stateCompletion.documentation = stateInfo.defination;
                    stateCompletion.detail = 'state';
                    return stateCompletion;
                });
            }
            // debugger
            return stateCompletionList.concat(namespaceCompletionList);
        }
    }
}
exports.StoreStateProvider = StoreStateProvider;
class storeMapStateProvider {
    constructor(storeInfo) {
        this.storeInfo = storeInfo;
    }
    setStoreInfo(newStoreInfo) {
        this.storeInfo = newStoreInfo;
    }
    provideCompletionItems(document, position, _, context) {
        console.time('mapState');
        let reg = /\bmapState\(([\'\"](.*)[\'\"](?:,\s*)?)?((\[[\s\S]*?\])|(\{[\s\S]*?\}))?\s*\)/g;
        let cursorInfo = mutationsProvider_1.getCursorInfoFromRegExp(reg, document, position, getMapStateCursorInfo, 'ast', context.triggerCharacter === '.');
        if (cursorInfo) {
            let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .map(item => item.split('/').join('.'))
                .filter(item => item.length)
                .join('.');
            let stateCompletionList = [];
            let namespaceCompletionList = getNextStateNamespace(this.storeInfo, fullNamespace).map(nextNS => {
                let NSCompletion = new vscode_1.CompletionItem(nextNS, vscode_1.CompletionItemKind.Module);
                NSCompletion.detail = 'module';
                NSCompletion.sortText = `0${nextNS}`;
                return NSCompletion;
            });
            if (!cursorInfo.isNamespace) {
                stateCompletionList = getStateFromNameSpace(this.storeInfo, fullNamespace).map(stateInfo => {
                    let stateCompletion = new vscode_1.CompletionItem(stateInfo.identifier, vscode_1.CompletionItemKind.Variable);
                    stateCompletion.documentation = stateInfo.defination;
                    stateCompletion.detail = 'state';
                    stateCompletion.sortText = `1${stateInfo.identifier}`;
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
exports.getStateFromNameSpace = getStateFromNameSpace;
function getStateCursorInfo(regExecArray) {
    const secondNameSpaceList = regExecArray[1].split('.').map(ns => ns.trim());
    return {
        isNamespace: false,
        namespace: '',
        secondNameSpace: secondNameSpaceList
            .slice(0, secondNameSpaceList.length - 1)
            .join('.'),
    };
}
exports.getStateCursorInfo = getStateCursorInfo;
function getMapStateCursorInfo(mapStateAst, relativePos, needLastNamespace = false) {
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
                    secondNameSpace: getSecondMapNamespace(cursorAtExp.value, needLastNamespace),
                };
            }
        }
        else if (firstArg.type === 'StringLiteral') {
            let cursorAtExp = relativePos >= firstArg.start && relativePos < firstArg.end;
            if (cursorAtExp) {
                return {
                    isNamespace: true,
                    namespace: getSecondMapNamespace(firstArg.value, needLastNamespace),
                    secondNameSpace: '',
                };
            }
        }
        else if (firstArg.type === 'ObjectExpression') {
            return getObjectExpressionCursorInfo(mapStateAst, relativePos, firstArg, needLastNamespace);
        }
    }
    else if (args.length === 2) {
        let firstArg = args[0];
        let secondArg = args[1];
        if (firstArg.type === 'StringLiteral') {
            if (relativePos >= firstArg.start && relativePos < firstArg.end) {
                return {
                    isNamespace: true,
                    namespace: getSecondMapNamespace(firstArg.value, needLastNamespace),
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
                        secondNameSpace: getSecondMapNamespace(cursorAtExp.value, needLastNamespace),
                    };
                }
            }
            else if (secondArg.type === 'ObjectExpression') {
                return getObjectExpressionCursorInfo(mapStateAst, relativePos, secondArg, needLastNamespace, firstArg);
            }
        }
    }
    return null;
}
exports.getMapStateCursorInfo = getMapStateCursorInfo;
function getSecondMapNamespace(value, needLastNamespace = false) {
    const secondNameSpaceList = value.split('/').map(ns => ns.trim());
    const len = secondNameSpaceList.length - +!needLastNamespace;
    return secondNameSpaceList.slice(0, len).join('.');
}
exports.getSecondMapNamespace = getSecondMapNamespace;
function getObjectExpressionCursorInfo(mapStateAst, relativePos, arg, needLastNamespace, namespaceArg) {
    let triggerProperty = null;
    arg.properties.some(property => {
        let flag = (property.type === 'ObjectMethod' ||
            property.type === 'ObjectProperty') &&
            relativePos >= property.start &&
            relativePos <= property.end;
        if (flag) {
            triggerProperty = property;
            return true;
        }
    });
    if (triggerProperty) {
        let retCursorInfo = {
            match: false,
            isNamespace: false,
            namespace: '',
            secondNameSpace: '',
        };
        if (types_1.isObjectMethod(triggerProperty) ||
            types_1.isArrowFunctionExpression(triggerProperty.value) ||
            types_1.isFunctionExpression(triggerProperty.value)) {
            FunctionLikeCursorInfo(mapStateAst, relativePos, triggerProperty, retCursorInfo, namespaceArg, !needLastNamespace);
        }
        else {
            if (types_1.isStringLiteral(triggerProperty.value)) {
                const secondNamespaceList = triggerProperty.value.value.split('/');
                retCursorInfo.secondNameSpace = secondNamespaceList.slice(0, secondNamespaceList.length - Number(!needLastNamespace)).join('.');
                retCursorInfo.match = true;
            }
            if (namespaceArg) {
                retCursorInfo.namespace = namespaceArg.value;
            }
        }
        if (retCursorInfo.match) {
            return retCursorInfo;
        }
        return null;
    }
}
function FunctionLikeCursorInfo(mapStateAst, relativePos, triggerProperty, retCursorInfo, namespaceArg, needCut = true) {
    traverse_1.default(mapStateAst, {
        Identifier(path) {
            let node = path.node;
            if (relativePos >= node.start && relativePos <= node.end) {
                let cur = path;
                while (cur.parent.type === 'MemberExpression') {
                    cur = cur.parentPath;
                }
                let file = generator_1.default(cur.node, {}).code;
                let namespaceList = file.slice(0, file.length - Number(needCut)).split('.');
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
                                    break;
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
}
//# sourceMappingURL=stateProvider.js.map