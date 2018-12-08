import { ModuleInfo } from '../traverse/modules';
import * as vscode from 'vscode';
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
