import * as vscode from 'vscode';

// import { stateKeysList } from './extension';
export class storeStateProvider implements vscode.CompletionItemProvider {
  private stateKeysList: string[];
  constructor(stateKeysList: string[]) {
    this.stateKeysList = stateKeysList;
  }
  public setStateKeysList(newList: string[]) {
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

    return this.stateKeysList.map(stateKey => {
      return new vscode.CompletionItem(
        stateKey,
        vscode.CompletionItemKind.Property,
      );
    });
  }
}
// export const storeStateProvider = vscode.languages.registerCompletionItemProvider(
//   { language: 'vue' },
//   {
//
//   },
//   '.', // triggered whenever a '.' is being typed
// );
