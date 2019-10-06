import {
  CompletionItem,
  TextDocument,
  Position,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionContext,
  CancellationToken,
} from 'vscode';
import { StoreTreeInfo } from '../traverse/normal/modules';
import { CursorInfo } from '../util/completionUtil';
import { getCursorInfoFromRegExp } from './mutationsProvider';
import {
  File,
  ExpressionStatement,
  CallExpression,
  ObjectMethod,
  Identifier,
  ObjectProperty,
  StringLiteral,
  ObjectExpression,
  isObjectMethod,
  isArrowFunctionExpression,
  isFunctionExpression,
  isStringLiteral,
} from '@babel/types';
import traverse from '@babel/traverse';
import generator from '@babel/generator';

export class StoreStateProvider implements CompletionItemProvider {
  private storeInfo: StoreTreeInfo;
  constructor(storeInfo: StoreTreeInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: StoreTreeInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: TextDocument,
    position: Position,
  ): CompletionItem[] {
    let reg = /this\s*\.\$store\s*\.state\.\s*((?:[\w\$]+(?:\s*\.)?)*)/g;
    // debugger
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
        .filter(Boolean)
        .join('.');
      let stateCompletionList: CompletionItem[] = [];
      let namespaceCompletionList: CompletionItem[] = getNextStateNamespace(
        this.storeInfo,
        fullNamespace,
      ).map(nextNS => {
        let NSCompletion = new CompletionItem(
          nextNS,
          CompletionItemKind.Module,
        );
        NSCompletion.detail = 'module';
        NSCompletion.sortText = `0${nextNS}`;
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        stateCompletionList = getStateFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(stateInfo => {
          let stateCompletion = new CompletionItem(
            stateInfo.identifier,
            CompletionItemKind.Variable,
          );
          stateCompletion.sortText = `1${stateInfo.identifier}`;
          stateCompletion.documentation = stateInfo.defination;
          stateCompletion.detail = 'state';
          return stateCompletion;
        });
      }
      // debugger
      return stateCompletionList.concat(namespaceCompletionList);
    }
  }
}
export class storeMapStateProvider implements CompletionItemProvider {
  private storeInfo: StoreTreeInfo;
  constructor(storeInfo: StoreTreeInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: StoreTreeInfo) {
    this.storeInfo = newStoreInfo;
  }
  public provideCompletionItems(
    document: TextDocument,
    position: Position,
    _: CancellationToken,
    context: CompletionContext,
  ): CompletionItem[] {
    console.time('mapState');
    let reg = /\bmapState\(([\'\"](.*)[\'\"](?:,\s*)?)?((\[[\s\S]*?\])|(\{[\s\S]*?\}))?\s*\)/g;
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
      let namespaceCompletionList = getNextStateNamespace(
        this.storeInfo,
        fullNamespace,
      ).map(nextNS => {
        let NSCompletion = new CompletionItem(
          nextNS,
          CompletionItemKind.Module,
        );
        NSCompletion.detail = 'module';
        NSCompletion.sortText = `0${nextNS}`;
        return NSCompletion;
      });
      if (!cursorInfo.isNamespace) {
        stateCompletionList = getStateFromNameSpace(
          this.storeInfo,
          fullNamespace,
        ).map(stateInfo => {
          let stateCompletion = new CompletionItem(
            stateInfo.identifier,
            CompletionItemKind.Variable,
          );
          stateCompletion.documentation = stateInfo.defination;
          stateCompletion.detail = 'state';
          stateCompletion.sortText = `1${stateInfo.identifier}`;
          return stateCompletion;
        });
      }
      console.timeEnd('mapState');
      return stateCompletionList.concat(namespaceCompletionList);
    }
    return undefined;
  }
}

function getNextStateNamespace(obj: StoreTreeInfo, namespace) {
  let targetModule: StoreTreeInfo = namespace
    .split('.')
    .filter(item => item.length)
    .reduce((acc, cur) => {
      let modules = acc['modules'];
      return modules && modules[cur] ? modules[cur] : {};
    }, obj);
  if (targetModule.modules) {
    return Object.keys(targetModule.modules);
  }
  return [];
}
export function getStateFromNameSpace(obj: StoreTreeInfo, namespace: string) {
  let targetModule: StoreTreeInfo = namespace
    .split('.')
    .filter(item => item.length)
    .reduce((acc, cur) => {
      let modules = acc['modules'];
      return modules && modules[cur] ? modules[cur] : {};
    }, obj);
  if (targetModule.state) {
    return targetModule.state;
  }
  return [];
}

export function getStateCursorInfo(regExecArray: RegExpExecArray): CursorInfo {
  const secondNameSpaceList = regExecArray[1].split('.').map(ns => ns.trim());

  return {
    isNamespace: false,
    namespace: '',
    secondNameSpace: secondNameSpaceList
      .slice(0, secondNameSpaceList.length - 1)
      .join('.'),
  };
}

export function getMapStateCursorInfo(
  mapStateAst: File,
  relativePos: number,
  needLastNamespace: boolean = false,
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
          secondNameSpace: getSecondMapNamespace(
            cursorAtExp.value,
            needLastNamespace,
          ),
        };
      }
    } else if (firstArg.type === 'StringLiteral') {
      let cursorAtExp =
        relativePos >= firstArg.start && relativePos < firstArg.end;
      if (cursorAtExp) {
        return {
          isNamespace: true,
          namespace: getSecondMapNamespace(firstArg.value, needLastNamespace),
          secondNameSpace: '',
        };
      }
    } else if (firstArg.type === 'ObjectExpression') {
      return getObjectExpressionCursorInfo(
        mapStateAst,
        relativePos,
        firstArg,
        needLastNamespace,
      );
    }
  } else if (args.length === 2) {
    let firstArg = args[0];
    let secondArg = args[1];
    if (firstArg.type === 'StringLiteral') {
      if (relativePos >= firstArg.start && relativePos < firstArg.end) {
        return {
          isNamespace: true,
          namespace: getSecondMapNamespace(firstArg.value, needLastNamespace),
          secondNameSpace: '',
        };
      }
      if (secondArg.type === 'ArrayExpression') {
        let cursorAtExp = secondArg.elements.filter(item => {
          return relativePos >= item.start && relativePos < item.end;
        })[0];
        if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
          return {
            isNamespace: false,
            namespace: firstArg.value,
            secondNameSpace: getSecondMapNamespace(
              cursorAtExp.value,
              needLastNamespace,
            ),
          };
        }
      } else if (secondArg.type === 'ObjectExpression') {
        return getObjectExpressionCursorInfo(
          mapStateAst,
          relativePos,
          secondArg,
          needLastNamespace,
          firstArg,
        );
      }
    }
  }
  return null;
}

export function getSecondMapNamespace(
  value: string,
  needLastNamespace: boolean = false,
): string {
  const secondNameSpaceList = value.split('/').map(ns => ns.trim());
  const len = secondNameSpaceList.length - +!needLastNamespace;
  return secondNameSpaceList.slice(0, len).join('.');
}

function getObjectExpressionCursorInfo(
  mapStateAst: File,
  relativePos: number,
  arg: ObjectExpression,
  needLastNamespace: boolean,
  namespaceArg?: StringLiteral,
) {
  let triggerProperty: ObjectProperty | ObjectMethod = null;
  arg.properties.some(property => {
    let flag =
      (property.type === 'ObjectMethod' ||
        property.type === 'ObjectProperty') &&
      relativePos >= property.start &&
      relativePos <= property.end;
    if (flag) {
      triggerProperty = property as ObjectProperty | ObjectMethod;
      return true;
    }
  });

  if (triggerProperty) {
    let retCursorInfo = {
      match: false,
      isNamespace: false,
      namespace: '',
      secondNameSpace: '',
    };
    if (
      isObjectMethod(triggerProperty) ||
      isArrowFunctionExpression(triggerProperty.value) ||
      isFunctionExpression(triggerProperty.value)
    ) {
      FunctionLikeCursorInfo(
        mapStateAst,
        relativePos,
        triggerProperty,
        retCursorInfo,
        namespaceArg,
        !needLastNamespace
      );
    } else {
      if (isStringLiteral(triggerProperty.value)) {
        const secondNamespaceList = triggerProperty.value.value.split('/');
        retCursorInfo.secondNameSpace = secondNamespaceList.slice(0, secondNamespaceList.length - Number(!needLastNamespace)).join('.');
        retCursorInfo.match = true;
      }
      if (namespaceArg) {
        retCursorInfo.namespace = namespaceArg.value;
      }
    }

    if (retCursorInfo.match) {
      return retCursorInfo;
    }
    return null;
  }
}

function FunctionLikeCursorInfo(
  mapStateAst: File,
  relativePos: number,
  triggerProperty: ObjectMethod | ObjectProperty,
  retCursorInfo: {
    match: boolean;
    isNamespace: boolean;
    namespace: string;
    secondNameSpace: string;
  },
  namespaceArg: StringLiteral,
  needCut: boolean = true
) {
  traverse(mapStateAst, {
    Identifier(path) {
      let node: Identifier = path.node as Identifier;
      if (relativePos >= node.start && relativePos <= node.end) {
        let cur = path;
        while (cur.parent.type === 'MemberExpression') {
          cur = cur.parentPath;
        }
        let file = generator(cur.node, {}).code;
        let namespaceList = file.slice(0, file.length - Number(needCut)).split('.');
        if (namespaceList.length) {
          switch (triggerProperty.type) {
            case 'ObjectMethod':
              if (
                (triggerProperty.params[0] as Identifier).name ===
                namespaceList[0]
              ) {
                retCursorInfo.match = true;
              }
              break;
            case 'ObjectProperty':
              switch (triggerProperty.value.type) {
                case 'ArrowFunctionExpression':
                case 'FunctionExpression':
                  let functionExpression = triggerProperty.value;
                  if (
                    (functionExpression.params[0] as Identifier).name ===
                    namespaceList[0]
                  ) {
                    retCursorInfo.match = true;
                  }
                  break;
              }
          }
          if (retCursorInfo.match) {
            retCursorInfo.secondNameSpace = namespaceList.slice(1).join('.');
            if (namespaceArg) {
              retCursorInfo.namespace = namespaceArg.value;
            }
          }
          path.stop();
        }
      }
    },
  });
}
