import * as vscode from 'vscode';
import { StoreTreeInfo } from '../traverse/modules';
import {
  getNextNamespace,
  getPositionIndex,
  whichCommit,
  getMapGMACursorInfo,
} from '../util/completionUtil';
import { parse } from '@babel/parser';
import {
  File,
  ExpressionStatement,
  CallExpression,
  StringLiteral,
  ObjectProperty,
  Identifier,
  Program,
} from '@babel/types';
import { getCursorInfoFromRegExp } from './mutationsProvider';

function getDispatchCursorInfo(commitAst: File, relativePos: number) {
  let program: Program = commitAst.program;
  let exp: ExpressionStatement = program.body[0] as ExpressionStatement;
  let callExp: CallExpression = exp.expression as CallExpression;
  let args = callExp.arguments;
  let firstArg = args[0];
  if (firstArg.type === 'StringLiteral') {
    if (relativePos >= firstArg.start && relativePos < firstArg.end) {
      return {
        isNamespace: false,
        namespace: firstArg.value
          .split('/')
          .filter(ns => ns.length)
          .join('.'),
      };
    }
  } else if (firstArg.type === 'ObjectExpression') {
    let typeProperty = firstArg.properties.filter(
      (property: ObjectProperty) => {
        let key: Identifier = property.key as Identifier;
        return key.name === 'type';
      },
    )[0];
    if (typeProperty) {
      let value: StringLiteral = (typeProperty as ObjectProperty)
        .value as StringLiteral;
      if (relativePos >= value.start && relativePos < value.end) {
        return {
          isNamespace: false,
          namespace: value.value
            .split('/')
            .filter(ns => ns.length)
            .join('.'),
        };
      }
    }
  }
  return null;
}
export function getActionsFromNameSpace(obj: StoreTreeInfo, namespace: string) {
  let actionInfoList = [];
  if (obj.namespace === namespace && obj.actions) {
    actionInfoList.push(...obj.actions);
  }
  if (obj.modules) {
    Object.keys(obj.modules).forEach(key => {
      let curModule = obj.modules[key];
      actionInfoList.push(...getActionsFromNameSpace(curModule, namespace));
    });
  }
  return actionInfoList;
}

export class StoreActionsProvider implements vscode.CompletionItemProvider {
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
    token: vscode.CancellationToken,
  ): vscode.CompletionItem[] {
    let docContent = document.getText();
    //TODO: export default 也需要判断是否export default的是一个已经定义过的变量，而不是一个obj字面量
    let reg = /((?:this\.)?(?:\$store\.)\n?dispatch\([\s\S]*?\))/g;
    let match = null;
    let matchList = [];

    while ((match = reg.exec(docContent))) {
      matchList.push(match);
    }

    if (!matchList.length) {
      return undefined;
    }
    let posIndex = getPositionIndex(document, position);
    let commitExpression = whichCommit(matchList, posIndex);
    if (!commitExpression) return undefined;
    let commitAst = parse(commitExpression[0]);
    let cursorInfo = getDispatchCursorInfo(
      commitAst,
      posIndex - commitExpression.index,
    );
    if (cursorInfo) {
      let fullNamespace = cursorInfo.namespace;
      let actionCompletionList = [];
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
        actionCompletionList = getActionsFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(actionInfo => {
          let actionCompletion = new vscode.CompletionItem(
            actionInfo.rowKey,
            vscode.CompletionItemKind.Method,
          );
          actionCompletion.documentation = actionInfo.defination
          actionCompletion.detail = 'action';
          actionCompletion.sortText = `1${actionInfo.rowKey}`;
          return actionCompletion;
        });
      }
      return actionCompletionList.concat(namespaceCompletionList);
    }
  }
}

export class StoreMapActionsProvider implements vscode.CompletionItemProvider {
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
    let reg = /\bmapActions\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
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
        NSCompletion.sortText = `1${nextNS}`;
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        getterCompletionList = getActionsFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(actionInfo => {
          let actionCompletion = new vscode.CompletionItem(
            actionInfo.rowKey,
            vscode.CompletionItemKind.Method,
          );
          actionCompletion.documentation = actionInfo.defination
          actionCompletion.detail = 'action';
          actionCompletion.sortText = `1${actionInfo.rowKey}`;
          return actionCompletion;
        });
      }
      return getterCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}
