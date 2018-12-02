import * as path from 'path';
import * as fs from 'fs';
import {
  getFileContent,
  getStoreEntryRelativePath,
  getAstOfCode,
  getStateInfoFromStore,
  getAbsolutePath,
} from './util';
import { StateInfo } from './type';

type setStoreStatus = 1 | -1;
export function setStoreInfo(
  rootPath: string,
): [string, StateInfo[], setStoreStatus] {
  let entry: string = path.resolve(rootPath, 'src/main.js');

  if (!fs.existsSync(entry)) {
    console.error("you don't have the entry file");
    return ['', [], -1];
  }
  let {
    fileContent: entryFileContent,
    status: entryFileStatus,
  } = getFileContent(entry);
  if (entryFileContent === '') {
    return ['', [], entryFileStatus];
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
    return ['', [], storeContentStatus];
  }
  let stateInfoList = getStateInfoFromStore(storeContent);
  let storeAbsolutePath = getAbsolutePath(entry, storeRelativePath);
  return [storeAbsolutePath, stateInfoList, 1];
}
