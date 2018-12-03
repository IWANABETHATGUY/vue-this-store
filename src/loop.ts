import * as path from 'path';
import * as fs from 'fs';
import {
  getFileContent,
  getStoreEntryRelativePath,
  getAstOfCode,
  getAbsolutePath,
  getModuleInfoFromABPath,
} from './util';
import { ModuleInfo } from './type';

type setStoreStatus = 1 | -1;

const emptyModule: ModuleInfo = {
  state: [],
  abPath: '',
};
export function startFromEntry(
  rootPath: string,
): [string, ModuleInfo, setStoreStatus] {
  let entry: string = path.resolve(rootPath, 'src/main.js');
  emptyModule.abPath = entry;
  if (!fs.existsSync(entry)) {
    console.error("you don't have the entry file");
    return ['', emptyModule, -1];
  }
  let {
    fileContent: entryFileContent,
    status: entryFileStatus,
  } = getFileContent(entry);
  if (entryFileContent === '') {
    return ['', emptyModule, entryFileStatus];
  }
  let entryFileContentAst = getAstOfCode(entryFileContent);
  let storeRelativePath: string = getStoreEntryRelativePath(
    entryFileContentAst,
  );

  let storeAbsolutePath = getAbsolutePath(entry, storeRelativePath);
  let { status, moduleInfo: storeInfo } = getModuleInfoFromABPath(
    storeAbsolutePath,
    'module',
  );
  return [storeAbsolutePath, storeInfo, status];
}