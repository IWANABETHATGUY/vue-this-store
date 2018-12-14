"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const traverse_1 = require("@babel/traverse");
const fs = require("fs");
const path = require("path");
function getFileContent(abPath) {
    if (!fs.existsSync(abPath)) {
        if (fs.existsSync(abPath + '.js')) {
            abPath += '.js';
        }
        else if (fs.existsSync(abPath + '/index.js')) {
            abPath += '/index.js';
        }
    }
    let fileContent = fs.readFileSync(abPath, {
        encoding: 'utf8',
    });
    return fileContent;
}
exports.getFileContent = getFileContent;
function getFileLines(fileContent) {
    return fileContent.split('/n');
}
exports.getFileLines = getFileLines;
function getAbsolutePath(base, relative) {
    let ext = path.extname(base);
    if (ext && relative.length) {
        base = path.dirname(base);
    }
    let abPath = path.join(base, relative);
    if (!fs.existsSync(abPath)) {
        if (fs.existsSync(abPath + '.js')) {
            abPath += '.js';
        }
        else if (fs.existsSync(abPath + '/index.js')) {
            abPath += '/index.js';
        }
    }
    else {
        if (fs.existsSync(abPath + '.js')) {
            abPath += '.js';
        }
        else if (fs.existsSync(abPath + '/index.js')) {
            abPath += '/index.js';
        }
    }
    return abPath;
}
exports.getAbsolutePath = getAbsolutePath;
function getAst(fileContent) {
    return parser_1.parse(fileContent, { sourceType: 'module' });
}
exports.getAst = getAst;
/**
 *
 *
 * @param {any} Program
 * @returns
 */
function getModuleOrPathMap(ast) {
    let node = ast.program;
    let importDeclarationList = node.body.filter(item => item.type === 'ImportDeclaration');
    let modulelOrPathMap = importDeclarationList.reduce((acc, cur) => {
        let moduleOrPath = cur.source.value;
        cur.specifiers.forEach(specifier => {
            acc[specifier.local.name] = moduleOrPath;
        });
        return acc;
    }, {});
    return modulelOrPathMap;
}
exports.getModuleOrPathMap = getModuleOrPathMap;
/**
 *
 *
 * @param {File} ast
 * @returns {StoreAstMap}
 */
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
function getVuexConfig(storeABPath) {
    storeABPath = getAbsolutePath(storeABPath, '');
    let entryFile = getFileContent(storeABPath);
    let entryAst = getAst(entryFile);
    let entryDefineAstMap = getFileDefinationAstMap(entryAst);
    let entryModuleOrPathMap = getModuleOrPathMap(entryAst);
    let config;
    traverse_1.default(entryAst, {
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
exports.getVuexConfig = getVuexConfig;
function transformShorthand(exportDefault, defineAstMap) {
    if (exportDefault) {
        switch (exportDefault.declaration.type) {
            case 'Identifier':
                let name = exportDefault.declaration.name;
                if (defineAstMap[name] &&
                    defineAstMap[name].type === 'ObjectExpression') {
                    exportDefault.declaration = defineAstMap[name];
                }
                break;
            default:
        }
    }
}
exports.transformShorthand = transformShorthand;
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
exports.looksLike = looksLike;
/**
 * 判断一个对象是否是基本类型
 *
 * @param {any} val
 * @returns
 */
function isPrimitive(val) {
    return val == null || /^[sbn]/.test(typeof val);
}
//# sourceMappingURL=utils.js.map