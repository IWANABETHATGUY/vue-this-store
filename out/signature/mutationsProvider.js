"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class mutationsSignatureProvider {
    constructor(thisCompletionList) {
        this._thisCompletionList = thisCompletionList;
    }
    setThisCompletionList(newThisCompletionList) {
        this._thisCompletionList = newThisCompletionList;
    }
    provideSignatureHelp(document, position) {
        let signature = new vscode_1.SignatureHelp();
        const theCall = walkBackwardsToBeginningOfCall(document, position);
        if (!theCall) {
            return null;
        }
        const funcName = previousTokenPosition(document, theCall.openParen);
        const matchMutation = this._thisCompletionList.filter(completion => completion.computedKey === funcName)[0];
        if (!matchMutation) {
            return null;
        }
        let sig1 = {
            label: matchMutation.funcDeclarator,
            parameters: matchMutation.paramList.slice(1).map(param => new vscode_1.ParameterInformation(param)),
        };
        signature.signatures = [sig1];
        signature.activeParameter = Math.min(matchMutation.paramList.length, theCall.commas.length);
        signature.activeSignature = 0;
        return signature;
    }
}
exports.mutationsSignatureProvider = mutationsSignatureProvider;
function walkBackwardsToBeginningOfCall(document, position) {
    let parenBalance = 0;
    let commas = [];
    let maxLookupLines = 30;
    let braceBalance = 0;
    for (let line = position.line; line >= 0 && maxLookupLines >= 0; line--, maxLookupLines--) {
        let currentLine = document.lineAt(line).text;
        let characterPosition = document.lineAt(line).text.length - 1;
        if (line === position.line) {
            characterPosition = position.character;
            currentLine = currentLine.substring(0, position.character);
        }
        for (let char = characterPosition; char >= 0; char--) {
            switch (currentLine[char]) {
                case '(':
                    parenBalance--;
                    if (parenBalance < 0) {
                        return {
                            openParen: new vscode_1.Position(line, char),
                            commas: commas,
                        };
                    }
                    break;
                case ')':
                    parenBalance++;
                    break;
                case ',':
                    if (parenBalance === 0 && braceBalance === 0) {
                        commas.push(new vscode_1.Position(line, char));
                    }
                    break;
                case '}':
                    braceBalance++;
                    break;
                case '{':
                    braceBalance--;
                    if (braceBalance === -1) {
                        commas = [];
                    }
                    break;
            }
        }
    }
    return null;
}
function previousTokenPosition(document, position) {
    while (position.character > 0) {
        let word = document.getWordRangeAtPosition(position);
        if (word) {
            return document.getText(word);
        }
        position = position.translate(0, -1);
    }
    return null;
}
//# sourceMappingURL=mutationsProvider.js.map