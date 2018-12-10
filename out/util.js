"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const traverse_1 = require("@babel/traverse");
const fs = require("fs");
const path = require("path");
const utils_1 = require("./traverse/utils");
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
function getLocalFromModuleOrPathMap(mOrPMap, moduleOrPath) {
    let localName = '';
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
 * @param {any} File
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
            let isVueCallLike = utils_1.looksLike(path, {
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
//# sourceMappingURL=util.js.map