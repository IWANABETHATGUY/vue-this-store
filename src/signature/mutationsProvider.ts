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
import { getPositionIndex, whichCommit } from '../completion/util';

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
    const reg = /this\.(([\w\$]+?)\([^\(\)]*?\))/g;
    const matchList: RegExpExecArray[] = getRegExpMatchList(document, reg);
    let posIndex = getPositionIndex(document, position);
    let commitExpression: RegExpExecArray = whichCommit(matchList, posIndex);
    if (!commitExpression) {
      return null;
    }
    debugger;
    const [_, funcDeclarator, funcName] = [...commitExpression];
    const matchMutation = this._thisCompletionList.filter(completion => completion.computedKey === funcName)[0];
    if (!matchMutation) {
      return null;
    }
    let sig1: SignatureInformation = {
      label: matchMutation.funcDeclarator,
      parameters: matchMutation.paramList.map(param => new ParameterInformation(param)),
    };
    signature.signatures = [sig1];

    signature.activeParameter = 0;
    signature.activeSignature = 0;
    return signature;
  }
}
