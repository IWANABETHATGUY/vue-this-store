import * as path from 'path';
import * as fs from 'fs';
import {
  window,
  ExtensionContext,
  commands,
  languages,
  TextDocument,
  workspace,
} from 'vscode';
import {
  getFileContent,
  getStoreEntryRelativePath,
  getAstOfCode,
  getAbsolutePath,
  hasNuxtConfig,
} from './util/commonUtil';
import { parseModuleAst, StoreTreeInfo } from './traverse/normal/modules';
import { getVuexConfig } from './util/traverseUtil';
import { VueThisStoreStatusBarItem } from './statusBarItem';
import { generateWatcher } from './watcher';
import {
  StoreStateProvider,
  storeMapStateProvider,
} from './completion/stateProvider';
import {
  StoreGettersProvider,
  StoreMapGettersProvider,
} from './completion/gettersProvider';
import {
  StoreMapMutationsProvider,
  StoreMutationsProvider,
} from './completion/mutationsProvider';
import {
  StoreActionsProvider,
  StoreMapActionsProvider,
} from './completion/actionsProvider';
import { ThisProvider, ThisCompletionInfo } from './completion/thisProvider';
import { MutationsSignatureProvider } from './signature/mutationsProvider';
import { StatusBarItemStatus } from './type';
import { getNuxtStoreInfoFromDirectory } from './traverse/nuxt';
import {
  StoreActionDefination,
  StoreMapActionDefination,
} from './defination/action';
import {
  StoreMutationDefination,
  StoreMapMutationDefination,
} from './defination/mutation';
import { StoreMapGettersDefination } from './defination/getter';
import { StoreMapStateDefination } from './defination/state';
const emptyModule: StoreTreeInfo = {
  namespace: '',
  state: [],
};

export default class VueThis$Store {
  private thisCompletionList: ThisCompletionInfo[] = [];
  private _outputChannel = window.createOutputChannel('VueThis$Store');
  private _statusBarItem = new VueThisStoreStatusBarItem();
  private _rootPath: string;
  private _entrancePath: string;
  private _extensionContext: ExtensionContext;
  private _watcher = null;

  private _previousVuePath: string;

  private _stateProvider: StoreStateProvider;
  private _mapStateProvider: storeMapStateProvider;
  private _gettersProvider: StoreGettersProvider;
  private _mapGettersProvider: StoreMapGettersProvider;
  private _mapMutationsProvider: StoreMapMutationsProvider;
  private _mutationsProvider: StoreMutationsProvider;
  private _actionsProvider: StoreActionsProvider;
  private _mapActionsProvider: StoreMapActionsProvider;
  private _thisProvider: ThisProvider;

  private _mutationSignatureProvider: MutationsSignatureProvider;
  private _mode: 'nuxt' | 'normal' | 'error';
  private _attemptionEntryPathList = [
    'src/index.js',
    'src/app.js',
    'src/main.js',
  ];
  private _actionDefinationProvider: StoreActionDefination;
  private _mutationDefinationProvider: StoreMutationDefination;
  private _mapActionDefinationProvider: StoreMapActionDefination;
  private _mapMutationDefinationProvider: StoreMapMutationDefination;
  private _mapGetterDefinationProvider: StoreMapGettersDefination;
  private _mapStateDefinationProvider: StoreMapStateDefination;
  constructor(ctx: ExtensionContext, rootPath: string) {
    let timeStart = Date.now();
    this._extensionContext = ctx;
    if (rootPath === undefined) {
      this._mode = 'error';
      return;
    } else {
      this._rootPath = rootPath;
    }
    window.onDidChangeActiveTextEditor(e => {
      if (e.document.languageId === 'vue') {
        if (
          !this._previousVuePath ||
          e.document.uri.path !== this._previousVuePath
        ) {
          this.setNewCompletionList(e.document);
          this._previousVuePath = e.document.uri.path;
        }
      }
    });

    workspace.onDidSaveTextDocument((document: TextDocument) => {
      if (document.uri.path === this._previousVuePath) {
        this.setNewCompletionList(document);
      }
    });

    this.initCommands();
    this.start();
    let timeEnd = Date.now();
    this._outputChannel.appendLine(
      `Init information cost ${timeEnd - timeStart} ms`,
    );
  }

  private setNewCompletionList(document: TextDocument) {
    const newCompletionList = this._thisProvider.getNewThisCompletionList(
      document,
    );
    this._thisProvider.setThisCompletionList(newCompletionList);
    this._mutationSignatureProvider.setThisCompletionList(newCompletionList);
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
    let [storeAbsolutePath, storeInfo] = this.startFromEntry();
    const status: StatusBarItemStatus = storeAbsolutePath ? 1 : -1;
    this._statusBarItem.setStatus(status);
    this._watcher = generateWatcher(storeAbsolutePath);

    this._stateProvider = new StoreStateProvider(storeInfo);
    this._mapStateProvider = new storeMapStateProvider(storeInfo);
    this._gettersProvider = new StoreGettersProvider(storeInfo);
    this._mapGettersProvider = new StoreMapGettersProvider(storeInfo);
    this._mutationsProvider = new StoreMutationsProvider(storeInfo);
    this._mapMutationsProvider = new StoreMapMutationsProvider(storeInfo);
    this._actionsProvider = new StoreActionsProvider(storeInfo);
    this._mapActionsProvider = new StoreMapActionsProvider(storeInfo);

    this._actionDefinationProvider = new StoreActionDefination(storeInfo);
    this._mutationDefinationProvider = new StoreMutationDefination(storeInfo);
    this._mapActionDefinationProvider = new StoreMapActionDefination(storeInfo);
    this._mapMutationDefinationProvider = new StoreMapMutationDefination(
      storeInfo,
    );
    this._mapGetterDefinationProvider = new StoreMapGettersDefination(
      storeInfo,
    );
    this._mapStateDefinationProvider = new StoreMapStateDefination(storeInfo);

    this._thisProvider = new ThisProvider(storeInfo, this.thisCompletionList);

    this._mutationSignatureProvider = new MutationsSignatureProvider(
      this.thisCompletionList,
    );

    this._watcher.on('change', () => {
      this.restart();
    });

    this.registerCompletionProvider();
    this.registerSignatureProvider();
    this.registerDefinationProvider();
  }
  private registerCompletionProvider() {
    this._extensionContext.subscriptions.unshift(
      languages.registerCompletionItemProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._stateProvider,
        '.',
      ),
      languages.registerCompletionItemProvider(
        'vue',
        this._mapStateProvider,
        "'",
        '"',
        '/',
        '.',
      ),
      languages.registerCompletionItemProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._gettersProvider,
        '.',
      ),
      languages.registerCompletionItemProvider(
        'vue',
        this._mapGettersProvider,
        "'",
        '"',
        '/',
      ),
      languages.registerCompletionItemProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._mutationsProvider,
        '"',
        "'",
        '/',
      ),
      languages.registerCompletionItemProvider(
        'vue',
        this._mapMutationsProvider,
        "'",
        '"',
        '/',
      ),
      languages.registerCompletionItemProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._actionsProvider,
        '"',
        "'",
        '/',
      ),
      languages.registerCompletionItemProvider(
        'vue',
        this._mapActionsProvider,
        "'",
        '"',
        '/',
      ),
      languages.registerCompletionItemProvider('vue', this._thisProvider, '.'),
    );
  }

  private registerSignatureProvider() {
    this._extensionContext.subscriptions.unshift(
      languages.registerSignatureHelpProvider(
        '*',
        this._mutationSignatureProvider,
        '(',
        ',',
      ),
    );
  }

  private registerDefinationProvider() {
    this._extensionContext.subscriptions.push(
      languages.registerDefinitionProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._actionDefinationProvider,
      ),
      languages.registerDefinitionProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._mutationDefinationProvider,
      ),
      languages.registerDefinitionProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._mapActionDefinationProvider,
      ),
      languages.registerDefinitionProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._mapMutationDefinationProvider,
      ),
      languages.registerDefinitionProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._mapGetterDefinationProvider,
      ),
      languages.registerDefinitionProvider(
        [
          { language: 'javascript', scheme: 'file' },
          { language: 'vue', scheme: 'file' },
        ],
        this._mapStateDefinationProvider,
      ),
    );
  }

  private restart() {
    this._statusBarItem.setStatus(0);
    let [storeAbsolutePath, storeInfo] = this.startFromEntry();
    const status: StatusBarItemStatus = storeAbsolutePath ? 1 : -1;

    this._stateProvider.setStoreInfo(storeInfo);
    this._mapStateProvider.setStoreInfo(storeInfo);
    this._gettersProvider.setStoreInfo(storeInfo);
    this._mapGettersProvider.setStoreInfo(storeInfo);
    this._mutationsProvider.setStoreInfo(storeInfo);
    this._mapMutationsProvider.setStoreInfo(storeInfo);
    this._actionsProvider.setStoreInfo(storeInfo);
    this._mapActionsProvider.setStoreInfo(storeInfo);
    this._thisProvider.setStoreInfo(storeInfo);
    this._statusBarItem.setStatus(status);
  }

  public setEntrancePath(entrancePath: string) {
    this._entrancePath = entrancePath;
  }

  /**
   *从给定的入口初始化Store的树状信息
   *
   * @private
   * @returns {[string , StoreTreeInfo]}
   * @return absolutePathOfEntry
   * @memberOf VueThis$Store
   */
  private startFromEntry(): [string, StoreTreeInfo] {
    if (hasNuxtConfig(this._rootPath)) {
      this.setEntrancePath(path.resolve(this._rootPath, 'store'));
      this._mode = 'nuxt';
      return this.generateNuxtStoreInfo();
    } else {
      return this.generateNormalStoreInfo();
    }
  }

  generateNuxtStoreInfo(): [string, StoreTreeInfo] {
    const storeTreeInfo = getNuxtStoreInfoFromDirectory(this._entrancePath);
    return [this._entrancePath, storeTreeInfo];
  }

  private generateNormalStoreInfo(): [string, StoreTreeInfo] {
    if (!this.attemptEntryPath()) {
      return ['', emptyModule];
    }
    this._mode = 'normal';
    let entryFileContent = getFileContent(this._entrancePath);
    if (entryFileContent === '') {
      return ['', emptyModule];
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
      let storeInfo: StoreTreeInfo = { namespace: '' };
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
      return [storeAbsolutePath, storeInfo];
    } catch (err) {
      this._outputChannel.clear();
      this._outputChannel.appendLine(err);
      return ['', emptyModule];
    }
  }

  /**
   * 尝试可能的入口
   *
   * @private
   * @returns
   *
   * @memberOf VueThis$Store
   */
  private attemptEntryPath(): Boolean {
    const result = this._attemptionEntryPathList.some(relativePath => {
      const absolutePath = path.resolve(this._rootPath, relativePath);
      if (fs.existsSync(absolutePath)) {
        this.setEntrancePath(absolutePath);
        return true;
      }
    });
    if (!result) {
      this._outputChannel.clear();
      this._outputChannel.appendLine(
        'please specify your project entrance path',
      );
      this._outputChannel.show();
    }
    return result;
  }
}
