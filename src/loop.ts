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

export function setStoreInfo(rootPath: string): [string, StateInfo[]] {
  let entry: string = path.resolve(rootPath, 'src/main.js');

  if (!fs.existsSync(entry)) {
    console.error("you don't have the entry file");
    return;
  }
  let entryFileContent: string = getFileContent(entry);
  if (entryFileContent === '') {
    return ['', []];
  }
  let entryFileContentAst = getAstOfCode(entryFileContent);
  let storeRelativePath: string = getStoreEntryRelativePath(
    entryFileContentAst,
  );
  let storeContent: string = getFileContent(entry, storeRelativePath);

  let stateInfoList = getStateInfoFromStore(storeContent);
  let storeAbsolutePath = getAbsolutePath(entry, storeRelativePath);
  return [storeAbsolutePath, stateInfoList];
}
