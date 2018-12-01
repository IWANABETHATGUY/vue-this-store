import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  ImportDeclaration,
  NewExpression,
  Identifier,
  ImportDefaultSpecifier,
  ObjectExpression,
  ObjectProperty,
  VariableDeclarator,
  Property,
} from '@babel/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 传入文件内容返回对应ast
 *
 * @export
 * @param {string} code
 * @returns
 */
export function getAstOfCode(code: string) {
  return parse(code, { sourceType: 'module' });
}

export function getFileContent(
  basePath: string,
  relativePath: string = '',
): string {
  let absolutStorePath: string = path.resolve(basePath, relativePath);

  let statObj = fs.statSync(absolutStorePath);
  if (statObj.isDirectory()) {
    absolutStorePath = path.resolve(absolutStorePath, 'index.js');
  }
  if (fs.existsSync(absolutStorePath)) {
    let storeEntryContent = fs.readFileSync(absolutStorePath, {
      encoding: 'utf8',
    });
    return storeEntryContent;
  }
  return '';
}

/**
 * 转换store入口文件得到store中的所有state的key
 *
 * @export
 * @param {string} storeContent
 * @returns {string[]}
 */
export function getStateKeysFromStore(storeContent: string): string[] {
  let ast = getAstOfCode(storeContent);
  return getStatekeysFromAst(ast);
}

/**
 * 通过ast获取store中的所有statekey
 *
 * @param {any} ast
 * @returns {string[]}
 */
function getStatekeysFromAst(ast): string[] {
  let stateList: string[] = [];
  traverse(ast, {
    VariableDeclarator(path) {
      let isStateLike: boolean = looksLike(path, {
        node: {
          id: {
            name: 'state',
          },
        },
      });
      if (isStateLike) {
        let node: VariableDeclarator = path.node;
        let init: ObjectExpression = node.init as ObjectExpression;
        let properties: Property[] = init.properties as Property[];
        stateList = properties.map(property => {
          return property.key.name;
        });
      }
    },
  });
  return stateList;
}

/**
 * 获取store入口文件中的相对路径
 *
 * @export
 * @param {any} ast
 * @returns {string}
 */
export function getStoreEntryRelativePath(ast): string {
  let moduleMap = {};
  let localVueIdentifier: string = '';
  let storeRelativeEntry: string = '';
  traverse(ast, {
    ImportDeclaration(path) {
      let node: ImportDeclaration = path.node;
      let defaultSpecifier:
        | ImportDefaultSpecifier
        | undefined = node.specifiers.filter(
        spec => spec.type === 'ImportDefaultSpecifier',
      )[0] as ImportDefaultSpecifier;
      if (!defaultSpecifier) return;
      let local = defaultSpecifier.local.name;
      let moduleOrPath = node.source.value;
      if (moduleOrPath === 'vue') localVueIdentifier = local;
      moduleMap[local] = {
        moduleOrPath,
      };
    },
    NewExpression(path) {
      let node: NewExpression = path.node;
      let callee = node.callee;
      if (callee.type === 'Identifier') {
        if (callee.name === localVueIdentifier) {
          let config: ObjectExpression = node.arguments[0] as ObjectExpression;
          config.properties.forEach((property: ObjectProperty) => {
            let key: Identifier = property.key;
            let value: Identifier = property.value as Identifier;
            if (key.name === 'store') {
              storeRelativeEntry = moduleMap[value.name].moduleOrPath;
            }
          });
        }
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