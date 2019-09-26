"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const traverseUtil_1 = require("../util/traverseUtil");
const types_1 = require("@babel/types");
function walkFile(base, relative = '') {
    let filename = traverseUtil_1.getAbsolutePath(base, relative);
    let fileContent = traverseUtil_1.getFileContent(filename);
    let ast = traverseUtil_1.getAst(fileContent);
    let defineAstMap = traverseUtil_1.getFileDefinationAstMap(ast);
    let moduleOrPathMap = traverseUtil_1.getModuleOrPathMap(ast);
    let exportDefault = ast.program.body.filter(item => item.type === 'ExportDefaultDeclaration')[0];
    traverseUtil_1.transformShorthand(exportDefault, defineAstMap);
    return {
        export: exportDefault
            ? exportDefault.declaration
            : types_1.objectExpression([]),
        lineOfFile: fileContent.split('\n'),
    };
}
function parseGetters(objAst, lileOfFile) {
    let getterInfoList = [];
    objAst.properties.forEach((property) => {
        let loc = property.loc;
        getterInfoList.push({
            rowKey: property.key.name,
            defination: lileOfFile.slice(loc.start.line - 1, loc.end.line).join('\n'),
        });
    });
    return getterInfoList;
}
exports.parseGetters = parseGetters;
//# sourceMappingURL=getters.js.map