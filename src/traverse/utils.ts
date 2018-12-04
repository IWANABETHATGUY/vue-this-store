import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as fs from 'fs';
import * as path from 'path';
import {
  File,
  Program,
  ImportDeclaration,
  VariableDeclaration,
  Identifier,
} from '@babel/types';
import { StoreAstMap } from '../type';
import { ParseModuleParam } from './modules';
export function getFileContent(abPath: string): string {
  if (!fs.existsSync(abPath)) {
    if (fs.existsSync(abPath + '.js')) {
      abPath += '.js';
    } else if (fs.existsSync(abPath + '/index.js')) {
      abPath += '/index.js';
    }
  }
  let fileContent = fs.readFileSync(abPath, {
    encoding: 'utf8',
  });
  return fileContent;
}
export function getFileLines(fileContent: string): string[] {
  return fileContent.split('/n');
}
export function getAbsolutePath(base: string, relative: string): string {
  let ext: string = path.extname(base);
  if (ext && relative.length) {
    base = path.dirname(base);
  }
  let abPath = path.join(base, relative);
  if (!fs.existsSync(abPath)) {
    if (fs.existsSync(abPath + '.js')) {
      abPath += '.js';
    } else if (fs.existsSync(abPath + '/index.js')) {
      abPath += '/index.js';
    }
  } else {
    if (fs.existsSync(abPath + '.js')) {
      abPath += '.js';
    } else if (fs.existsSync(abPath + '/index.js')) {
      abPath += '/index.js';
    }
  }
  return abPath;
}

export function getAst(fileContent: string): File {
  return parse(fileContent, { sourceType: 'module' });
}

/**
 *
 *
 * @param {any} Program
 * @returns
 */
export function getModuleOrPathMap(ast: File) {
  let node: Program = ast.program;
  let importDeclarationList = node.body.filter(
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
 *
 *
 * @param {File} ast
 * @returns {StoreAstMap}
 */
export function getFileDefinationAstMap(ast: File): StoreAstMap {
  let program: Program = ast.program;
  let storeAstMap = {};
  let variableDeclarationList: VariableDeclaration[] = program.body.filter(
    item =>
      item.type === 'VariableDeclaration' && item.declarations.length === 1,
  ) as VariableDeclaration[];
  variableDeclarationList.forEach(varDeclation => {
    let firstDeclarator = varDeclation.declarations[0];
    if (firstDeclarator.init.type !== 'ObjectExpression') {
      return;
    }
    let id: string = (firstDeclarator.id as Identifier).name;
    storeAstMap[id] = firstDeclarator.init;
  });
  return storeAstMap;
}

export function getVuexConfig(storeABPath: string): ParseModuleParam {
  storeABPath = getAbsolutePath(storeABPath, '');
  let entryFile = getFileContent(storeABPath);
  let entryAst = getAst(entryFile);
  let entryDefineAstMap = getFileDefinationAstMap(entryAst);
  let entryModuleOrPathMap = getModuleOrPathMap(entryAst);
  let config;
  traverse(entryAst, {
    NewExpression(path) {
      let isVuexCallLike = looksLike(path, {
        node: {
          callee: {
            type: 'MemberExpression',
            object: {
              name: 'Vuex',
            },
            property: {
              name: 'Store',
            },
          },
        },
      });
      if (isVuexCallLike) {
        let node = path.node;
        config = node.arguments[0];
      }
    },
  });
  return {
    objAst: config,
    m2pmap: entryModuleOrPathMap,
    defmap: entryDefineAstMap,
    cwf: storeABPath,
    lineOfFile: entryFile.split('\n'),
  };
}

/**
 * 辅助函数用来判断第二个参数传入的对象中的内容是否在a中都一样，如果一样返回true，否则返回false
 *
 * @param {object} a
 * @param {object} b
 * @returns
 */
function looksLike(a: object, b: object) {
  return (
    a &&
    b &&
    Object.keys(b).every(bKey => {
      const bVal = b[bKey];
      const aVal = a[bKey];
      if (typeof bVal === 'function') {
        return bVal(aVal);
      }
      return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
    })
  );
}

/**
 * 判断一个对象是否是基本类型
 *
 * @param {any} val
 * @returns
 */
function isPrimitive(val: any) {
  return val == null || /^[sbn]/.test(typeof val);
}
