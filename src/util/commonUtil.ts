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
  isIdentifier,
  isImportDeclaration,
  isImportDefaultSpecifier,
} from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

import { ModuleOrPathMap } from '../type';

import { looksLike } from './traverseUtil';

/**
 *
 * 传入文件内容返回对应ast
 * @export
 * @param {string} code
 * @returns {File}
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

export function getFileContent(abPath: string): string {
  if (!fs.existsSync(abPath)) {
    return '';
  }
  let pathStat = fs.statSync(abPath);
  if (pathStat.isDirectory()) {
    abPath = path.resolve(abPath, 'index.js');
  }
  if (fs.existsSync(abPath)) {
    let fileContent = fs.readFileSync(abPath, {
      encoding: 'utf8',
    });
    return fileContent;
  }
  return '';
}

function getLocalFromModuleOrPathMap(
  mOrPMap: ModuleOrPathMap,
  moduleOrPath: string,
): string {
  let localIdentifier: string = '';
  Object.keys(mOrPMap).some(key => {
    if (mOrPMap[key] === moduleOrPath) {
      localIdentifier = key;
      return true;
    }
  });
  return localIdentifier;
}

/**
 * 通过ast获取所有的import内容
 *
 * @param {Program} node
 * @returns 返回一个map内容是specifier以及对应的module或者path内容
 */
export function getModuleOrPathMap(node: Program): ModuleOrPathMap {
  let importDeclarationList: ImportDeclaration[] = node.body.filter(statment =>
    isImportDeclaration(statment),
  ) as ImportDeclaration[];
  let modulelOrPathMap = importDeclarationList.reduce(
    (currentMap: ModuleOrPathMap, cur: ImportDeclaration) => {
      let moduleOrPath = cur.source.value;
      cur.specifiers
        .filter(specifier => isImportDefaultSpecifier(specifier))
        .forEach(specifier => {
          currentMap[specifier.local.name] = moduleOrPath;
        });
      return currentMap;
    },
    Object.create(null),
  );
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
  let storeRelativePath: string = '';
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
          if (isIdentifier(value) && key.name === 'store') {
            storeRelativePath = moduleOrPathMap[value.name];
          }
        });
      }
    },
  });
  return storeRelativePath;
}
