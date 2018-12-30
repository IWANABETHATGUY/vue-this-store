"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const thisProvider_1 = require("../completion/thisProvider");
const util_1 = require("../completion/util");
class mutationsSignatureProvider {
    constructor(thisCompletionList) {
        this._thisCompletionList = thisCompletionList;
    }
    setThisCompletionList(newThisCompletionList) {
        this._thisCompletionList = newThisCompletionList;
    }
    provideSignatureHelp(document, position) {
        let signature = new vscode_1.SignatureHelp();
        const reg = /this\.(([\w\$]+?)\([^\(\)]*?\))/g;
        const matchList = thisProvider_1.getRegExpMatchList(document, reg);
        let posIndex = util_1.getPositionIndex(document, position);
        let commitExpression = util_1.whichCommit(matchList, posIndex);
        if (!commitExpression) {
            return null;
        }
        debugger;
        const [_, funcDeclarator, funcName] = [...commitExpression];
        const matchMutation = this._thisCompletionList.filter(completion => completion.computedKey === funcName)[0];
        if (!matchMutation) {
            return null;
        }
        let sig1 = {
            label: matchMutation.funcDeclarator,
            parameters: matchMutation.paramList.map(param => new vscode_1.ParameterInformation(param)),
        };
        signature.signatures = [sig1];
        signature.activeParameter = 0;
        signature.activeSignature = 0;
        return signature;
    }
}
exports.mutationsSignatureProvider = mutationsSignatureProvider;
//# sourceMappingURL=mutationsProvider.js.map