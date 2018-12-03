import * as path from 'path';
import * as fs from 'fs';
import {
  getFileContent,
  getStoreEntryRelativePath,
  getAstOfCode,
  getInfoFromStore,
  getAbsolutePath,
} from './util';
import { StateInfo, ModuleInfo } from './type';

type setStoreStatus = 1 | -1;

const emptyModule: ModuleInfo = {
  state: [],
};
export function getStoreInfo(
  rootPath: string,
): [string, ModuleInfo, setStoreStatus] {
  let entry: string = path.resolve(rootPath, 'src/main.js');

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
  let {
    fileContent: storeContent,
    status: storeContentStatus,
  } = getFileContent(entry, storeRelativePath);
  if (storeContent === '') {
    return ['', emptyModule, storeContentStatus];
  }
  let stateInfoList = getInfoFromStore(storeContent);
  let storeAbsolutePath = getAbsolutePath(entry, storeRelativePath);
  return [storeAbsolutePath, stateInfoList, 1];
}
