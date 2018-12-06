import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import { getModuleFromPath, getNextNamespace } from './util';
import { parse } from '@babel/parser';
import {
  File,
  ExpressionStatement,
  CallExpression,
  ArrayExpression,
  StringLiteral,
  ObjectProperty,
  Identifier,
} from '@babel/types';
function getPositionIndex(doc: vscode.TextDocument, position: vscode.Position) {
  let docContent = doc.getText();
  let posIndex = 0;
  docContent.split('\n').some((line, index) => {
    posIndex += line.length + 1;
    return index >= position.line - 1;
  });
  posIndex += position.character;
  return posIndex;
}
function getCommitCursorInfo(commitAst: File, relativePos: number) {
  let program = commitAst.program;
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
function getMutationsFromNameSpace(obj: ModuleInfo, namespace: string) {
  // debugger;
  let mutationInfoList = [];
  if (obj.namespace === namespace && obj.mutations) {
    mutationInfoList.push(...obj.mutations);
  }
  if (obj.modules) {
    Object.keys(obj.modules).forEach(key => {
      let curModule = obj.modules[key];
      mutationInfoList.push(...getMutationsFromNameSpace(curModule, namespace));
    });
  }
  return mutationInfoList;
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
export class storeMutationsProvider implements vscode.CompletionItemProvider {
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
    let lineContent = document.lineAt(position);
    let trimLineExpressions = lineContent.text;
    // TODO: getters没有对象的说法，只能通过['namespace/namespace/somegetters']的方式访问
    let reg = /((?:this\.)?(?:\$store\.)commit\(.*\))/;
    let regRes = reg.exec(trimLineExpressions);
    // debugger;
    if (!regRes) {
      return undefined;
    }
    let commitExpression = regRes[1];
    let commitAst = parse(commitExpression);
    let posIndex = position.character;
    let cursorInfo = getCommitCursorInfo(commitAst, posIndex - regRes.index);
    if (cursorInfo) {
      // debugger;
      let fullNamespace = cursorInfo.namespace;
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
        getterCompletionList = getMutationsFromNameSpace(
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
          getterCompletion.detail = 'mutation';
          return getterCompletion;
        });
      }
      return getterCompletionList.concat(namespaceCompletionList);
    }
  }
}

export class storeMapMutationsProvider
  implements vscode.CompletionItemProvider {
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
    // console.time('mapState');
    let reg = /\bmapMutations\(([\'\"](.*)[\'\"],\s*)?([\[\{])[\s\S]*?([\}\]]).*?\)/;
    let regRes = reg.exec(docContent);

    if (!regRes) {
      return undefined;
    }

    // console.timeEnd('mapState');
    let mapGetterAst = parse(regRes[0]);
    let posIndex = getPositionIndex(document, position);
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
        NSCompletion.detail = 'module';
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        getterCompletionList = getMutationsFromNameSpace(
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
          getterCompletion.detail = 'mutation';
          return getterCompletion;
        });
      }
      return getterCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}
