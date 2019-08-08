import {
  SignatureHelpProvider,
  TextDocument,
  Position,
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  ProviderResult,
  MarkdownString,
} from 'vscode';
import { ThisCompletionInfo, getRegExpMatchList } from '../completion/thisProvider';
import { getPositionIndex, whichCommit } from '../util/completionUtil';

export class mutationsSignatureProvider implements SignatureHelpProvider {
  private _thisCompletionList: ThisCompletionInfo[];
  constructor(thisCompletionList: ThisCompletionInfo[]) {
    this._thisCompletionList = thisCompletionList;
  }
  public setThisCompletionList(newThisCompletionList: ThisCompletionInfo[]) {
    this._thisCompletionList = newThisCompletionList;
  }
  public provideSignatureHelp(document: TextDocument, position: Position): ProviderResult<SignatureHelp> {
    let signature = new SignatureHelp();
    const theCall = walkBackwardsToBeginningOfCall(document, position);
    if (!theCall) {
      return null;
    }
    const funcName: string = previousTokenPosition(document, theCall.openParen);

    const matchMutation = this._thisCompletionList.filter(completion => completion.computedKey === funcName)[0];
    if (!matchMutation) {
      return null;
    }
    let sig1: SignatureInformation = {
      label: matchMutation.funcDeclarator,
      parameters: matchMutation.paramList.slice(1).map(param => new ParameterInformation(param)),
    };
    signature.signatures = [sig1];

    signature.activeParameter = Math.min(matchMutation.paramList.length, theCall.commas.length);
    signature.activeSignature = 0;
    return signature;
  }
}

function walkBackwardsToBeginningOfCall(
  document: TextDocument,
  position: Position,
): { openParen: Position; commas: Position[] } {
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
              openParen: new Position(line, char),
              commas: commas,
            };
          }
          break;
        case ')':
          parenBalance++;
          break;
        case ',':
          if (parenBalance === 0 && braceBalance === 0) {
            commas.push(new Position(line, char));
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

function previousTokenPosition(document: TextDocument, position: Position): string {
  while (position.character > 0) {
    let word = document.getWordRangeAtPosition(position);
    if (word) {
      return document.getText(word);
    }
    position = position.translate(0, -1);
  }
  return null;
}
