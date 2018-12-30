import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import { getMutationsFromNameSpace } from './mutationsProvider';
import { parse } from '@babel/parser';
import {
  File,
  ExpressionStatement,
  CallExpression,
  StringLiteral,
  ObjectProperty,
  Identifier,
  ObjectMethod,
  FunctionDeclaration,
  ArrowFunctionExpression,
} from '@babel/types';

type MutationProperyInfo = {
  key: string;
  secondNamespace: string;
};

export type ThisCompletionInfo = {
  computedKey: string;
  defination: string;
  type: string;
  paramList?: string[];
  funcDeclarator?: string;
};
function getParamsFromAst(
  content: string,
  FunctionAst: ObjectMethod | FunctionDeclaration | ArrowFunctionExpression,
): string[] {
  let params = FunctionAst.params;
  return params.map(param => {
    return content.slice(param.start, param.end);
  });
}
function parseMapMutations(mapMutationsContent: string): MutationProperyInfo[] {
  let mapMutationAst: File = parse(mapMutationsContent);
  let astArguments = ((mapMutationAst.program.body[0] as ExpressionStatement).expression as CallExpression).arguments;
  let mapOrArray = astArguments.length === 1 ? astArguments[0] : astArguments[1];
  if (mapOrArray.type === 'ArrayExpression') {
    return mapOrArray.elements.map(element => {
      const value = (element as StringLiteral).value;
      return { key: value, secondNamespace: value };
    });
  } else if (mapOrArray.type === 'ObjectExpression') {
    let res: MutationProperyInfo[] = [];
    mapOrArray.properties.forEach(property => {
      let propertyAst: ObjectProperty = property as ObjectProperty;
      let key = (propertyAst.key as Identifier).name;
      let secondNamespace = (propertyAst.value as StringLiteral).value;
      res.push({ key, secondNamespace });
    });
    return res;
  }
}
export function getRegExpMatchList(document: vscode.TextDocument, reg: RegExp): RegExpExecArray[] {
  let docContent = document.getText();

  let match = null;
  let matchList = [];
  while ((match = reg.exec(docContent))) {
    matchList.push(match);
  }
  return matchList;
}
export class thisProvider implements vscode.CompletionItemProvider {
  private _storeInfo: ModuleInfo;
  private _thisCompletionList: ThisCompletionInfo[];
  constructor(storeInfo: ModuleInfo, thisCompletionList: ThisCompletionInfo[]) {
    this._storeInfo = storeInfo;
    this._thisCompletionList = thisCompletionList;
  }
  public setStoreInfo(newStoreInfo: ModuleInfo) {
    this._storeInfo = newStoreInfo;
  }
  public setThisCompletionList(newCompletionList: ThisCompletionInfo[]) {
    this._thisCompletionList = newCompletionList;
  }
  public getNewThisCompletionList(document: vscode.TextDocument): ThisCompletionInfo[] {
    console.time('thisCompletion');
    let completionList: ThisCompletionInfo[] = [];
    const reg = /\bmapMutations\((?:[\'\"](.*?)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    let matchList: RegExpMatchArray[] = getRegExpMatchList(document, reg);
    matchList.forEach(match => {
      let [content, namespace] = match;
      let mutationList = getMutationsFromNameSpace(this._storeInfo, namespace.split('/').join('.'));
      // debugger;
      let mutationMap = mutationList.reduce((acc, cur) => {
        acc[cur.rowKey] = {
          defination: cur.defination,
          paramList: cur.paramList,
          funcDeclarator: cur.funcDeclarator,
        };
        return acc;
      }, {});
      let mutationInfoList: MutationProperyInfo[] = parseMapMutations(content);
      mutationInfoList.forEach((mutationInfo: MutationProperyInfo) => {
        let mutationDefinationInfo = mutationMap[mutationInfo.secondNamespace];
        if (mutationDefinationInfo) {
          completionList.push({
            computedKey: mutationInfo.key,
            ...mutationDefinationInfo,
            type: 'mutation',
          });
        }
      });
    });
    console.timeEnd('thisCompletion');
    return completionList;
  }
  public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    let linePrefix = document.lineAt(position).text.substr(0, position.character);
    let trimLinePrefixExpressions = linePrefix.trim().split(/\s+/);
    let lastPrefixExpression = trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
    let reg = /this/;
    let regRes = reg.exec(lastPrefixExpression);
    if (!regRes) {
      return undefined;
    }

    return this._thisCompletionList.map((completion: ThisCompletionInfo) => {
      let thisCompletion = new vscode.CompletionItem(
        completion.computedKey ? completion.computedKey : '',
        vscode.CompletionItemKind.Method,
      );
      thisCompletion.documentation = new vscode.MarkdownString(
        '```' + completion.funcDeclarator ? completion.funcDeclarator : '' + '```',
      );
      thisCompletion.detail = completion.type;
      return thisCompletion;
    });
  }
}
