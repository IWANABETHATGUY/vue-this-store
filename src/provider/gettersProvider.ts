import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import { getModuleFromPath } from './util';
import { parse } from '@babel/parser';
import {
  File,
  ExpressionStatement,
  CallExpression,
  ArrayExpression,
  StringLiteral,
} from '@babel/types';

function getGettersFromNameSpace(obj: ModuleInfo, namespace: string) {
  // debugger;
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
function getNextNamespace(obj: ModuleInfo, namespace: string) {
  let nextNamespaceList = [];
  let curObjNamespace = obj.namespace;
  let curObjNamespaceList = obj.namespace.split('.');
  if (
    curObjNamespace &&
    curObjNamespace.startsWith(namespace) &&
    curObjNamespaceList.length ===
      namespace.split('.').filter(item => item.length).length + 1
  ) {
    nextNamespaceList.push(curObjNamespaceList[curObjNamespaceList.length - 1]);
  }
  if (obj.modules) {
    let modules = obj.modules;
    Object.keys(modules).forEach(key => {
      nextNamespaceList.push(...getNextNamespace(modules[key], namespace));
    });
  }
  return nextNamespaceList;
}
function getCursorInfo(mapGetterAst: File, relativePos: number) {
  let program = mapGetterAst.program;
  let exp: ExpressionStatement = program.body[0] as ExpressionStatement;
  let callExp: CallExpression = exp.expression as CallExpression;
  let args = callExp.arguments;
  if (args.length === 1) {
    let firstArg = args[0];
    if (firstArg.type === 'ArrayExpression') {
      let cursorAtExp = (firstArg as ArrayExpression).elements.filter(item => {
        return relativePos >= item.start && relativePos < item.end;
      })[0];
      // debugger;
      if (cursorAtExp) {
        return {
          isNamespace: false,
          namespace: '',
          secondNameSpace: (cursorAtExp as StringLiteral).value
            .split('/')
            .filter(ns => ns.length)
            .join('.'),
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
        let cursorAtExp = (secondArg as ArrayExpression).elements.filter(
          item => {
            return relativePos >= item.start && relativePos < item.end;
          },
        )[0];
        // debugger;
        if (cursorAtExp) {
          return {
            isNamespace: false,
            namespace: firstArg.value,
            secondNameSpace: (cursorAtExp as StringLiteral).value
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

    return getters
      ? getters.map(getterInfo => {
          let stateCompletion = new vscode.CompletionItem(
            getterInfo.rowKey,
            vscode.CompletionItemKind.Field,
          );
          stateCompletion.documentation = new vscode.MarkdownString(
            '```' + getterInfo.defination + '```',
          );
          return stateCompletion;
        })
      : [];

    // concat(
    //   Object.keys(modules ? modules : {}).map(module => {
    //     let moduleCompletion = new vscode.CompletionItem(
    //       module,
    //       vscode.CompletionItemKind.Module,
    //     );
    //     return moduleCompletion;
    //   }),
    // );
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
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.CompletionItem[] {
    let docContent = document.getText();
    let posIndex = 0;
    // console.time('mapState');
    let reg = /\bmapGetters\(([\'\"](.*)[\'\"],\s*)?([\[\{])[\s\S]*?([\}\]]).*?\)/;
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
    let mapGetterAst = parse(regRes[0]);
    let cursorInfo = getCursorInfo(mapGetterAst, posIndex - regRes.index);
    if (cursorInfo) {
      // debugger;
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
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        getterCompletionList = getGettersFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(getterInfo => {
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
      return getterCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}
