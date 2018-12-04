import {
  getAbsolutePath,
  getFileContent,
  getAst,
  getFileDefinationAstMap,
  getModuleOrPathMap,
} from './utils';
import {
  ObjectExpression,
  ObjectProperty,
  Identifier,
  File,
  ExportDefaultDeclaration,
  objectExpression,
} from '@babel/types';
import { StoreAstMap, ModuleOrPathMap } from '../type';
import { walkFile, parseState } from './state';

export interface ModuleInfo {
  modules?: ModulesInfo;
  [prop: string]: {};
}
export interface ModulesInfo {
  [prop: string]: ModuleInfo;
}
export interface ParseModuleParam {
  objAst: ObjectExpression;
  [prop: string]: any;
}
export function parseModuleAst({
  objAst,
  m2pmap,
  defmap,
  cwf,
  lineOfFile,
}: ParseModuleParam) {
  let infoObj: ModuleInfo = {};
  objAst.properties.forEach((property: ObjectProperty) => {
    switch (property.key.name) {
      case 'state':
        if (property.shorthand) {
          let value: Identifier = property.value as Identifier;
          if (m2pmap[value.name]) {
            let { export: importState, lineOfFile } = walkFile(
              cwf,
              m2pmap[value.name],
            );
            infoObj.state = parseState(importState, lineOfFile);
          } else if (defmap[value.name]) {
            infoObj.state = parseState(defmap[value.name], lineOfFile);
          }
        } else {
          let value: ObjectExpression = property.value as ObjectExpression;
          infoObj.state = parseState(value, lineOfFile);
        }
        break;
      case 'actions':
        // parseActions(property.value, m2pmap, defmap);
        break;
      case 'getters':
        // parseGetters(property.value, m2pmap, defmap);
        break;
      case 'mutations':
        // parseMutations(property.value, m2pmap, defmap);
        break;
      case 'modules':
        if (property.shorthand) {
          let value: Identifier = property.value as Identifier;
          if (m2pmap[value.name]) {
            let {
              cwf: cwff,
              m2pmap: m2pmapp,
              objAst: objAstt,
              defmap: defmapp,
              lineOfFile: lineOfFilee,
            } = walkModulesFile(cwf, m2pmap[value.name]);
            infoObj.modules = parseModules({
              objAst: objAstt as ObjectExpression,
              m2pmap: m2pmapp,
              defmap: defmapp,
              cwf: cwff,
              lineOfFile: lineOfFilee,
            });
          } else if (defmap[value.name]) {
            infoObj.modules = parseModules({
              objAst: defmap[value.name],
              lineOfFile,
              m2pmap,
              defmap,
              cwf,
            });
          }
        } else {
          // parseState(value, m2pmap, defmap);
        }
        // parseModules(property.value, m2pmap, defmap);
        break;
      default:
    }
  });
  return infoObj;
}

export function walkModulesFile(base: string, relative: string = '') {
  let filename: string = getAbsolutePath(base, relative);
  let fileContent: string = getFileContent(filename);
  let ast: File = getAst(fileContent);
  let defineAstMap: StoreAstMap = getFileDefinationAstMap(ast);
  let moduleOrPathMap: ModuleOrPathMap = getModuleOrPathMap(ast);

  let exportDefault: ExportDefaultDeclaration = ast.program.body.filter(
    item => item.type === 'ExportDefaultDeclaration',
  )[0] as ExportDefaultDeclaration;

  return {
    objAst: exportDefault ? exportDefault.declaration : objectExpression([]),
    lineOfFile: fileContent.split('\n'),
    defmap: defineAstMap,
    m2pmap: moduleOrPathMap,
    cwf: filename,
  };
}

export function parseModules(
  { objAst, m2pmap, defmap, cwf, lineOfFile }: ParseModuleParam,
  namespace?: string,
) {
  let infoObj = {};
  objAst.properties.forEach((property: ObjectProperty) => {
    let key: Identifier = property.key as Identifier;
    // TODO:  这里需要注意， modules仍然可能从外部文件引入
    let value: ObjectExpression = property.value as ObjectExpression;
    infoObj[key.name] = parseModuleAst({
      objAst: value,
      m2pmap,
      defmap,
      cwf,
      lineOfFile,
    });
  });
  return infoObj;
}