"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const traverse_1 = require("@babel/traverse");
const fs = require("fs");
const path = require("path");
const getXXXInfo_1 = require("./getXXXInfo");
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
function getFileContent(abPath) {
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
exports.getFileContent = getFileContent;
/**
 * 递归获取store中的所有定义
 *
 * @export
 * @param {string} storeContent
 * @returns {string[]}
 */
function getStoreInfoFromABPath(abPath) {
    let storeInfo = { state: [], abPath: abPath };
    let { status: getFileStatus, fileContent } = getFileContent(abPath);
    if (getFileStatus === -1) {
        // TODO: 这里后续加上出错的原因，可以将错误原因输出到控制台
        return { status: -1, storeInfo };
    }
    let ast = getAstOfCode(fileContent);
    let storeEntryContentLines = fileContent.split('\n');
    storeInfo = getStoreInfosFromAst(ast, storeEntryContentLines, abPath);
    return { status: 1, storeInfo };
}
exports.getStoreInfoFromABPath = getStoreInfoFromABPath;
/*
 *通过ast获取store中的所有statekey
 *
 * @param {any} ast
 * @param {string[]} storeContent
 * @returns {StateInfo[]}
 */
function getStateInfoList(stateObjectAst, storeContentLines) {
    let stateInfoList;
    let init = stateObjectAst;
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
    return stateInfoList;
}
exports.getStateInfoList = getStateInfoList;
function getFileDefinationAstMap(ast) {
    let program = ast.program;
    let storeAstMap = {};
    let variableDeclarationList = program.body.filter(item => item.type === 'VariableDeclaration' && item.declarations.length === 1);
    variableDeclarationList.forEach(varDeclation => {
        let firstDeclarator = varDeclation.declarations[0];
        if (firstDeclarator.init.type !== 'ObjectExpression') {
            return;
        }
        let id = firstDeclarator.id.name;
        storeAstMap[id] = firstDeclarator.init;
    });
    return storeAstMap;
}
exports.getFileDefinationAstMap = getFileDefinationAstMap;
function getStoreInfosFromAst(ast, storeContentLines, abPath) {
    let moduleOrPathMap = {};
    let localVuexIndentifier = '';
    let storeAstMap = {};
    let moduleInfo = { state: [], abPath };
    traverse_1.default(ast, {
        Program(path) {
            let node = path.node;
            moduleOrPathMap = getModuleOrPathMap(node);
            localVuexIndentifier = getLocalFromModuleOrPathMap(moduleOrPathMap, 'vuex');
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
                let node = path.node;
                let configAst = node.arguments[0];
                let infoFnGenerator = getXXXInfo_1.default({
                    storeAstMap,
                    moduleOrPathMap,
                    abPath,
                    storeContentLines,
                });
                configAst.properties.forEach((property) => {
                    let key = property.key.name;
                    if (['modules', 'state'].indexOf(key) !== -1) {
                        moduleInfo[key] = infoFnGenerator[key](property);
                    }
                });
            }
        },
    });
    return moduleInfo;
}
exports.getStoreInfosFromAst = getStoreInfosFromAst;
function getVuexConfig() { }
function getLocalFromModuleOrPathMap(mOrPMap, moduleOrPath) {
    let localName = '';
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
function getModuleOrPathMap(node) {
    let importDeclarationList = node.body.filter(item => item.type === 'ImportDeclaration');
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
exports.getModuleOrPathMap = getModuleOrPathMap;
/**
 * 获取store入口文件中的相对路径
 *
 * @export
 * @param {any} ast
 * @returns {string}
 */
function getStoreEntryRelativePath(ast) {
    let moduleOrPathMap = {};
    let localVueIdentifier = '';
    let storeRelativeEntry = '';
    traverse_1.default(ast, {
        Program(path) {
            let node = path.node;
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
                let node = path.node;
                let config = node.arguments[0];
                config.properties.forEach((property) => {
                    let key = property.key;
                    let value = property.value;
                    if (key.name === 'store') {
                        storeRelativeEntry = moduleOrPathMap[value.name];
                    }
                });
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