"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const util_1 = require("./util");
const parser_1 = require("@babel/parser");
function getGettersFromNameSpace(obj, namespace) {
    let getterInfoList = [];
    if (obj.namespace.split('.').join('/') === namespace) {
        getterInfoList.push(...obj.getters);
    }
    if (obj.modules) {
        Object.keys(obj.modules).forEach(key => {
            let module = obj.modules[key];
            getterInfoList.push(...getGettersFromNameSpace(module, namespace));
        });
    }
    return getterInfoList;
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
                relativePos >= item.start && relativePos < item.end;
            });
            // debugger;
        }
    }
    else if (args.length === 2) {
        let firstArg = args[0];
        let secondArg = args[1];
        if (firstArg.type === 'StringLiteral') {
            if (secondArg.type === 'ArrayExpression') {
                let cursorAtExp = secondArg.elements.filter(item => {
                    return relativePos >= item.start && relativePos < item.end;
                })[0];
                // debugger;
                if (cursorAtExp) {
                    return {
                        namespaced: true,
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
        // TODO: getters没有对象的说法，只能通过['namespace/namespace/somegetters']的方式访问
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
                let stateCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Field);
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
class storeMapGettersProvider {
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
        let reg = /\bmapGetters\(([\'\"](.*)[\'\"],\s*)?([\[\{])[\s\S]*?([\}\]]).*?\)/;
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
        let mapGetterAst = parser_1.parse(regRes[0]);
        let cursorInfo = getCursorInfo(mapGetterAst, posIndex - regRes.index);
        if (cursorInfo) {
            // debugger;
            return getGettersFromNameSpace(this.storeInfo, [cursorInfo.namespace, cursorInfo.secondNameSpace]
                .filter(item => item.length)
                .join('.')).map(getterInfo => {
                let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Property);
                getterCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
                return getterCompletion;
            });
        }
        // if (
        //   posIndex >= regRes.index + 10 + namespaceGroup.length &&
        //   posIndex < regRes.index + regRes[0].length - 2
        // ) {
        // return allGettersInfo.map(getterInfo => {
        //   let getterCompletion = new vscode.CompletionItem(
        //     getterInfo.rowKey,
        //     vscode.CompletionItemKind.Property,
        //   );
        //   getterCompletion.documentation = new vscode.MarkdownString(
        //     '```' + getterInfo.defination + '```',
        //   );
        //   return getterCompletion;
        // });
        // }
        return undefined;
    }
}
exports.storeMapGettersProvider = storeMapGettersProvider;
//# sourceMappingURL=gettersProvider.js.map