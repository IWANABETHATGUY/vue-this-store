import * as vscode from 'vscode';
import { StoreTreeInfo, MutationInfo } from '../traverse/normal/modules';
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
} from '@babel/types';
type CursorType = 'ast' | 'regexp';
/**
 *
 *
 * @export
 * @param {RegExp} reg
 * @param {vscode.TextDocument} document
 * @param {vscode.Position} position
 * @param {Function} parseMatchFn
 * @param {CursorType} type
 * @param {boolean} [needToCut=false] 判断是否需要将尾部触发字符切断。
 * @returns
 */
export function getCursorInfoFromRegExp(
  reg: RegExp,
  document: vscode.TextDocument,
  position: vscode.Position,
  parseMatchFn: Function,
  type: CursorType,
  needToCut: boolean = false,
) {
  let docContent = document.getText();
  let cursorInfo = null;
  let match = null;
  let matchList = [];
  while ((match = reg.exec(docContent))) {
    matchList.push(match);
  }
  if (!matchList.length) {
    return null;
  }
  let posIndex = getPositionIndex(document, position);
  let commitExpression: RegExpExecArray = whichCommit(matchList, posIndex);
  if (!commitExpression) return null;
  if (type === 'ast') {
    if (needToCut) {
      commitExpression[0] = commitExpression[0].replace(
        /(\b\w+(?:\.\w+)*)(?:\.)([^\w])/g,
        ($, $1, $2) => {
          return $1 + 'ß' + $2;
        },
      );
    }
    let commitAst = parse(commitExpression[0]);

    cursorInfo = parseMatchFn(commitAst, posIndex - commitExpression.index);
  } else {
    cursorInfo = parseMatchFn(
      commitExpression,
      posIndex - commitExpression.index,
    );
  }
  return cursorInfo;
}
function getCommitCursorInfo(commitAst: File, relativePos: number) {
  let program = commitAst.program;
  let exp: ExpressionStatement = program.body[0] as ExpressionStatement;
  let callExp: CallExpression = exp.expression as CallExpression;
  let args = callExp.arguments;
  let firstArg = args[0];
  if (firstArg.type === 'StringLiteral') {
    if (relativePos >= firstArg.start && relativePos < firstArg.end) {
      const namespaceList = firstArg.value.split('/');
      return {
        isNamespace: false,
        namespace: namespaceList
          .slice(0, namespaceList.length - 1)
          .filter(Boolean)
          .join('.'),
        secondNameSpace: '',
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
          secondNameSpace: '',
        };
      }
    }
  }
  return null;
}
export function getMutationsFromNameSpace(
  obj: StoreTreeInfo,
  namespace: string,
) {
  let mutationInfoList: MutationInfo[] = [];
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

export class StoreMutationsProvider implements vscode.CompletionItemProvider {
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
    let reg = /((?:this\.)?(?:\$store\.)\n?commit\([\s\S]*?\))/g;
    let cursorInfo = getCursorInfoFromRegExp(
      reg,
      document,
      position,
      getCommitCursorInfo,
      'ast',
    );
    if (cursorInfo) {
      let fullNamespace = cursorInfo.namespace;
      let mutationCompletionList = [];
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
        mutationCompletionList = getMutationsFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(mutationInfo => {
          let mutationCompletion = new vscode.CompletionItem(
            mutationInfo.identifier,
            vscode.CompletionItemKind.Method,
          );
          mutationCompletion.documentation = mutationInfo.defination;
          mutationCompletion.detail = 'mutation';
          mutationCompletion.sortText = `1${mutationInfo.identifier}`;
          return mutationCompletion;
        });
      }
      return mutationCompletionList.concat(namespaceCompletionList);
    }
  }
}

export class StoreMapMutationsProvider
  implements vscode.CompletionItemProvider {
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
    let reg = /\bmapMutations\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
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
      let mutationCompletionList = [];
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
        mutationCompletionList = getMutationsFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(mutationInfo => {
          let mutationCompletion = new vscode.CompletionItem(
            mutationInfo.identifier,
            vscode.CompletionItemKind.Method,
          );
          mutationCompletion.documentation = mutationInfo.defination;
          mutationCompletion.detail = 'mutation';
          mutationCompletion.sortText = `1${mutationInfo.identifier}`;
          return mutationCompletion;
        });
      }
      return mutationCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}
