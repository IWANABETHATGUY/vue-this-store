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
  BooleanLiteral,
} from '@babel/types';
import { StoreAstMap, ModuleOrPathMap } from '../type';
import { walkFile, parseState } from './state';
import { parseGetters } from './getters';

export interface ModuleInfo {
  namespace: string[];
  modules?: ModulesInfo;
  state?: any[];
  getters?: any[];
  [prop: string]: {};
}
export interface ModulesInfo {
  [prop: string]: ModuleInfo;
}
export interface ParseModuleParam {
  objAst: ObjectExpression;
  [prop: string]: any;
}
export function parseModuleAst(
  { objAst, m2pmap, defmap, cwf, lineOfFile }: ParseModuleParam,
  infoObj: ModuleInfo,
) {
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
        if (property.shorthand) {
          let value: Identifier = property.value as Identifier;
          if (m2pmap[value.name]) {
            let { export: importGetters, lineOfFile } = walkFile(
              cwf,
              m2pmap[value.name],
            );
            infoObj.getters = parseGetters(importGetters, lineOfFile);
          } else if (defmap[value.name]) {
            infoObj.getters = parseGetters(defmap[value.name], lineOfFile);
          }
        } else {
          let value: ObjectExpression = property.value as ObjectExpression;
          infoObj.getters = parseGetters(value, lineOfFile);
        }
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
            infoObj.modules = parseModules(
              {
                objAst: objAstt as ObjectExpression,
                m2pmap: m2pmapp,
                defmap: defmapp,
                cwf: cwff,
                lineOfFile: lineOfFilee,
              },
              infoObj.namespace,
            );
          } else if (defmap[value.name]) {
            infoObj.modules = parseModules(
              {
                objAst: defmap[value.name],
                lineOfFile,
                m2pmap,
                defmap,
                cwf,
              },
              infoObj.namespace,
            );
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
  namespace: string[],
) {
  let infoObj: ModulesInfo = {};
  objAst.properties.forEach((property: ObjectProperty) => {
    let key: Identifier = property.key as Identifier;
    // TODO:  这里需要注意， modules仍然可能从外部文件引入
    let value: ObjectExpression = property.value as ObjectExpression;
    let namespaceProperty: ObjectProperty = value.properties.filter(
      (prop: ObjectProperty) => prop.key.name === 'namespace',
    )[0] as ObjectProperty;
    let needNewSpace: boolean =
      namespaceProperty && (namespaceProperty.value as BooleanLiteral).value;

    infoObj[key.name] = {
      namespace: needNewSpace
        ? namespace.concat([key.name])
        : namespace.slice(),
    };
    parseModuleAst(
      {
        objAst: value,
        m2pmap,
        defmap,
        cwf,
        lineOfFile,
      },
      infoObj[key.name],
    );
  });
  return infoObj;
}
