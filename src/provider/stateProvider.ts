import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import { getModuleFromPath, getNextNamespace } from './util';
import { getCursorInfoFromRegExp } from './mutationsProvider';
import {
  File,
  ExpressionStatement,
  CallExpression,
  ArrayExpression,
} from '@babel/types';

function getStateFromNameSpace(obj: ModuleInfo, namespace: string) {
  // debugger;
  let stateInfoList = [];
  if (obj.namespace === namespace && obj.state) {
    stateInfoList.push(...obj.state);
  }
  if (obj.modules) {
    Object.keys(obj.modules).forEach(key => {
      let curModule = obj.modules[key];
      stateInfoList.push(...getStateFromNameSpace(curModule, namespace));
    });
  }
  return stateInfoList;
}
function getMapStateCursorInfo(mapStateAst: File, relativePos: number) {
  let program = mapStateAst.program;
  let exp: ExpressionStatement = program.body[0] as ExpressionStatement;
  let callExp: CallExpression = exp.expression as CallExpression;
  let args = callExp.arguments;
  if (args.length === 1) {
    let firstArg = args[0];

    if (firstArg.type === 'ArrayExpression') {
      let cursorAtExp = firstArg.elements.filter(item => {
        return relativePos >= item.start && relativePos < item.end;
      })[0];
      // debugger;
      if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
        return {
          isNamespace: false,
          namespace: '',
          secondNameSpace: cursorAtExp.value
            .split('/')
            .filter(ns => ns.length)
            .join('.'),
        };
      }
    } else if (firstArg.type === 'StringLiteral') {
      let cursorAtExp =
        relativePos >= firstArg.start && relativePos < firstArg.end;
      // debugger;
      if (cursorAtExp) {
        return {
          isNamespace: true,
          namespace: firstArg.value,
          secondNameSpace: '',
        };
      }
    }
  } else if (args.length === 2) {
    let firstArg = args[0];
    let secondArg = args[1];
    if (firstArg.type === 'StringLiteral') {
      if (secondArg.type === 'ArrayExpression') {
        if (relativePos >= firstArg.start && relativePos < firstArg.end) {
          return {
            isNamespace: true,
            namespace: firstArg.value,
            secondNameSpace: '',
          };
        }
        let cursorAtExp = secondArg.elements.filter(item => {
          return relativePos >= item.start && relativePos < item.end;
        })[0];
        if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
          return {
            isNamespace: false,
            namespace: firstArg.value,
            secondNameSpace: cursorAtExp.value
              .split('/')
              .filter(ns => ns.length)
              .join('.'),
          };
        }
      }
    }
  }
  return null;
}
export class storeStateProvider implements vscode.CompletionItemProvider {
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
    let newModule = getModuleFromPath(this.storeInfo, pathArray);
    if (!newModule) return undefined;
    let state = newModule.state;
    let modules = newModule.modules;
    return (state
      ? state.map(stateInfo => {
          let stateCompletion = new vscode.CompletionItem(
            stateInfo.rowKey,
            vscode.CompletionItemKind.Field,
          );
          stateCompletion.documentation = new vscode.MarkdownString(
            '```' + stateInfo.defination + '```',
          );
          stateCompletion.detail = 'state';
          return stateCompletion;
        })
      : []
    ).concat(
      Object.keys(modules ? modules : {}).map(module => {
        let moduleCompletion = new vscode.CompletionItem(
          module,
          vscode.CompletionItemKind.Module,
        );
        moduleCompletion.detail = 'module';
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
  public setStoreInfo(newStoreInfo: ModuleInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    // console.time('mapState');
    let reg = /\bmapState\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    let cursorInfo = getCursorInfoFromRegExp(
      reg,
      document,
      position,
      getMapStateCursorInfo,
    );
    if (cursorInfo) {
      // debugger;
      let fullNamespace = [cursorInfo.namespace, cursorInfo.secondNameSpace]
        .map(item => item.split('/').join('.'))
        .filter(item => item.length)
        .join('.');
      let stateCompletionList = [];
      let namespaceCompletionList = getNextNamespace(
        this.storeInfo,
        fullNamespace,
      ).map(nextNS => {
        let NSCompletion = new vscode.CompletionItem(
          nextNS,
          vscode.CompletionItemKind.Module,
        );
        NSCompletion.detail = 'module';
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        stateCompletionList = getStateFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(stateInfo => {
          let stateCompletion = new vscode.CompletionItem(
            stateInfo.rowKey,
            vscode.CompletionItemKind.Property,
          );
          stateCompletion.documentation = new vscode.MarkdownString(
            '```' + stateInfo.defination + '```',
          );
          stateCompletion.detail = 'state';
          return stateCompletion;
        });
      }
      return stateCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}
