import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  ImportDeclaration,
  NewExpression,
  Identifier,
  ObjectExpression,
  ObjectProperty,
  Program,
  VariableDeclarator,
  Property,
  VariableDeclaration,
  File,
} from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

import {
  StateInfo,
  Status,
  ModuleOrPathMap,
  StoreAstMap,
  StoreInfo,
} from './type';
import getXXXInfo from './getXXXInfo';

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

/**
 * 递归获取store中的所有定义
 *
 * @export
 * @param {string} storeContent
 * @returns {string[]}
 */
export function getStoreInfoFromABPath(
  abPath: string,
): { status: Status; storeInfo: StoreInfo } {
  let storeInfo: StoreInfo = { state: [], abPath: abPath };
  let { status: getFileStatus, fileContent } = getFileContent(abPath);
  if (getFileStatus === -1) {
    // TODO: 这里后续加上出错的原因，可以将错误原因输出到控制台
    return { status: -1, storeInfo };
  }
  let ast: File = getAstOfCode(fileContent);
  let storeEntryContentLines = fileContent.split('\n');
  storeInfo = getStoreInfosFromAst(ast, storeEntryContentLines, abPath);
  return { status: 1, storeInfo };
}

/*
 *通过ast获取store中的所有statekey
 *
 * @param {any} ast
 * @param {string[]} storeContent
 * @returns {StateInfo[]}
 */
export function getStateInfoList(
  stateObjectAst: ObjectExpression,
  storeContentLines: string[],
): StateInfo[] {
  let stateInfoList: StateInfo[];
  let init: ObjectExpression = stateObjectAst;
  let properties: Property[] = init.properties as Property[];
  stateInfoList = properties.map(property => {
    let loc = property.loc;
    let stateInfo: StateInfo = {
      stateKey: property.key.name,
      defination: storeContentLines
        .slice(loc.start.line - 1, loc.end.line)
        .join('\n'),
    };
    return stateInfo;
  });
  return stateInfoList;
}
export function getFileDefinationAstMap(ast: File): StoreAstMap {
  let program: Program = ast.program;
  let storeAstMap: StoreAstMap = {};
  let variableDeclarationList: VariableDeclaration[] = program.body.filter(
    item =>
      item.type === 'VariableDeclaration' && item.declarations.length === 1,
  ) as VariableDeclaration[];
  variableDeclarationList.forEach(varDeclation => {
    let firstDeclarator: VariableDeclarator = varDeclation.declarations[0];
    if (firstDeclarator.init.type !== 'ObjectExpression') {
      return;
    }
    let id = (firstDeclarator.id as Identifier).name;
    storeAstMap[id] = firstDeclarator.init;
  });
  return storeAstMap;
}

export function getStoreInfosFromAst(
  ast: File,
  storeContentLines: string[],
  abPath,
): StoreInfo {
  let moduleOrPathMap: ModuleOrPathMap = {};
  let localVuexIndentifier: string = '';
  let storeAstMap: StoreAstMap = {};
  let moduleInfo: StoreInfo = { state: [], abPath };
  traverse(ast, {
    Program(path) {
      let node: Program = path.node;
      moduleOrPathMap = getModuleOrPathMap(node);
      localVuexIndentifier = getLocalFromModuleOrPathMap(
        moduleOrPathMap,
        'vuex',
      );
      storeAstMap = getFileDefinationAstMap(ast);
    },
    NewExpression(path) {
      let isVuexCallLike = looksLike(path, {
        node: {
          callee: {
            type: 'MemberExpression',
            object: {
              name: localVuexIndentifier,
            },
            property: {
              name: 'Store',
            },
          },
        },
      });
      if (isVuexCallLike) {
        let node: NewExpression = path.node;
        let configAst = node.arguments[0] as ObjectExpression;
        let infoFnGenerator = getXXXInfo({
          storeAstMap,
          moduleOrPathMap,
          abPath,
          storeContentLines,
        });
        configAst.properties.forEach((property: ObjectProperty) => {
          let key = (property.key as Identifier).name;
          if (['modules', 'state'].indexOf(key) !== -1) {
            moduleInfo[key] = infoFnGenerator[key](property);
          }
        });
      }
    },
  });

  return moduleInfo;
}
function getVuexConfig() {}
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
// TODO:  这里是将store|moduel中的

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
 * @param {any} ast
 * @returns {string}
 */
export function getStoreEntryRelativePath(ast): string {
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
function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val);
}
