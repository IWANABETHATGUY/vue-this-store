import { ModuleInfo } from '../traverse/modules';
import { getMutationsFromNameSpace } from './mutationsProvider';
import { parse } from '@babel/parser';
import generator from '@babel/generator';
import traverse from '@babel/traverse';
import {
  File,
  ExpressionStatement,
  CallExpression,
  StringLiteral,
  ObjectProperty,
  Identifier,
  ObjectMethod,
  BaseNode,
  MemberExpression,
  ReturnStatement,
} from '@babel/types';
import {
  TextDocument,
  CompletionItemProvider,
  Position,
  CompletionItem,
  CompletionItemKind,
  MarkdownString,
} from 'vscode';
import { getGettersFromNameSpace } from './gettersProvider';
import { getActionsFromNameSpace } from './actionsProvider';
import { parseState } from '../traverse/state';
import { getStateFromNameSpace } from './stateProvider';
type MapProperyInfo = {
  key: string;
  secondNamespace: string;
};

export type ThisCompletionInfo = {
  computedKey: string;
  defination: string;
  type: MapType;
  paramList?: string[];
  funcDeclarator?: string;
};
type ParseMapFunction = (mapContent: string) => MapProperyInfo[];
type MapType = 'mutation' | 'action' | 'getter' | 'state';
/**
 * MGA means Mutations, Getters, Actions
 *
 * @param {string} mapContent
 * @returns {MapProperyInfo[]}
 */
function parseMapMGA(mapContent: string): MapProperyInfo[] {
  let mapMutationAst: File = parse(mapContent);
  let astArguments = ((mapMutationAst.program.body[0] as ExpressionStatement).expression as CallExpression).arguments;
  let mapOrArray = astArguments.length === 1 ? astArguments[0] : astArguments[1];
  if (mapOrArray.type === 'ArrayExpression') {
    return mapOrArray.elements.map(element => {
      const value = (element as StringLiteral).value;
      return { key: value, secondNamespace: value };
    });
  } else if (mapOrArray.type === 'ObjectExpression') {
    let res: MapProperyInfo[] = [];
    mapOrArray.properties.forEach(property => {
      let propertyAst: ObjectProperty = property as ObjectProperty;
      let key = (propertyAst.key as Identifier).name;
      let secondNamespace = (propertyAst.value as StringLiteral).value;
      res.push({ key, secondNamespace });
    });
    return res;
  }
}

function parseMapState(mapContent: string) {
  let mapMutationAst: File = parse(mapContent);
  let astArguments = ((mapMutationAst.program.body[0] as ExpressionStatement).expression as CallExpression).arguments;
  let mapOrArray = astArguments.length === 1 ? astArguments[0] : astArguments[1];
  if (mapOrArray.type === 'ArrayExpression') {
    return mapOrArray.elements.map(element => {
      const value = (element as StringLiteral).value;
      return { key: value, secondNamespace: value };
    });
  } else if (mapOrArray.type === 'ObjectExpression') {
    let res: MapProperyInfo[] = [];
    mapOrArray.properties.forEach(property => {
      let propertyInfo: MapProperyInfo;
      if (property.type === 'ObjectMethod') {
        propertyInfo = getRowKAndSecondNameSpace(property);
      } else if (property.type === 'ObjectProperty') {
        if (property.value.type === 'StringLiteral') {
          let key = (property.key as Identifier).name;
          let secondNamespace = (property.value as StringLiteral).value;
          propertyInfo = { key, secondNamespace };
        } else if (property.value.type === 'ArrowFunctionExpression') {
          propertyInfo = getRowKAndSecondNameSpace(property);
        }
      }
      if (propertyInfo) {
        res.push(propertyInfo);
      }
    });
    return res;
  }
}

function getStateString(identifier: BaseNode): string {
  let firstParamStringLiteral: string = '';
  if (identifier && identifier.type === 'Identifier') {
    firstParamStringLiteral = (identifier as Identifier).name;
  }
  return firstParamStringLiteral;
}

function getRowKAndSecondNameSpace(property: ObjectProperty | ObjectMethod): MapProperyInfo | null {
  let stateString: string;
  let key: string = (property.key as Identifier).name;
  if (property.type === 'ObjectMethod') {
    let firstParam = property.params[0];
    stateString = getStateString(firstParam);
    if (property.body && property.body.type === 'BlockStatement') {
      let retStmt = property.body.body.filter(baseNode => {
        return baseNode.type === 'ReturnStatement';
      })[0];
      if (retStmt && retStmt.type === 'ReturnStatement') {
        if (
          retStmt.argument.type === 'MemberExpression' &&
          retStmt.argument.object.type === 'Identifier' &&
          retStmt.argument.object.name === stateString
        ) {
          let secondNamespace: string;
          switch (retStmt.argument.property.type) {
            case 'StringLiteral':
              secondNamespace = retStmt.argument.property.value;
              break;
            case 'Identifier':
              secondNamespace = retStmt.argument.property.name;
          }
          return {
            key,
            secondNamespace,
          };
        }
      }
    }
  } else {
    if (property.value.type === 'ArrowFunctionExpression') {
      let firstParam = property.value.params[0];
      stateString = getStateString(firstParam);
      if (!stateString) return null;
      let code = parse(generator(property.value, {}).code);
      let ret: MapProperyInfo = {
        key: '',
        secondNamespace: '',
      };
      traverse(code, {
        MemberExpression(path) {
          let node: MemberExpression = path.node;
          if (node.object.type === 'Identifier' && node.object.name === stateString) {
            ret.key = key;
            ret.secondNamespace = (node.property as Identifier).name;
            path.stop();
          }
        },
      });
      if (ret.key === key) {
        return ret;
      }
    }
  }
  return null;
}

export function getRegExpMatchList(document: TextDocument, reg: RegExp): RegExpExecArray[] {
  let docContent = document.getText();

  let match = null;
  let matchList = [];
  while ((match = reg.exec(docContent))) {
    matchList.push(match);
  }
  return matchList;
}

export class thisProvider implements CompletionItemProvider {
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
  public getNewThisCompletionList(document: TextDocument): ThisCompletionInfo[] {
    console.time('thisCompletion');
    let completionList: ThisCompletionInfo[] = [];
    const mutationRegExp = /\bmapMutations\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    const actionRegExp = /\bmapActions\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    const getterRegExp = /\bmapGetters\(([\'\"](.*)[\'\"],\s*)?(?:[\[\{])?[\s\S]*?(?:[\}\]])?.*?\)/g;
    const stateRegExp = /\bmapState\(([\'\"](.*)[\'\"](?:,\s*)?)?((\[[\s\S]*?\])|(\{[\s\S]*?\}))?\s*\)/g;
    completionList = completionList.concat(
      getThisXXXFromNameSpace(
        document,
        this._storeInfo,
        mutationRegExp,
        parseMapMGA,
        getMutationsFromNameSpace,
        'mutation',
      ),
    );
    completionList = completionList.concat(
      getThisXXXFromNameSpace(document, this._storeInfo, getterRegExp, parseMapMGA, getGettersFromNameSpace, 'getter'),
    );
    completionList = completionList.concat(
      getThisXXXFromNameSpace(document, this._storeInfo, actionRegExp, parseMapMGA, getActionsFromNameSpace, 'action'),
    );
    completionList = completionList.concat(
      getThisXXXFromNameSpace(document, this._storeInfo, stateRegExp, parseMapState, getStateFromNameSpace, 'state'),
    );
    console.timeEnd('thisCompletion');
    return completionList;
  }
  public provideCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    let linePrefix = document.lineAt(position).text.substr(0, position.character);
    let trimLinePrefixExpressions = linePrefix.trim().split(/\s+/);
    let lastPrefixExpression = trimLinePrefixExpressions[trimLinePrefixExpressions.length - 1];
    let reg = /this/;
    let regRes = reg.exec(lastPrefixExpression);
    if (!regRes) {
      return undefined;
    }

    return this._thisCompletionList.map((completion: ThisCompletionInfo) => {
      let thisCompletion = new CompletionItem(completion.computedKey ? completion.computedKey : '');
      switch (completion.type) {
        case 'mutation':
        case 'action':
          thisCompletion.kind = CompletionItemKind.Method;
          thisCompletion.documentation = completion.funcDeclarator
            ? completion.funcDeclarator
            : completion.defination
            ? new MarkdownString('```' + completion.defination + '```')
            : '';
          break;
        default:
          thisCompletion.kind = CompletionItemKind.Variable;
          thisCompletion.documentation = completion.defination
            ? new MarkdownString('```' + completion.defination + '```')
            : '';
      }
      thisCompletion.detail = completion.type;
      return thisCompletion;
    });
  }
}

function getThisXXXFromNameSpace(
  document: TextDocument,
  storeInfo: ModuleInfo,
  reg: RegExp,
  parseMapFunction: ParseMapFunction,
  getMapFromNameSpace,
  type: MapType,
): ThisCompletionInfo[] {
  const completionList: ThisCompletionInfo[] = [];
  let matchList: RegExpMatchArray[] = getRegExpMatchList(document, reg);
  matchList.forEach(match => {
    let [content, _, namespace] = match;
    namespace = namespace ? namespace : '';
    let mutationList = getMapFromNameSpace(storeInfo, namespace.split('/').join('.'));
    // debugger;
    let mutationMap = mutationList.reduce((acc, cur) => {
      acc[cur.rowKey] = {
        defination: cur.defination,
      };
      if (type === 'mutation' || type === 'action') {
        acc[cur.rowKey]['paramList'] = cur.paramList;
        acc[cur.rowKey]['funcDeclarator'] = cur.funcDeclarator;
      }
      return acc;
    }, {});
    let mapXXXInfoList: MapProperyInfo[] = parseMapFunction(content);
    mapXXXInfoList.forEach((mutationInfo: MapProperyInfo) => {
      let mutationDefinationInfo = mutationMap[mutationInfo.secondNamespace];
      if (mutationDefinationInfo) {
        completionList.push({
          computedKey: mutationInfo.key,
          ...mutationDefinationInfo,
          type,
        });
      }
    });
  });
  return completionList;
}
