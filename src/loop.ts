import * as path from 'path';
import * as fs from 'fs';
import { window, ExtensionContext, commands, languages } from 'vscode';
import {
  getFileContent,
  getStoreEntryRelativePath,
  getAstOfCode,
  getAbsolutePath,
} from './util';
import { parseModuleAst, ModuleInfo } from './traverse/modules';
import { getVuexConfig } from './traverse/utils';
import { VueThisStoreStatusBarItem } from './statusBarItem';
import { generateWatcher } from './watcher';
import {
  storeStateProvider,
  storeMapStateProvider,
} from './provider/stateProvider';
import { storeGettersProvider } from './provider/gettersProvider';

type setStoreStatus = 1 | -1;
const emptyModule: ModuleInfo = {
  namespace: '',
  state: [],
};

export default class VueThis$Store {
  private _outputChannel = window.createOutputChannel('VueThis$Store');
  private _statusBarItem = new VueThisStoreStatusBarItem();
  private _rootPath: string;
  private _entrancePath: string;
  private _extensionContext: ExtensionContext;
  private _watcher = null;

  private _stateProvider: storeStateProvider;
  private _mapStateProvider: storeMapStateProvider;
  private _gettersProvider: storeGettersProvider;

  constructor(ctx: ExtensionContext, rootPath: string) {
    this._extensionContext = ctx;
    if (rootPath === undefined) {
      return;
    } else {
      this._rootPath = rootPath;
    }
    this._entrancePath = path.resolve(this._rootPath, 'src/main.js');
    this.initCommands();
    this.start();
  }

  private initCommands() {
    let root = this._rootPath;
    this._extensionContext.subscriptions.push(
      commands.registerCommand(
        'VueThis$Store.specify entrance path',
        async () => {
          let newEntrance = await window.showInputBox({
            value: root,
          });
          if (newEntrance) {
            this.setEntrancePath(newEntrance);
            this.restart();
          }
        },
        this,
      ),
    );
  }
  private start() {
    this._extensionContext.subscriptions.push(this._statusBarItem);
    let [
      storeAbsolutePath,
      storeInfo,
      setStoreActionStatus,
    ] = this.startFromEntry();
    this._statusBarItem.setStatus(setStoreActionStatus);
    this._watcher = generateWatcher(storeAbsolutePath);

    this._stateProvider = new storeStateProvider(storeInfo);
    this._mapStateProvider = new storeMapStateProvider(storeInfo);
    this._gettersProvider = new storeGettersProvider(storeInfo);

    this._watcher.on('change', () => {
      this.restart();
    });

    this._extensionContext.subscriptions.push(
      languages.registerCompletionItemProvider('vue', this._stateProvider, '.'),
      languages.registerCompletionItemProvider(
        'vue',
        this._mapStateProvider,
        "'",
        '"',
      ),
      languages.registerCompletionItemProvider(
        'vue',
        this._gettersProvider,
        '.',
      ),
    );
  }

  private restart() {
    this._statusBarItem.setStatus(0);
    let [_, storeInfo, setStoreActionStatus] = this.startFromEntry();
    this._stateProvider.setStateKeysList(storeInfo);
    this._mapStateProvider.setStateKeysList(storeInfo);
    this._gettersProvider.setGettersKeyList(storeInfo);
    this._statusBarItem.setStatus(setStoreActionStatus);
  }
  public setEntrancePath(entrancePath: string) {
    this._entrancePath = entrancePath;
  }

  private startFromEntry(): [string, ModuleInfo, setStoreStatus] {
    if (!fs.existsSync(this._entrancePath)) {
      this._outputChannel.clear();
      this._outputChannel.appendLine(
        'please specify your project entrance path',
      );
      return ['', emptyModule, -1];
    }
    let {
      fileContent: entryFileContent,
      status: entryFileStatus,
    } = getFileContent(this._entrancePath);
    if (entryFileContent === '') {
      return ['', emptyModule, entryFileStatus];
    }
    let entryFileContentAst = getAstOfCode(entryFileContent);
    let storeRelativePath: string = getStoreEntryRelativePath(
      entryFileContentAst,
    );

    let storeAbsolutePath = getAbsolutePath(
      this._entrancePath,
      storeRelativePath,
    );
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
      // debugger;
      return [storeAbsolutePath, storeInfo, 1];
    } catch (err) {
      this._outputChannel.clear();
      this._outputChannel.appendLine(err);
      return [storeAbsolutePath, emptyModule, -1];
    }
  }
}
