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
const emptyModule: ModuleInfo = {
  namespace: '',
  state: [],
};
export function startFromEntry(
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

  let storeAbsolutePath = getAbsolutePath(entry, storeRelativePath);
  let { objAst, m2pmap, defmap, cwf, lineOfFile } = getVuexConfig(
    storeAbsolutePath,
  );
  try {
    let storeInfo: ModuleInfo = { namespace: '' };
    parseModuleAst(
      {
        objAst,
        m2pmap,
        defmap,
        cwf,
        lineOfFile,
      },
      storeInfo,
    );
    debugger;
    return [storeAbsolutePath, storeInfo, 1];
  } catch (err) {
    console.log(err);
    debugger;
    return [storeAbsolutePath, emptyModule, -1];
  }
}
