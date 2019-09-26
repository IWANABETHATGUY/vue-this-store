import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import { getModuleFromPath, getNextNamespace, getMapGMACursorInfo } from '../util/completionUtil';
import { getCursorInfoFromRegExp } from './mutationsProvider';

export function getGettersFromNameSpace(obj: ModuleInfo, namespace: string) {
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
  constructor(storeInfo: ModuleInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: ModuleInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.CompletionItem[] {
    let linePrefix = document.lineAt(position).text.substr(0, position.character);
    let trimLinePrefixExpressions = linePrefix.trim().split(' ');
    let lastPrefixExpression = trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
    let reg = /(?=return this\.)?(?=\$store\.)?getters\.(.*\.)?/;
    let regRes = reg.exec(lastPrefixExpression);
    if (!regRes) {
      return undefined;
    }
    let path = regRes[1];
    let pathArray: string[] | undefined = path ? path.split('.').filter(item => item.length > 0) : undefined;
    let newModule = getModuleFromPath(this.storeInfo, pathArray);
    if (!newModule) return undefined;
    let getters = newModule.getters;

    return getters
      ? getters.map(getterInfo => {
          let stateCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Variable);
          stateCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
          return stateCompletion;
        })
      : [];
  }
}

export class storeMapGettersProvider implements vscode.CompletionItemProvider {
  private storeInfo: ModuleInfo;
  constructor(storeInfo: ModuleInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: ModuleInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    console.time('mapState');
    let reg = /\bmapGetters\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    let cursorInfo = getCursorInfoFromRegExp(reg, document, position, getMapGMACursorInfo, 'ast');
    if (cursorInfo) {
      let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
        .map(item => item.split('/').join('.'))
        .filter(item => item.length)
        .join('.');
      let getterCompletionList = [];
      let namespaceCompletionList = getNextNamespace(this.storeInfo, fullNamespace).map(nextNS => {
        let NSCompletion = new vscode.CompletionItem(nextNS, vscode.CompletionItemKind.Module);
        NSCompletion.detail = 'module';
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        getterCompletionList = getGettersFromNameSpace(this.storeInfo, fullNamespace).map(getterInfo => {
          let getterCompletion = new vscode.CompletionItem(getterInfo.rowKey, vscode.CompletionItemKind.Variable);
          getterCompletion.documentation = new vscode.MarkdownString('```' + getterInfo.defination + '```');
          getterCompletion.detail = 'getter';
          return getterCompletion;
        });
      }
      console.timeEnd('mapState');
      return getterCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}
