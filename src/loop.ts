import * as path from 'path';
import * as fs from 'fs';
import {
  getFileContent,
  getStoreEntryRelativePath,
  getAstOfCode,
  getStateKeysFromStore,
  getAbsolutePath,
} from './util';

export function setStoreInfo(rootPath: string): [string, string[]] {
  let entry: string = path.resolve(rootPath, 'src/main.js');

  if (!fs.existsSync(entry)) {
    console.error("you don't have the entry file");
    return;
  }
  let entryFileContent: string = getFileContent(entry);
  let entryFileContentAst = getAstOfCode(entryFileContent);
  let storeRelativePath: string = getStoreEntryRelativePath(
    entryFileContentAst,
  );
  let storeContent: string = getFileContent(entry, storeRelativePath);

  return [
    getAbsolutePath(entry, storeRelativePath),
    getStateKeysFromStore(storeContent),
  ];
}
