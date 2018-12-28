import * as vscode from 'vscode';
import { ModuleInfo } from '../traverse/modules';
import {
  getMutationsFromNameSpace,
  storeMapMutationsProvider,
} from './mutationsProvider';
import { parse } from '@babel/parser';
import {
  File,
  BaseNode,
  ExpressionStatement,
  CallExpression,
  ObjectExpression,
  arrayExpression,
  ArrayExpression,
  StringLiteral,
  ObjectProperty,
  Identifier,
} from '@babel/types';

type MutationProperyInfo = {
  key: string;
  secondNamespace: string;
};

function parseMapMutations(mapMutationsContent: string): MutationProperyInfo[] {
  let mapMutationAst: File = parse(mapMutationsContent);
  let astArguments = ((mapMutationAst.program.body[0] as ExpressionStatement)
    .expression as CallExpression).arguments;
  let mapOrArray =
    astArguments.length === 1 ? astArguments[0] : astArguments[1];
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
function getAllMapMutationContent(document: vscode.TextDocument, reg: RegExp) {
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
  private _thisCompletionList;
  constructor(storeInfo: ModuleInfo) {
    this._storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: ModuleInfo) {
    this._storeInfo = newStoreInfo;
  }
  public setThisCompletionMap(document: vscode.TextDocument) {
    console.time('thisCompletion');
    let completionList = [];
    const reg = /\bmapMutations\((?:[\'\"](.*?)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    let matchList: RegExpMatchArray[] = getAllMapMutationContent(document, reg);
    matchList.forEach(match => {
      let [content, namespace] = match;

      let mutationList = getMutationsFromNameSpace(this._storeInfo, namespace);

      let mutationMap = mutationList.reduce((acc, cur) => {
        acc[cur.rowKey] = cur.defination;
        return acc;
      }, {});
      let mutationInfoList: MutationProperyInfo[] = parseMapMutations(content);
      mutationInfoList.forEach((mutationInfo: MutationProperyInfo) => {
        let mutationDefination = mutationMap[mutationInfo.secondNamespace];
        if (mutationDefination) {
          completionList.push({
            computedKey: mutationInfo.key,
            defination: mutationDefination,
            type: 'mutation',
          });
        }
      });
    });
    console.timeEnd('thisCompletion');
    this._thisCompletionList = completionList;
  }
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.CompletionItem[] {
    let linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);
    let trimLinePrefixExpressions = linePrefix.trim().split(/\s+/);
    let lastPrefixExpression =
      trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
    let reg = /this/;
    let regRes = reg.exec(lastPrefixExpression);
    if (!regRes) {
      return undefined;
    }

    return this._thisCompletionList.map(completion => {
      let thisCompletion = new vscode.CompletionItem(
        completion.computedKey ? completion.computedKey : '',
        vscode.CompletionItemKind.Method,
      );
      thisCompletion.documentation = new vscode.MarkdownString(
        '```' + completion.defination ? completion.defination : '' + '```',
      );
      return thisCompletion;
    });
    // ? getters.map(getterInfo => {
    //     let stateCompletion = new vscode.CompletionItem(
    //       getterInfo.rowKey,
    //       vscode.CompletionItemKind.Variable,
    //     );
    //     stateCompletion.documentation = new vscode.MarkdownString(
    //       '```' + getterInfo.defination + '```',
    //     );
    //     return stateCompletion;
    //   })
    // : [];
  }
}
