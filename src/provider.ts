import * as vscode from 'vscode';
import { StateInfo } from './type';

// import { stateKeysList } from './extension';
export class storeStateProvider implements vscode.CompletionItemProvider {
  private stateKeysList: StateInfo[];
  constructor(stateInfoList: StateInfo[]) {
    this.stateKeysList = stateInfoList;
  }
  public setStateKeysList(newList: StateInfo[]) {
    this.stateKeysList = newList;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.CompletionItem[] {
    let linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);
    let trimLinePrefix = linePrefix.trim();
    let reg = /(return this)?(.$store)?state/;
    if (!reg.test(trimLinePrefix)) {
      return undefined;
    }

    return this.stateKeysList.map(stateInfo => {
      let stateCompletion = new vscode.CompletionItem(
        stateInfo.stateKey,
        vscode.CompletionItemKind.Property,
      );
      stateCompletion.documentation = new vscode.MarkdownString(
        `${stateInfo.defination}`,
      );
      return stateCompletion;
    });
  }
}
