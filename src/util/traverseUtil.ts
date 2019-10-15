import traverse from '@babel/traverse';
import * as fs from 'fs';
import * as path from 'path';

import {
  File,
  Program,
  ImportDeclaration,
  VariableDeclaration,
  Identifier,
  ExportDefaultDeclaration,
  ObjectExpression,
  isImportDeclaration,
  isVariableDeclaration,
} from '@babel/types';
import { StoreAstMap, ModuleOrPathMap } from '../type';
import { ParseModuleParam } from '../traverse/normal/modules';
import { getAstOfCode } from './commonUtil';

export function getFileContent(abPath: string): string {
  let fileContent = '';
  if (!fs.existsSync(abPath)) {
    if (fs.existsSync(abPath + '.js')) {
      abPath += '.js';
    } else if (fs.existsSync(abPath + '/index.js')) {
      abPath += '/index.js';
    }
  }
  if (fs.existsSync(abPath) && fs.statSync(abPath).isFile()) {
    fileContent = fs.readFileSync(abPath, {
      encoding: 'utf8',
    });
  }
  return fileContent;
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
    const fileStat = fs.statSync(abPath);
    if (fileStat.isDirectory()) {
      const indexJsPath = path.resolve(abPath, 'index.js');
      if (fs.existsSync(indexJsPath)) {
        abPath = indexJsPath;
      }
    }
  }
  return abPath;
}

/**
 *
 *
 * @param {any} Program
 * @returns
 */
export function getModuleOrPathMap(ast: File): ModuleOrPathMap {
  let node: Program = ast.program;
  let importDeclarationList: ImportDeclaration[] = <ImportDeclaration[]>(
    node.body.filter(item => isImportDeclaration(item))
  );
  let modulelOrPathMap = importDeclarationList.reduce((acc, cur) => {
    let moduleOrPath = cur.source.value;
    cur.specifiers.forEach(specifier => {
      acc[specifier.local.name] = moduleOrPath;
    });
    return acc;
  }, Object.create(null));
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
  let variableDeclarationList: VariableDeclaration[] = <VariableDeclaration[]>(
    program.body.filter(
      item => isVariableDeclaration(item) && item.declarations.length === 1,
    )
  );
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
  let entryAst = getAstOfCode(entryFile);
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

export function transformShorthand(
  exportDefault: ExportDefaultDeclaration,
  defineAstMap: StoreAstMap,
) {
  if (exportDefault) {
    switch (exportDefault.declaration.type) {
      case 'Identifier':
        let name = exportDefault.declaration.name;
        if (
          defineAstMap[name] &&
          defineAstMap[name].type === 'ObjectExpression'
        ) {
          exportDefault.declaration = defineAstMap[name] as ObjectExpression;
        }
        break;
      default:
    }
  }
}
/**
 * 辅助函数用来判断第二个参数传入的对象中的内容是否在a中都一样，如果一样返回true，否则返回false
 *
 * @param {object} a
 * @param {object} b
 * @returns
 */
export function looksLike(a: object, b: object) {
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
