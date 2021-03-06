import {
  StoreTreeInfo,
  StateInfo,
  MutationInfo,
  GetterInfo,
  ActionInfo,
  ModulesInfo,
} from '../normal/modules';
import * as path from 'path';
import * as fs from 'fs';
import { getFileContent } from '../../util/traverseUtil';
import { getAstOfCode } from '../../util/commonUtil';
import {
  File,
  isExportNamedDeclaration,
  isVariableDeclaration,
  isVariableDeclarator,
  isIdentifier,
} from '@babel/types';
import { parseNuxtState } from './state';
import { parseNuxtMutationsOrActions } from './mutationsOrActions';
import { parseNuxtGetters } from './getters';

export function getNuxtStoreInfoFromDirectory(
  storeRootPath: string,
): StoreTreeInfo {
  const storeInfoList: StoreTreeInfo[] = fs
    .readdirSync(storeRootPath)
    .filter(relativePath => {
      return path.extname(relativePath) === '.js';
    })
    .map(p => {
      return getNuxtStoreInfoFromFile(path.resolve(storeRootPath, p));
    });
  let rootStoreInfo: StoreTreeInfo;
  for (let i = 0; i < storeInfoList.length; i++) {
    if (storeInfoList[i].namespace === 'index') {
      rootStoreInfo = { ...storeInfoList[i], namespace: '' };
      break;
    }
  }
  if (rootStoreInfo) {
    storeInfoList.forEach(storeInfo => {
      const namespace = storeInfo.namespace;
      if (namespace !== 'index') {
        rootStoreInfo['modules'][namespace] = storeInfo;
      }
    });
  }
  return rootStoreInfo ? rootStoreInfo : {};
}
function getNuxtStoreInfoFromFile(FileRootPath: string): StoreTreeInfo {
  const storeInfo: StoreTreeInfo = {
    abPath: FileRootPath
  };
  const namespace = path.basename(FileRootPath).split('.')[0];
  const fileContent: string = getFileContent(FileRootPath);
  const ast: File = getAstOfCode(fileContent);
  const state: StateInfo[] = [];
  const mutations: MutationInfo[] = [];
  const getters: GetterInfo[] = [];
  const actions: ActionInfo[] = [];
  const modules: ModulesInfo = Object.create(null);
  ast.program.body.forEach(statement => {
    if (isExportNamedDeclaration(statement)) {
      const declaration = statement.declaration;
      if (isVariableDeclaration(declaration)) {
        const firstDeclaration = declaration.declarations[0];
        if (isIdentifier(firstDeclaration.id)) {
          const name = firstDeclaration.id.name;
          switch (name) {
            case 'state':
              state.push(...parseNuxtState(firstDeclaration, fileContent, storeInfo));
              break;
            case 'mutations':
              mutations.push(
                ...parseNuxtMutationsOrActions(firstDeclaration, fileContent, storeInfo),
              );
              break;
            case 'actions':
              actions.push(
                ...parseNuxtMutationsOrActions(firstDeclaration, fileContent, storeInfo),
              );
              break;
            case 'getters':
              getters.push(...parseNuxtGetters(firstDeclaration, fileContent, storeInfo));
              break;
          }
        }
      }
    }
  });
  storeInfo.actions = actions;
  storeInfo.getters = getters;
  storeInfo.modules = modules;
  storeInfo.mutations = mutations;
  storeInfo.namespace = namespace;
  storeInfo.state = state;
  return storeInfo;
}
