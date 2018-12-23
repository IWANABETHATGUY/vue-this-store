import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import {
  getModuleFromPath,
  getNextNamespace,
  getMapGMACursorInfo,
} from './util';
import { getCursorInfoFromRegExp } from './mutationsProvider';

function getGettersFromNameSpace(obj: ModuleInfo, namespace: string) {
  let getterInfoList = [];
  if (obj.namespace === namespace && obj.getters) {
    getterInfoList.push(...obj.getters);
  }
  if (obj.modules) {
    Object.keys(obj.modules).forEach(key => {
      let curModule = obj.modules[key];
      getterInfoList.push(...getGettersFromNameSpace(curModule, namespace));
    });
  }
  return getterInfoList;
}

export class storeGettersProvider implements vscode.CompletionItemProvider {
  private storeInfo: ModuleInfo;
  private thisCompletionMap: Map<String, Object>;
  constructor(storeInfo: ModuleInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: ModuleInfo) {
    this.storeInfo = newStoreInfo;
  }
  public setThisCompletionMap(newThisComplationMap: Map<String, Object>) {
    this.thisCompletionMap = newThisComplationMap;
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
    let reg = /this/;
    let regRes = reg.exec(lastPrefixExpression);
    if (!regRes) {
      return undefined;
    }
    const thisCompletionMap = this.thisCompletionMap;
    return Array.from(thisCompletionMap.keys()).map(key => {
      let value = thisCompletionMap.get(key);
      let thisCompletion = new vscode.CompletionItem(
        value.rowKey ? value.rowKey : '',
        vscode.CompletionItemKind.Variable,
      );
      thisCompletion.documentation = new vscode.MarkdownString(
        '```' + value.defination ? value.defination : '' + '```',
      );
      return thisCompletion;
    });
    // ? getters.map(getterInfo => {
    //     let stateCompletion = new vscode.CompletionItem(
    //       getterInfo.rowKey,
    //       vscode.CompletionItemKind.Variable,
    //     );
    //     stateCompletion.documentation = new vscode.MarkdownString(
    //       '```' + getterInfo.defination + '```',
    //     );
    //     return stateCompletion;
    //   })
    // : [];
  }
}
