import * as path from 'path';
import * as fs from 'fs';
import {
  getFileContent,
  getStoreEntryRelativePath,
  getAstOfCode,
  getAbsolutePath,
} from './util';
import { parseModuleAst, ModuleInfo } from './traverse/modules';
import { getVuexConfig } from './traverse/utils';

type setStoreStatus = 1 | -1;

export function startFromEntry(
  rootPath: string,
): [string, ModuleInfo, setStoreStatus] {
  let entry: string = path.resolve(rootPath, 'src/main.js');
  if (!fs.existsSync(entry)) {
    console.error("you don't have the entry file");
    return ['', {}, -1];
  }
  let {
    fileContent: entryFileContent,
    status: entryFileStatus,
  } = getFileContent(entry);
  if (entryFileContent === '') {
    return ['', {}, entryFileStatus];
  }
  let entryFileContentAst = getAstOfCode(entryFileContent);
  let storeRelativePath: string = getStoreEntryRelativePath(
    entryFileContentAst,
  );

  let storeAbsolutePath = getAbsolutePath(entry, storeRelativePath);
  let { objAst, m2pmap, defmap, cwf, lineOfFile } = getVuexConfig(
    storeAbsolutePath,
  );
  try {
    let storeInfo = parseModuleAst({
      objAst,
      m2pmap,
      defmap,
      cwf,
      lineOfFile,
    });
    debugger;
    return [storeAbsolutePath, storeInfo, 1];
  } catch (err) {
    console.log(err);
    debugger;
    return [storeAbsolutePath, {}, -1];
  }
}
