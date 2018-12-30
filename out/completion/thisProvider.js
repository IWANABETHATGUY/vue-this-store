"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const mutationsProvider_1 = require("./mutationsProvider");
const parser_1 = require("@babel/parser");
function getParamsFromAst(content, FunctionAst) {
    let params = FunctionAst.params;
    return params.map(param => {
        return content.slice(param.start, param.end);
    });
}
function parseMapMutations(mapMutationsContent) {
    let mapMutationAst = parser_1.parse(mapMutationsContent);
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
        const reg = /\bmapMutations\((?:[\'\"](.*?)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
        let matchList = getRegExpMatchList(document, reg);
        matchList.forEach(match => {
            let [content, namespace] = match;
            let mutationList = mutationsProvider_1.getMutationsFromNameSpace(this._storeInfo, namespace.split('/').join('.'));
            // debugger;
            let mutationMap = mutationList.reduce((acc, cur) => {
                acc[cur.rowKey] = {
                    defination: cur.defination,
                    paramList: cur.paramList,
                    funcDeclarator: cur.funcDeclarator,
                };
                return acc;
            }, {});
            let mutationInfoList = parseMapMutations(content);
            mutationInfoList.forEach((mutationInfo) => {
                let mutationDefinationInfo = mutationMap[mutationInfo.secondNamespace];
                if (mutationDefinationInfo) {
                    completionList.push(Object.assign({ computedKey: mutationInfo.key }, mutationDefinationInfo, { type: 'mutation' }));
                }
            });
        });
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
            let thisCompletion = new vscode.CompletionItem(completion.computedKey ? completion.computedKey : '', vscode.CompletionItemKind.Method);
            thisCompletion.documentation = new vscode.MarkdownString('```' + completion.funcDeclarator ? completion.funcDeclarator : '' + '```');
            thisCompletion.detail = completion.type;
            return thisCompletion;
        });
    }
}
exports.thisProvider = thisProvider;
//# sourceMappingURL=thisProvider.js.map