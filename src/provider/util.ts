import { ModuleInfo } from '../traverse/modules';
import * as vscode from 'vscode';
import {
  ObjectProperty,
  File,
  ExpressionStatement,
  CallExpression,
} from '@babel/types';
export function getModuleFromPath(
  obj: ModuleInfo,
  path: string[] | undefined,
): ModuleInfo | undefined {
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

export function getNextNamespace(obj: ModuleInfo, namespace: string) {
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

export function whichCommit(resMatch: RegExpExecArray[], posIndex: number) {
  return resMatch.filter(
    match =>
      posIndex >= match.index && posIndex < match.index + match[0].length,
  )[0];
}

export function getMapGMACursorInfo(mapGetterAst: File, relativePos: number) {
  let program = mapGetterAst.program;
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
    } else if (firstArg.type === 'ObjectExpression') {
      let cursorAtExp = firstArg.properties.filter(
        (property: ObjectProperty) => {
          return relativePos >= property.start && relativePos < property.end;
        },
      )[0];
      // debugger;
      if (
        cursorAtExp &&
        cursorAtExp.type === 'ObjectProperty' &&
        cursorAtExp.value.type === 'StringLiteral'
      ) {
        return {
          isNamespace: false,
          namespace: '',
          secondNameSpace: cursorAtExp.value.value
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
