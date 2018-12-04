import { StoreAstMap, ModuleOrPathMap, StateInfo, ModulesInfo } from './type';
import {
  ObjectExpression,
  ObjectProperty,
  Program,
  ExportDefaultDeclaration,
  Property,
} from '@babel/types';
import {
  getStateInfoList,
  getAbsolutePath,
  getStoreInfoFromABPath,
  getFileContent,
  getAstOfCode,
  getStoreInfosFromAst,
  getFileDefinationAstMap,
  getModuleOrPathMap,
} from './util';

function getModulesInfoFromAbPath(abPath: string): ModulesInfo {
  let modulesInfo = { abPath };
  let { status, fileContent } = getFileContent(abPath);
  if (status === -1) {
    return null;
  }
  let ast = getAstOfCode(fileContent);
  let moduleDefinationAst = getFileDefinationAstMap(ast);
  let moduleOrPathMap = getModuleOrPathMap(ast.program);
  let fileContentLines = fileContent.split('\n');
  let program: Program = ast.program;
  let exportDefault: ExportDefaultDeclaration = program.body.filter(
    node => node.type === 'ExportDefaultDeclaration',
  )[0] as ExportDefaultDeclaration;
  if (exportDefault) {
    let declaration: ObjectExpression = exportDefault.declaration as ObjectExpression;
    declaration.properties.forEach((property: ObjectProperty) => {
      if (property.shorthand) {
        let key = property.key.name;
        if (moduleDefinationAst[key]) {
        } else if (1) {
        }
      } else if (property.value.type === 'ObjectExpression') {
      }
    });
  }
}
interface ModuleInfoConfig {
  storeAstMap: StoreAstMap;
  moduleOrPathMap: ModuleOrPathMap;
  abPath: string;
  storeContentLines: string[];
}
export default ({
  storeAstMap,
  moduleOrPathMap,
  abPath,
  storeContentLines,
}: ModuleInfoConfig): object => ({
  modules(property: ObjectProperty): ModulesInfo {
    let moduleInfo: ModulesInfo = { abPath };
    return null;

    // let key = property.key.name;
    // if (property.shorthand) {
    //   if (storeAstMap[key]) {
    //   } else if (moduleOrPathMap[key]) {
    //     const newModuleABPath = getAbsolutePath(abPath, moduleOrPathMap[key]);
    //     moduleInfo.abPath = newModuleABPath;
    //   }
    //   // TODO: 需要做state从外部文件中引入的情况判断
    // } else {
    //   if (property.value.type === 'ObjectExpression') {
    //   }
    // }
    // return moduleInfo;
  },
  state(property: ObjectProperty): StateInfo[] {
    if (property.shorthand) {
      if (storeAstMap[property.key.name]) {
        return getStateInfoList(
          storeAstMap[property.key.name] as ObjectExpression,
          storeContentLines,
        );
      }
      // TODO: 需要做state从外部文件中引入的情况判断
    } else {
      if (property.value.type === 'ObjectExpression') {
        return getStateInfoList(
          property.value as ObjectExpression,
          storeContentLines,
        );
      }
    }
  },
});
