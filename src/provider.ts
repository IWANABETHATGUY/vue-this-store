import * as vscode from 'vscode';
import { ModuleInfo, ModulesInfo } from './traverse/modules';

function getModuleFromPath(
  obj: ModuleInfo,
  path: string[] | undefined,
): ModuleInfo | undefined {
  if (path === undefined) {
    return obj;
  }
  try {
    return path.reduce((acc, cur) => {
      return acc['modules'][cur];
    }, obj);
  } catch (err) {
    return undefined;
  }
}
export class storeStateProvider implements vscode.CompletionItemProvider {
  private storeInfo: ModuleInfo;
  constructor(storeInfo: ModuleInfo) {
    this.storeInfo = storeInfo;
  }
  public setStateKeysList(newStoreInfo: ModuleInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.CompletionItem[] {
    let linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);
    let trimLinePrefixExpressions = linePrefix.trim().split(' ');
    let lastPrefixExpression =
      trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
    let reg = /(?=return this\.)?(?=\$store\.)?state\.(.*\.)?/;
    let regRes = reg.exec(lastPrefixExpression);
    if (!regRes) {
      return undefined;
    }
    let path = regRes[1];
    let pathArray: string[] | undefined = path
      ? path.split('.').filter(item => item.length > 0)
      : undefined;
    // debugger;
    let newModule = getModuleFromPath(this.storeInfo, pathArray);
    if (!newModule) return undefined;
    let state = newModule.state;
    let modules = newModule.modules;
    return (state
      ? state.map(stateInfo => {
          let stateCompletion = new vscode.CompletionItem(
            stateInfo.rowKey,
            vscode.CompletionItemKind.Property,
          );
          stateCompletion.documentation = new vscode.MarkdownString(
            '```' + stateInfo.defination + '```',
          );
          return stateCompletion;
        })
      : []
    ).concat(
      Object.keys(modules ? modules : {}).map(module => {
        let moduleCompletion = new vscode.CompletionItem(
          module,
          vscode.CompletionItemKind.Module,
        );
        return moduleCompletion;
      }),
    );
  }
}

export class storeMapStateProvider implements vscode.CompletionItemProvider {
  private storeInfo: ModuleInfo;
  constructor(storeInfo: ModuleInfo) {
    this.storeInfo = storeInfo;
  }
  public setStateKeysList(newStoreInfo: ModuleInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    let docContent = document.getText();
    let posIndex = 0;
    // console.time('mapState');
    let reg = /\bmapState\(([\[\{])[\s\S]*?([\}\]]).*?\)/;
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

    if (
      posIndex >= regRes.index + 10 &&
      posIndex < regRes.index + regRes[0].length - 2
    ) {
      return this.storeInfo.state.map(stateInfo => {
        let stateCompletion = new vscode.CompletionItem(
          stateInfo.rowKey,
          vscode.CompletionItemKind.Value,
        );
        stateCompletion.documentation = new vscode.MarkdownString(
          '```' + stateInfo.defination + '```',
        );
        return stateCompletion;
      });
    }
    return undefined;
  }
}

// TODO: 这些是demo代码，可以提供参考，发布之前要删除
let provider1 = vscode.languages.registerCompletionItemProvider('plaintext', {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ) {
    // a simple completion item which inserts `Hello World!`
    const simpleCompletion = new vscode.CompletionItem('Hello World!');

    // a completion item that inserts its text as snippet,
    // the `insertText`-property is a `SnippetString` which we will
    // honored by the editor.
    const snippetCompletion = new vscode.CompletionItem('Good part of the day');
    snippetCompletion.insertText = new vscode.SnippetString(
      'Good ${1|morning,afternoon,evening|}. It is ${1}, right?',
    );

    snippetCompletion.documentation = new vscode.MarkdownString(
      'Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.',
    );

    // a completion item that can be accepted by a commit character,
    // the `commitCharacters`-property is set which means that the completion will
    // be inserted and then the character will be typed.
    const commitCharacterCompletion = new vscode.CompletionItem('console');
    commitCharacterCompletion.commitCharacters = ['.'];
    commitCharacterCompletion.documentation = new vscode.MarkdownString(
      'Press `.` to get `console.`',
    );

    // a completion item that retriggers IntelliSense when being accepted,
    // the `command`-property is set which the editor will execute after
    // completion has been inserted. Also, the `insertText` is set so that
    // a space is inserted after `new`
    const commandCompletion = new vscode.CompletionItem('new');
    commandCompletion.kind = vscode.CompletionItemKind.Keyword;
    commandCompletion.insertText = 'new ';
    commandCompletion.command = {
      command: 'editor.action.triggerSuggest',
      title: 'Re-trigger completions...',
    };

    // return all completion items as array
    return [
      simpleCompletion,
      snippetCompletion,
      commitCharacterCompletion,
      commandCompletion,
    ];
  },
});
