import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import { getModuleFromPath } from './util';

function getGettersFromNameSpace(obj: ModuleInfo, namespace: string) {
  let getterInfoList = [];
  if (obj.namespace.split('.').join('/') === namespace) {
    getterInfoList.push(...obj.getters);
  }
  if (obj.modules) {
    Object.keys(obj.modules).forEach(key => {
      let module = obj.modules[key];
      getterInfoList.push(...getGettersFromNameSpace(module, namespace));
    });
  }
  return getterInfoList;
}
export class storeGettersProvider implements vscode.CompletionItemProvider {
  private storeInfo: ModuleInfo;
  constructor(storeInfo: ModuleInfo) {
    this.storeInfo = storeInfo;
  }
  public setGettersKeyList(newStoreInfo: ModuleInfo) {
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
    // TODO: getters没有对象的说法，只能通过['namespace/namespace/somegetters']的方式访问
    let reg = /(?=return this\.)?(?=\$store\.)?getters\.(.*\.)?/;
    let regRes = reg.exec(lastPrefixExpression);
    if (!regRes) {
      return undefined;
    }
    let path = regRes[1];
    let pathArray: string[] | undefined = path
      ? path.split('.').filter(item => item.length > 0)
      : undefined;
    let newModule = getModuleFromPath(this.storeInfo, pathArray);
    if (!newModule) return undefined;
    let getters = newModule.getters;

    let modules = newModule.modules;
    return (getters
      ? getters.map(getterInfo => {
          let stateCompletion = new vscode.CompletionItem(
            getterInfo.rowKey,
            vscode.CompletionItemKind.Property,
          );
          stateCompletion.documentation = new vscode.MarkdownString(
            '```' + getterInfo.defination + '```',
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

export class storeMapGettersProvider implements vscode.CompletionItemProvider {
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
    let reg = /\bmapGetters\((\'(.*)\',\s*)?([\[\{])[\s\S]*?([\}\]]).*?\)/;
    let regRes = reg.exec(docContent);

    if (!regRes) {
      return undefined;
    }
    let namespace: string = regRes[2];
    let namespaceGroup = regRes[1];
    // debugger;
    if (!namespace) namespace = '';
    let allGettersInfo = getGettersFromNameSpace(this.storeInfo, namespace);
    docContent.split('\n').some((line, index) => {
      posIndex += line.length + 1;
      return index >= position.line - 1;
    });
    posIndex += position.character;
    // console.timeEnd('mapState');

    if (
      posIndex >= regRes.index + 10 + namespaceGroup.length &&
      posIndex < regRes.index + regRes[0].length - 2
    ) {
      return allGettersInfo.map(getterInfo => {
        let getterCompletion = new vscode.CompletionItem(
          getterInfo.rowKey,
          vscode.CompletionItemKind.Property,
        );
        getterCompletion.documentation = new vscode.MarkdownString(
          '```' + getterInfo.defination + '```',
        );
        return getterCompletion;
      });
    }
    return undefined;
  }
}
