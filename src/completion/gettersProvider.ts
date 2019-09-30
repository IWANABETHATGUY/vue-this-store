import * as vscode from 'vscode';
import { StoreTreeInfo, GetterInfo } from '../traverse/normal/modules';
import {
  getModuleFromPath,
  getNextNamespace,
  getMapGMACursorInfo,
} from '../util/completionUtil';
import { getCursorInfoFromRegExp } from './mutationsProvider';
import { CompletionItem, CompletionItemKind } from 'vscode';
import { getStateCursorInfo } from './stateProvider';

export function getGettersFromNameSpace(obj: StoreTreeInfo, namespace: string) {
  let getterInfoList: GetterInfo[] = [];
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

export class StoreGettersProvider implements vscode.CompletionItemProvider {
  private storeInfo: StoreTreeInfo;
  constructor(storeInfo: StoreTreeInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: StoreTreeInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    let reg = /this\n?\s*\.\$store\n?\s*\.getters.\s*((?:[\w\$]+(?:\s*\.)?)*)/g;
    let cursorInfo = getCursorInfoFromRegExp(
      reg,
      document,
      position,
      getStateCursorInfo,
      'regexp',
    );
    // debugger
    if (cursorInfo) {
      let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
        .map(item => item.split('/').join('.'))
        .filter(item => item.length)
        .join('.');
      let getterCompletionList: CompletionItem[] = [];
      let namespaceCompletionList: CompletionItem[] = getNextNamespace(
        this.storeInfo,
        fullNamespace,
      ).map(nextNS => {
        let NSCompletionList = new CompletionItem(
          nextNS,
          CompletionItemKind.Module,
        );
        NSCompletionList.detail = 'module';
        NSCompletionList.sortText = `0${nextNS}`;
        return NSCompletionList;
      });
      if (!cursorInfo.isNamespace) {
        getterCompletionList = getGettersFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(getterInfo => {
          let getterCompletion = new CompletionItem(
            getterInfo.identifier,
            CompletionItemKind.Variable,
          );
          getterCompletion.sortText = `1${getterInfo.identifier}`;
          getterCompletion.documentation = getterInfo.defination
          getterCompletion.detail = 'state';
          return getterCompletion;
        });
      }
      // debugger
      return getterCompletionList.concat(namespaceCompletionList);
    }
  }
}

export class StoreMapGettersProvider implements vscode.CompletionItemProvider {
  private storeInfo: StoreTreeInfo;
  constructor(storeInfo: StoreTreeInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: StoreTreeInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    console.time('mapState');
    let reg = /\bmapGetters\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    let cursorInfo = getCursorInfoFromRegExp(
      reg,
      document,
      position,
      getMapGMACursorInfo,
      'ast',
    );
    if (cursorInfo) {
      let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
        .map(item => item.split('/').join('.'))
        .filter(item => item.length)
        .join('.');
      let getterCompletionList = [];
      let namespaceCompletionList = getNextNamespace(
        this.storeInfo,
        fullNamespace,
      ).map(nextNS => {
        let NSCompletion = new vscode.CompletionItem(
          nextNS,
          vscode.CompletionItemKind.Module,
        );
        NSCompletion.detail = 'module';
        NSCompletion.sortText = `0${nextNS}`;
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        getterCompletionList = getGettersFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(getterInfo => {
          let getterCompletion = new vscode.CompletionItem(
            getterInfo.identifier,
            vscode.CompletionItemKind.Variable,
          );
          getterCompletion.documentation = getterInfo.defination
          getterCompletion.detail = 'getter';
          getterCompletion.sortText = `1${getterInfo.identifier}`;
          return getterCompletion;
        });
      }
      console.timeEnd('mapState');
      return getterCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}
