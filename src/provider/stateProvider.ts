import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import { getModuleFromPath, getNextNamespace, CursorInfo } from './util';
import { getCursorInfoFromRegExp } from './mutationsProvider';
import {
  File,
  ExpressionStatement,
  CallExpression,
  ObjectProperty,
  ObjectMethod,
  MemberExpression,
  Identifier,
} from '@babel/types';
import traverse from '@babel/traverse';
import generator from '@babel/generator';

function getStateFromNameSpace(obj: ModuleInfo, namespace: string) {
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

function getStateCursorInfo(
  regExecArray: RegExpExecArray,
  relativePos: number,
): CursorInfo {
  return {
    isNamespace: false,
    namespace: '',
    secondNameSpace: regExecArray[1]
      .split('.')
      .map(ns => ns.trim())
      .filter(ns => ns.length)
      .join('.'),
  };
}
function getMapStateCursorInfo(
  mapStateAst: File,
  relativePos: number,
  triggerCharacter: string,
) {
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
      if (cursorAtExp) {
        return {
          isNamespace: true,
          namespace: firstArg.value,
          secondNameSpace: '',
        };
      }
    }
    // else if (firstArg.type === 'ObjectExpression') {
    //   let triggerProperty = null;
    //   let cursorAtExp = firstArg.properties.filter(property => {
    //     let flag =
    //       (property.type === 'ObjectMethod' ||
    //         property.type === 'ObjectProperty') &&
    //       relativePos >= property.start &&
    //       relativePos <= property.end;
    //     if (flag) {
    //       triggerProperty = property;
    //     }
    //     return flag;
    //   })[0];

    //   if (cursorAtExp) {
    //     if (
    //       triggerProperty &&
    //       triggerProperty.type === 'ObjectMethod' &&
    //       triggerProperty.params.length === 0
    //     ) {
    //       return null;
    //     }
    //     let retCursorInfo = {
    //       match: false,
    //       isNamespace: false,
    //       namespace: '',
    //       secondNameSpace: '',
    //     };
    //     traverse(mapStateAst, {
    //       MemberExpression(path) {
    //         let node: MemberExpression = path.node as MemberExpression;
    //         if (relativePos >= node.start && relativePos <= node.end) {
    //           let file = generator(node, {}).code;
    //           let namespaceList = file.slice(0, -1).split('.');
    //           if (
    //             namespaceList.length &&
    //             namespaceList[0] ===
    //               ((cursorAtExp as ObjectMethod).params[0] as Identifier).name
    //           ) {
    //             retCursorInfo.match = true;
    //             retCursorInfo.secondNameSpace = namespaceList
    //               .slice(1)
    //               .join('.');
    //             path.stop();
    //           }
    //         }
    //       },
    //     });
    //     if (retCursorInfo.match) {
    //       return retCursorInfo;
    //     }
    //     return null;
    //   }
    // }
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
    context: vscode.CompletionContext,
  ): vscode.CompletionItem[] {
    let reg = /this\n?\s*\.\$store\n?\s*\.state((?:\n?\s*\.[\w\$]*)+)/g;
    let cursorInfo = getCursorInfoFromRegExp(
      reg,
      document,
      position,
      getStateCursorInfo,
      'regexp',
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
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        getterCompletionList = getStateFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(getterInfo => {
          let getterCompletion = new vscode.CompletionItem(
            getterInfo.rowKey,
            vscode.CompletionItemKind.Variable,
          );
          getterCompletion.documentation = new vscode.MarkdownString(
            '```' + getterInfo.defination + '```',
          );
          getterCompletion.detail = 'state';
          return getterCompletion;
        });
      }
      return getterCompletionList.concat(namespaceCompletionList);
    }
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
    token,
    context: vscode.CompletionContext,
  ): vscode.CompletionItem[] {
    // console.time('mapState');
    let reg = /\bmapState\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    let cursorInfo = getCursorInfoFromRegExp(
      reg,
      document,
      position,
      getMapStateCursorInfo,
      'ast',
      context.triggerCharacter === '.',
    );
    if (cursorInfo) {
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
            vscode.CompletionItemKind.Variable,
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
