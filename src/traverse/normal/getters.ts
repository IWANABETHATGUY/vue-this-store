import {
  getAbsolutePath,
  getFileContent,
  getFileDefinationAstMap,
  getModuleOrPathMap,
  transformShorthand,
} from '../../util/traverseUtil';
import {
  ExportDefaultDeclaration,
  objectExpression,
  ObjectExpression,
  ObjectProperty,
} from '@babel/types';
import { getAstOfCode } from '../../util/commonUtil';
import { GetterInfo } from './modules';

function walkFile(base: string, relative: string = '') {
  let filename = getAbsolutePath(base, relative);
  let fileContent = getFileContent(filename);
  let ast = getAstOfCode(fileContent);
  let defineAstMap = getFileDefinationAstMap(ast);
  let moduleOrPathMap = getModuleOrPathMap(ast);
  let exportDefault: ExportDefaultDeclaration = ast.program.body.filter(
    item => item.type === 'ExportDefaultDeclaration',
  )[0] as ExportDefaultDeclaration;
  transformShorthand(exportDefault, defineAstMap);
  return {
    export: exportDefault
      ? (exportDefault.declaration as ObjectExpression)
      : (objectExpression([]) as ObjectExpression),
    lineOfFile: fileContent.split('\n'),
    currentWorkFile: filename,
  };
}

export function parseGetters(objAst: ObjectExpression, lileOfFile: string[], cwf: string) {
  let getterInfoList: GetterInfo[] = [];
  objAst.properties.forEach((property: ObjectProperty) => {
    let loc = property.loc;
    getterInfoList.push({
      identifier : property.key.name,
      defination: lileOfFile.slice(loc.start.line - 1, loc.end.line).join('\n'),
      position: property.loc.start,
      abPath: cwf
    });
  });
  return getterInfoList;
}
