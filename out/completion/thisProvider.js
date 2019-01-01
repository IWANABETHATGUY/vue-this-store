"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mutationsProvider_1 = require("./mutationsProvider");
const parser_1 = require("@babel/parser");
const generator_1 = require("@babel/generator");
const traverse_1 = require("@babel/traverse");
const vscode_1 = require("vscode");
const gettersProvider_1 = require("./gettersProvider");
const actionsProvider_1 = require("./actionsProvider");
const stateProvider_1 = require("./stateProvider");
/**
 * MGA means Mutations, Getters, Actions
 *
 * @param {string} mapContent
 * @returns {MapProperyInfo[]}
 */
function parseMapMGA(mapContent) {
    let mapMutationAst = parser_1.parse(mapContent);
    let astArguments = mapMutationAst.program.body[0].expression.arguments;
    let mapOrArray = astArguments.length === 1 ? astArguments[0] : astArguments[1];
    if (mapOrArray.type === 'ArrayExpression') {
        return mapOrArray.elements.map(element => {
            const value = element.value;
            return { key: value, secondNamespace: value };
        });
    }
    else if (mapOrArray.type === 'ObjectExpression') {
        let res = [];
        mapOrArray.properties.forEach(property => {
            let propertyAst = property;
            let key = propertyAst.key.name;
            let secondNamespace = propertyAst.value.value;
            res.push({ key, secondNamespace });
        });
        return res;
    }
}
function parseMapState(mapContent) {
    let mapMutationAst = parser_1.parse(mapContent);
    let astArguments = mapMutationAst.program.body[0].expression.arguments;
    let mapOrArray = astArguments.length === 1 ? astArguments[0] : astArguments[1];
    if (mapOrArray.type === 'ArrayExpression') {
        return mapOrArray.elements.map(element => {
            const value = element.value;
            return { key: value, secondNamespace: value };
        });
    }
    else if (mapOrArray.type === 'ObjectExpression') {
        let res = [];
        mapOrArray.properties.forEach(property => {
            let propertyInfo;
            if (property.type === 'ObjectMethod') {
                propertyInfo = getRowKAndSecondNameSpace(property);
            }
            else if (property.type === 'ObjectProperty') {
                if (property.value.type === 'StringLiteral') {
                    let key = property.key.name;
                    let secondNamespace = property.value.value;
                    propertyInfo = { key, secondNamespace };
                }
                else if (property.value.type === 'ArrowFunctionExpression') {
                    propertyInfo = getRowKAndSecondNameSpace(property);
                }
            }
            if (propertyInfo) {
                res.push(propertyInfo);
            }
        });
        return res;
    }
}
function getStateString(identifier) {
    let firstParamStringLiteral = '';
    if (identifier && identifier.type === 'Identifier') {
        firstParamStringLiteral = identifier.name;
    }
    return firstParamStringLiteral;
}
function getRowKAndSecondNameSpace(property) {
    let stateString;
    let key = property.key.name;
    if (property.type === 'ObjectMethod') {
        let firstParam = property.params[0];
        stateString = getStateString(firstParam);
        if (property.body && property.body.type === 'BlockStatement') {
            let retStmt = property.body.body.filter(baseNode => {
                return baseNode.type === 'ReturnStatement';
            })[0];
            if (retStmt && retStmt.type === 'ReturnStatement') {
                if (retStmt.argument.type === 'MemberExpression' &&
                    retStmt.argument.object.type === 'Identifier' &&
                    retStmt.argument.object.name === stateString) {
                    let secondNamespace;
                    switch (retStmt.argument.property.type) {
                        case 'StringLiteral':
                            secondNamespace = retStmt.argument.property.value;
                            break;
                        case 'Identifier':
                            secondNamespace = retStmt.argument.property.name;
                    }
                    return {
                        key,
                        secondNamespace,
                    };
                }
            }
        }
    }
    else {
        if (property.value.type === 'ArrowFunctionExpression') {
            let firstParam = property.value.params[0];
            stateString = getStateString(firstParam);
            if (!stateString)
                return null;
            let code = parser_1.parse(generator_1.default(property.value, {}).code);
            let ret = {
                key: '',
                secondNamespace: '',
            };
            traverse_1.default(code, {
                MemberExpression(path) {
                    let node = path.node;
                    if (node.object.type === 'Identifier' && node.object.name === stateString) {
                        ret.key = key;
                        ret.secondNamespace = node.property.name;
                        path.stop();
                    }
                },
            });
            if (ret.key === key) {
                return ret;
            }
        }
    }
    return null;
}
function getRegExpMatchList(document, reg) {
    let docContent = document.getText();
    let match = null;
    let matchList = [];
    while ((match = reg.exec(docContent))) {
        matchList.push(match);
    }
    return matchList;
}
exports.getRegExpMatchList = getRegExpMatchList;
class thisProvider {
    constructor(storeInfo, thisCompletionList) {
        this._storeInfo = storeInfo;
        this._thisCompletionList = thisCompletionList;
    }
    setStoreInfo(newStoreInfo) {
        this._storeInfo = newStoreInfo;
    }
    setThisCompletionList(newCompletionList) {
        this._thisCompletionList = newCompletionList;
    }
    getNewThisCompletionList(document) {
        console.time('thisCompletion');
        let completionList = [];
        const mutationRegExp = /\bmapMutations\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
        const actionRegExp = /\bmapActions\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
        const getterRegExp = /\bmapGetters\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
        const stateRegExp = /\bmapState\(([\'\"](.*)[\'\"](?:,\s*)?)?((\[[\s\S]*?\])|(\{[\s\S]*?\}))?\s*\)/g;
        completionList = completionList.concat(getThisXXXFromNameSpace(document, this._storeInfo, mutationRegExp, parseMapMGA, mutationsProvider_1.getMutationsFromNameSpace, 'mutation'));
        completionList = completionList.concat(getThisXXXFromNameSpace(document, this._storeInfo, getterRegExp, parseMapMGA, gettersProvider_1.getGettersFromNameSpace, 'getter'));
        completionList = completionList.concat(getThisXXXFromNameSpace(document, this._storeInfo, actionRegExp, parseMapMGA, actionsProvider_1.getActionsFromNameSpace, 'action'));
        completionList = completionList.concat(getThisXXXFromNameSpace(document, this._storeInfo, stateRegExp, parseMapState, stateProvider_1.getStateFromNameSpace, 'state'));
        console.timeEnd('thisCompletion');
        return completionList;
    }
    provideCompletionItems(document, position) {
        let linePrefix = document.lineAt(position).text.substr(0, position.character);
        let trimLinePrefixExpressions = linePrefix.trim().split(/\s+/);
        let lastPrefixExpression = trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
        let reg = /this/;
        let regRes = reg.exec(lastPrefixExpression);
        if (!regRes) {
            return undefined;
        }
        return this._thisCompletionList.map((completion) => {
            let thisCompletion = new vscode_1.CompletionItem(completion.computedKey ? completion.computedKey : '');
            switch (completion.type) {
                case 'mutation':
                case 'action':
                    thisCompletion.kind = vscode_1.CompletionItemKind.Method;
                    thisCompletion.documentation = completion.funcDeclarator
                        ? completion.funcDeclarator
                        : completion.defination
                            ? new vscode_1.MarkdownString('```' + completion.defination + '```')
                            : '';
                    break;
                default:
                    thisCompletion.kind = vscode_1.CompletionItemKind.Variable;
                    thisCompletion.documentation = completion.defination
                        ? new vscode_1.MarkdownString('```' + completion.defination + '```')
                        : '';
            }
            thisCompletion.detail = completion.type;
            return thisCompletion;
        });
    }
}
exports.thisProvider = thisProvider;
function getThisXXXFromNameSpace(document, storeInfo, reg, parseMapFunction, getMapFromNameSpace, type) {
    const completionList = [];
    let matchList = getRegExpMatchList(document, reg);
    matchList.forEach(match => {
        let [content, _, namespace] = match;
        namespace = namespace ? namespace : '';
        let mutationList = getMapFromNameSpace(storeInfo, namespace.split('/').join('.'));
        // debugger;
        let mutationMap = mutationList.reduce((acc, cur) => {
            acc[cur.rowKey] = {
                defination: cur.defination,
            };
            if (type === 'mutation' || type === 'action') {
                acc[cur.rowKey]['paramList'] = cur.paramList;
                acc[cur.rowKey]['funcDeclarator'] = cur.funcDeclarator;
            }
            return acc;
        }, {});
        let mapXXXInfoList = parseMapFunction(content);
        mapXXXInfoList.forEach((mutationInfo) => {
            let mutationDefinationInfo = mutationMap[mutationInfo.secondNamespace];
            if (mutationDefinationInfo) {
                completionList.push(Object.assign({ computedKey: mutationInfo.key }, mutationDefinationInfo, { type }));
            }
        });
    });
    return completionList;
}
//# sourceMappingURL=thisProvider.js.map