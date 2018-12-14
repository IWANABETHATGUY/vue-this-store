"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const types_1 = require("@babel/types");
const traverse_1 = require("@babel/traverse");
function evalFromPath(base, relative, evalMap) {
    let filename = utils_1.getAbsolutePath(base, relative);
    let fileContent = utils_1.getFileContent(filename);
    let ast = utils_1.getAst(fileContent);
    traverse_1.default(ast, {
        VariableDeclarator(path) {
            let node = path.node;
            let id = node.id;
            let init = node.init;
            if (init.type === 'StringLiteral') {
                if (evalMap[id.name] === '') {
                    evalMap[id.name] = init.value;
                }
            }
        },
    });
}
function walkActionsFile(base, relative = '') {
    let filename = utils_1.getAbsolutePath(base, relative);
    let fileContent = utils_1.getFileContent(filename);
    let ast = utils_1.getAst(fileContent);
    let defineAstMap = utils_1.getFileDefinationAstMap(ast);
    let moduleOrPathMap = utils_1.getModuleOrPathMap(ast);
    let exportDefault = ast.program.body.filter(item => item.type === 'ExportDefaultDeclaration')[0];
    utils_1.transformShorthand(exportDefault, defineAstMap);
    if (exportDefault) {
        let EvalMap = {};
        let pathSet = new Set();
        exportDefault.declaration.properties.forEach((property) => {
            let key = property.key;
            if (property.computed) {
                if (defineAstMap[key.name]) {
                    property.key.name = defineAstMap[key.name]
                        .init.value;
                }
                else if (moduleOrPathMap[key.name]) {
                    EvalMap[key.name] = '';
                    pathSet.add(moduleOrPathMap[key.name]);
                }
            }
        });
        pathSet.forEach(path => {
            evalFromPath(base, path, EvalMap);
        });
        exportDefault.declaration.properties.forEach((property) => {
            let key = property.key;
            if (property.computed) {
                if (EvalMap[key.name]) {
                    property.key.name = EvalMap[key.name];
                }
            }
        });
    }
    return {
        export: exportDefault
            ? exportDefault.declaration
            : types_1.objectExpression([]),
        lineOfFile: fileContent.split('\n'),
    };
}
exports.walkActionsFile = walkActionsFile;
function parseActions(objAst, lileOfFile) {
    let actionInfoList = [];
    objAst.properties.forEach((property) => {
        let loc = property.loc;
        actionInfoList.push({
            rowKey: property.key.name,
            defination: lileOfFile.slice(loc.start.line - 1, loc.end.line).join('\n'),
        });
    });
    return actionInfoList;
}
exports.parseActions = parseActions;
//# sourceMappingURL=actions.js.map