import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  ImportDeclaration,
  NewExpression,
  Identifier,
  ObjectExpression,
  ObjectProperty,
  Program,
  File,
} from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

import { Status, ModuleOrPathMap } from './type';

import { looksLike } from './traverse/utils';

interface getFileContentResult {
  status: Status;
  fileContent: string;
}
/**
 * 传入文件内容返回对应ast
 *
 * @export
 * @param {string} code
 * @returns
 */
export function getAstOfCode(code: string): File {
  return parse(code, { sourceType: 'module' });
}

export function getAbsolutePath(base: string, relative: string = ''): string {
  let ext = path.extname(base);
  if (ext && relative.length) {
    base = path.dirname(base);
  }
  return path.resolve(base, relative);
}

export function getFileContent(abPath: string): getFileContentResult {
  if (!fs.existsSync(abPath)) {
    return { status: -1, fileContent: '' };
  }
  let statObj = fs.statSync(abPath);
  if (statObj.isDirectory()) {
    abPath = path.resolve(abPath, 'index.js');
  }
  if (fs.existsSync(abPath)) {
    let fileContent = fs.readFileSync(abPath, {
      encoding: 'utf8',
    });
    return { status: 1, fileContent };
  }
  return { status: -1, fileContent: '' };
}

function getLocalFromModuleOrPathMap(
  mOrPMap: ModuleOrPathMap,
  moduleOrPath: string,
): string {
  let localName: string = '';
  Object.keys(mOrPMap).forEach(key => {
    if (mOrPMap[key] === moduleOrPath) {
      localName = key;
    }
  });
  return localName;
}

/**
 * 通过ast获取所有的import内容
 *
 * @param {Program} node
 * @returns 返回一个map内容是specifier以及对应的module或者path内容
 */
export function getModuleOrPathMap(node: Program): ModuleOrPathMap {
  let importDeclarationList: ImportDeclaration[] = node.body.filter(
    item => item.type === 'ImportDeclaration',
  ) as ImportDeclaration[];
  let modulelOrPathMap = importDeclarationList.reduce((acc, cur) => {
    let moduleOrPath = cur.source.value;
    cur.specifiers
      .filter(specifier => specifier.type === 'ImportDefaultSpecifier')
      .forEach(specifier => {
        acc[specifier.local.name] = moduleOrPath;
      });
    return acc;
  }, {});
  return modulelOrPathMap;
}
/**
 * 获取store入口文件中的相对路径
 *
 * @export
 * @param {any} File
 * @returns {string}
 */
export function getStoreEntryRelativePath(ast: File): string {
  let moduleOrPathMap: ModuleOrPathMap = {};
  let localVueIdentifier: string = '';
  let storeRelativeEntry: string = '';
  traverse(ast, {
    Program(path) {
      let node: Program = path.node;
      moduleOrPathMap = getModuleOrPathMap(node);
      localVueIdentifier = getLocalFromModuleOrPathMap(moduleOrPathMap, 'vue');
    },
    NewExpression(path) {
      let isVueCallLike = looksLike(path, {
        node: {
          callee: {
            type: 'Identifier',
            name: localVueIdentifier,
          },
        },
      });
      if (isVueCallLike) {
        let node: NewExpression = path.node;
        let config: ObjectExpression = node.arguments[0] as ObjectExpression;
        config.properties.forEach((property: ObjectProperty) => {
          let key: Identifier = property.key;
          let value: Identifier = property.value as Identifier;
          if (key.name === 'store') {
            storeRelativeEntry = moduleOrPathMap[value.name];
          }
        });
      }
    },
  });
  return storeRelativeEntry;
}
