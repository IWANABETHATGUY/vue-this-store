"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const traverse_1 = require("@babel/traverse");
const fs = require("fs");
const path = require("path");
/**
 * 传入文件内容返回对应ast
 *
 * @export
 * @param {string} code
 * @returns
 */
function getAstOfCode(code) {
    return parser_1.parse(code, { sourceType: 'module' });
}
exports.getAstOfCode = getAstOfCode;
function getAbsolutePath(base, relative = '') {
    let ext = path.extname(base);
    if (ext && relative.length) {
        base = path.dirname(base);
    }
    return path.resolve(base, relative);
}
exports.getAbsolutePath = getAbsolutePath;
function getFileContent(basePath, relativePath = '') {
    let absolutStorePath = getAbsolutePath(basePath, relativePath);
    if (!fs.existsSync(absolutStorePath)) {
        return { status: -1, fileContent: '' };
    }
    let statObj = fs.statSync(absolutStorePath);
    if (statObj.isDirectory()) {
        absolutStorePath = path.resolve(absolutStorePath, 'index.js');
    }
    if (fs.existsSync(absolutStorePath)) {
        let fileContent = fs.readFileSync(absolutStorePath, {
            encoding: 'utf8',
        });
        return { status: 1, fileContent };
    }
    return { status: -1, fileContent: '' };
}
exports.getFileContent = getFileContent;
/**
 * 转换store入口文件得到store中的所有state的key
 *
 * @export
 * @param {string} storeContent
 * @returns {string[]}
 */
function getStateInfoFromStore(storeContent) {
    let ast = getAstOfCode(storeContent);
    let storeContentLines = storeContent.split('\n');
    return getStateInfosFromAst(ast, storeContentLines);
}
exports.getStateInfoFromStore = getStateInfoFromStore;
/**
 * 通过ast获取store中的所有statekey
 *
 * @param {any} ast
 * @returns {string[]}
 */
/**
 *
 *
 * @param {any} ast
 * @param {string[]} storeContent
 * @returns {StateInfo[]}
 */
function getStateInfosFromAst(ast, storeContentLines) {
    let stateInfoList = [];
    traverse_1.default(ast, {
        VariableDeclarator(path) {
            let isStateLike = looksLike(path, {
                node: {
                    id: {
                        name: 'state',
                    },
                },
            });
            if (isStateLike) {
                let node = path.node;
                let init = node.init;
                let properties = init.properties;
                stateInfoList = properties.map(property => {
                    let loc = property.loc;
                    let stateInfo = {
                        stateKey: property.key.name,
                        defination: storeContentLines
                            .slice(loc.start.line - 1, loc.end.line)
                            .join('\n'),
                    };
                    return stateInfo;
                });
            }
        },
    });
    return stateInfoList;
}
/**
 * 获取store入口文件中的相对路径
 *
 * @export
 * @param {any} ast
 * @returns {string}
 */
function getStoreEntryRelativePath(ast) {
    let moduleMap = {};
    let localVueIdentifier = '';
    let storeRelativeEntry = '';
    traverse_1.default(ast, {
        ImportDeclaration(path) {
            let node = path.node;
            let defaultSpecifier = node.specifiers.filter(spec => spec.type === 'ImportDefaultSpecifier')[0];
            if (!defaultSpecifier)
                return;
            let local = defaultSpecifier.local.name;
            let moduleOrPath = node.source.value;
            if (moduleOrPath === 'vue')
                localVueIdentifier = local;
            moduleMap[local] = {
                moduleOrPath,
            };
        },
        NewExpression(path) {
            let node = path.node;
            let callee = node.callee;
            if (callee.type === 'Identifier') {
                if (callee.name === localVueIdentifier) {
                    let config = node.arguments[0];
                    config.properties.forEach((property) => {
                        let key = property.key;
                        let value = property.value;
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
exports.getStoreEntryRelativePath = getStoreEntryRelativePath;
/**
 * 辅助函数用来判断第二个参数传入的对象中的内容是否在a中都一样，如果一样返回true，否则返回false
 *
 * @param {object} a
 * @param {object} b
 * @returns
 */
function looksLike(a, b) {
    return (a &&
        b &&
        Object.keys(b).every(bKey => {
            const bVal = b[bKey];
            const aVal = a[bKey];
            if (typeof bVal === 'function') {
                return bVal(aVal);
            }
            return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
        }));
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
//# sourceMappingURL=util.js.map