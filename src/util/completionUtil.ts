import { StoreTreeInfo } from '../traverse/normal/modules';
import * as vscode from 'vscode';
import {
  ObjectProperty,
  File,
  ExpressionStatement,
  CallExpression,
} from '@babel/types';
import { getSecondMapNamespace } from '../completion/stateProvider';

export interface CursorInfo {
  match?: boolean;
  isNamespace: boolean;
  namespace: string;
  secondNameSpace: string;
}

export function getModuleFromPath(
  obj: StoreTreeInfo,
  path: string[] | undefined,
): StoreTreeInfo | undefined {
  if (path === undefined) {
    return obj;
  }
  try {
    return path.reduce((acc, cur) => {
      return acc['modules'][cur];
    }, obj);
  } catch (err) {
    return undefined;
  }
}

export function getNextNamespace(obj: StoreTreeInfo, namespace: string) {
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
export function getPositionIndex(
  doc: vscode.TextDocument,
  position: vscode.Position,
) {
  let docContent = doc.getText();
  let posIndex = 0;
  docContent.split('\n').some((line, index) => {
    posIndex += line.length + 1;
    return index >= position.line - 1;
  });
  posIndex += position.character;
  return posIndex;
}

export function whichCommit(
  resMatch: RegExpExecArray[],
  posIndex: number,
  equal: boolean = true,
) {
  if (equal) {
    return resMatch.filter(
      match =>
        posIndex >= match.index && posIndex <= match.index + match[0].length,
    )[0];
  }
  return resMatch.filter(
    match =>
      posIndex >= match.index && posIndex < match.index + match[0].length,
  )[0];
}

export function getMapGMACursorInfo(mapGetterAst: File, relativePos: number, needLastNamespace: boolean = false) {
  let program = mapGetterAst.program;
  let exp: ExpressionStatement = program.body[0] as ExpressionStatement;
  let callExp: CallExpression = exp.expression as CallExpression;
  let args = callExp.arguments;
  let retCursorInfo: CursorInfo = {
    isNamespace: false,
    namespace: '',
    secondNameSpace: '',
    match: false,
  };
  if (args.length === 1) {
    let firstArg = args[0];
    if (firstArg.type === 'ArrayExpression') {
      let cursorAtExp = firstArg.elements.filter(item => {
        return relativePos >= item.start && relativePos < item.end;
      })[0];
      if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
        retCursorInfo.match = true;
        retCursorInfo.secondNameSpace = getSecondMapNamespace(
          cursorAtExp.value,
          needLastNamespace
        );
      }
    } else if (firstArg.type === 'StringLiteral' && !retCursorInfo.match) {
      let cursorAtExp =
        relativePos >= firstArg.start && relativePos < firstArg.end;
      if (cursorAtExp) {
        retCursorInfo.match = true;
        retCursorInfo.isNamespace = true;
        retCursorInfo.namespace = getSecondMapNamespace(firstArg.value, needLastNamespace);
      }
    } else if (firstArg.type === 'ObjectExpression' && !retCursorInfo.match) {
      let cursorAtExp = firstArg.properties.filter(
        (property: ObjectProperty) => {
          return relativePos >= property.start && relativePos < property.end;
        },
      )[0];
      if (
        cursorAtExp &&
        cursorAtExp.type === 'ObjectProperty' &&
        cursorAtExp.value.type === 'StringLiteral'
      ) {
        retCursorInfo.match = true;
        retCursorInfo.secondNameSpace = getSecondMapNamespace(
          cursorAtExp.value.value,
          needLastNamespace
        );
      }
    }
  } else if (args.length === 2) {
    let firstArg = args[0];
    let secondArg = args[1];

    if (firstArg.type === 'StringLiteral' && !retCursorInfo.match) {
      if (relativePos >= firstArg.start && relativePos < firstArg.end) {
        retCursorInfo.match = true;
        retCursorInfo.isNamespace = true;
        retCursorInfo.namespace = getSecondMapNamespace(firstArg.value, needLastNamespace);
      }
      if (secondArg.type === 'ArrayExpression' && !retCursorInfo.match) {
        let cursorAtExp = secondArg.elements.filter(item => {
          return relativePos >= item.start && relativePos < item.end;
        })[0];
        if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
          retCursorInfo.match = true;
          retCursorInfo.namespace = firstArg.value;
          retCursorInfo.secondNameSpace = getSecondMapNamespace(
            cursorAtExp.value,
            needLastNamespace
          );
        }
      } else if (
        secondArg.type === 'ObjectExpression' &&
        !retCursorInfo.match
      ) {
        let cursorAtProperty = secondArg.properties.filter(
          (property: ObjectProperty) => {
            return relativePos >= property.start && relativePos < property.end;
          },
        )[0];
        if (
          cursorAtProperty &&
          cursorAtProperty.type === 'ObjectProperty' &&
          cursorAtProperty.value.type === 'StringLiteral'
        ) {
          retCursorInfo.match = true;
          retCursorInfo.namespace = firstArg.value;
          retCursorInfo.secondNameSpace = getSecondMapNamespace(
            cursorAtProperty.value.value,
            needLastNamespace
          );
        }
      }
    }
  }
  if (!retCursorInfo.match) {
    return null;
  }
  return retCursorInfo;
}
