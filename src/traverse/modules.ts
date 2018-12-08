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
import { parseMutations, walkMutationsFile } from './mutations';

export interface ModuleInfo {
  namespace: string;
  modules?: ModulesInfo;
  state?: any[];
  getters?: any[];
  mutations?: any[];
  [prop: string]: {};
}
export interface ModulesInfo {
  [prop: string]: ModuleInfo;
}
export interface ParseModuleParam {
  objAst: ObjectExpression;
  [prop: string]: any;
}

function getXXXInfo(
  { property, m2pmap, defmap, cwf, lineOfFile },
  walkFileFn: Function,
  parseFn: Function,
) {
  let infoList = [];
  if (property.shorthand) {
    let value: Identifier = property.value as Identifier;
    if (m2pmap[value.name]) {
      let { export: importState, lineOfFile } = walkFileFn(
        cwf,
        m2pmap[value.name],
      );
      infoList = parseFn(importState, lineOfFile);
    } else if (defmap[value.name]) {
      infoList = parseFn(defmap[value.name], lineOfFile);
    }
  } else {
    if (property.value.type === 'ObjectExpression') {
      let value: ObjectExpression = property.value;
      infoList = parseFn(value, lineOfFile);
    }
  }
  return infoList;
}

function setModulesInfo(
  { property, m2pmap, defmap, cwf, lineOfFile, namespace },
  walkFileFn: Function,
  parseFn: Function,
) {
  let modules = {};
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
      modules = parseModules(
        {
          objAst: objAstt as ObjectExpression,
          m2pmap: m2pmapp,
          defmap: defmapp,
          cwf: cwff,
          lineOfFile: lineOfFilee,
        },
        namespace,
      );
    } else if (defmap[value.name]) {
      modules = parseModules(
        {
          objAst: defmap[value.name],
          lineOfFile,
          m2pmap,
          defmap,
          cwf,
        },
        namespace,
      );
    }
  } else {
    // parseState(value, m2pmap, defmap);
  }
  return modules;
}
// TODO: 这了需要重构
export function parseModuleAst(
  { objAst, m2pmap, defmap, cwf, lineOfFile }: ParseModuleParam,
  infoObj: ModuleInfo,
) {
  objAst.properties.forEach((property: ObjectProperty) => {
    switch (property.key.name) {
      case 'state':
        infoObj.state = getXXXInfo(
          { property, m2pmap, defmap, cwf, lineOfFile },
          walkFile,
          parseState,
        );
        break;
      case 'actions':
        // parseActions(property.value, m2pmap, defmap);
        break;
      case 'getters':
        infoObj.getters = getXXXInfo(
          { property, m2pmap, defmap, cwf, lineOfFile },
          walkFile,
          parseGetters,
        );
        break;
      case 'mutations':
        infoObj.mutations = getXXXInfo(
          { property, m2pmap, defmap, cwf, lineOfFile },
          walkMutationsFile,
          parseState,
        );
        break;
      case 'modules':
        infoObj.modules = setModulesInfo(
          {
            property,
            m2pmap,
            defmap,
            cwf,
            lineOfFile,
            namespace: infoObj.namespace,
          },
          walkModulesFile,
          parseModules,
        );
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
  namespace: string,
) {
  // debugger;
  let infoObj: ModulesInfo = {};
  objAst.properties.forEach((property: ObjectProperty) => {
    let key: Identifier = property.key as Identifier;
    let namespaceProperty: ObjectProperty;
    let value;
    if (property.value.type === 'ObjectExpression') {
      value = property.value as ObjectExpression;
    } else if (property.shorthand) {
      if (m2pmap[key.name]) {
        let {
          objAst: objAstt,
          m2pmap: m2pmapp,
          defmap: defmapp,
          cwf: cwff,
          lineOfFile: lineOfFilee,
        } = walkModulesFile(cwf, m2pmap[key.name]);
        m2pmap = m2pmapp;
        defmap = defmapp;
        cwf = cwff;
        lineOfFile = lineOfFilee;
        value = objAstt;
      }
    }
    if (value) {
      namespaceProperty = value.properties.filter(
        (prop: ObjectProperty) => prop.key.name === 'namespaced',
      )[0] as ObjectProperty;
    }
    let needNewSpace: boolean =
      namespaceProperty && (namespaceProperty.value as BooleanLiteral).value;

    infoObj[key.name] = {
      namespace: needNewSpace
        ? namespace
            .split('.')
            .filter(item => item.length)
            .concat([key.name])
            .join('.')
        : namespace,
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
