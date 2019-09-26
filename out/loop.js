"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const vscode_1 = require("vscode");
const commonUtil_1 = require("./util/commonUtil");
const modules_1 = require("./traverse/modules");
const traverseUtil_1 = require("./util/traverseUtil");
const statusBarItem_1 = require("./statusBarItem");
const watcher_1 = require("./watcher");
const stateProvider_1 = require("./completion/stateProvider");
const gettersProvider_1 = require("./completion/gettersProvider");
const mutationsProvider_1 = require("./completion/mutationsProvider");
const actionsProvider_1 = require("./completion/actionsProvider");
const thisProvider_1 = require("./completion/thisProvider");
const mutationsProvider_2 = require("./signature/mutationsProvider");
const emptyModule = {
    namespace: '',
    state: [],
};
class VueThis$Store {
    constructor(ctx, rootPath) {
        this.thisCompletionList = [];
        this._outputChannel = vscode_1.window.createOutputChannel('VueThis$Store');
        this._statusBarItem = new statusBarItem_1.VueThisStoreStatusBarItem();
        this._watcher = null;
        let timeStart = Number(new Date());
        this._extensionContext = ctx;
        if (rootPath === undefined) {
            return;
        }
        else {
            this._rootPath = rootPath;
        }
        vscode_1.window.onDidChangeActiveTextEditor(e => {
            // console.log('uri', e.document.uri);
            if (e.document.languageId === 'vue') {
                if (!this._previousVuePath ||
                    e.document.uri.path !== this._previousVuePath) {
                    this.setNewCompletionList(e.document);
                    this._previousVuePath = e.document.uri.path;
                }
            }
        });
        vscode_1.workspace.onDidSaveTextDocument((document) => {
            if (document.uri.path === this._previousVuePath) {
                this.setNewCompletionList(document);
            }
        });
        this._entrancePath = path.resolve(this._rootPath, 'src/main.js');
        this.initCommands();
        this.start();
        let timeEnd = Number(new Date());
        this._outputChannel.appendLine(`Init information cost ${timeEnd - timeStart} ms`);
    }
    setNewCompletionList(document) {
        const newCompletionList = this._thisProvider.getNewThisCompletionList(document);
        this._thisProvider.setThisCompletionList(newCompletionList);
        this._mutationSignatureProvider.setThisCompletionList(newCompletionList);
    }
    initCommands() {
        let root = this._rootPath;
        this._extensionContext.subscriptions.push(vscode_1.commands.registerCommand('VueThis$Store.specify entrance path', () => __awaiter(this, void 0, void 0, function* () {
            let newEntrance = yield vscode_1.window.showInputBox({
                value: root,
            });
            if (newEntrance) {
                this.setEntrancePath(newEntrance);
                this.restart();
            }
        }), this));
    }
    start() {
        this._extensionContext.subscriptions.push(this._statusBarItem);
        let [storeAbsolutePath, storeInfo, setStoreActionStatus,] = this.startFromEntry();
        this._statusBarItem.setStatus(setStoreActionStatus);
        this._watcher = watcher_1.generateWatcher(storeAbsolutePath);
        this._stateProvider = new stateProvider_1.storeStateProvider(storeInfo);
        this._mapStateProvider = new stateProvider_1.storeMapStateProvider(storeInfo);
        this._gettersProvider = new gettersProvider_1.storeGettersProvider(storeInfo);
        this._mapGettersProvider = new gettersProvider_1.storeMapGettersProvider(storeInfo);
        this._mutationsProvider = new mutationsProvider_1.storeMutationsProvider(storeInfo);
        this._mapMutationsProvider = new mutationsProvider_1.storeMapMutationsProvider(storeInfo);
        this._actionsProvider = new actionsProvider_1.storeActionsProvider(storeInfo);
        this._mapActionsProvider = new actionsProvider_1.storeMapActionsProvider(storeInfo);
        this._thisProvider = new thisProvider_1.thisProvider(storeInfo, this.thisCompletionList);
        this._mutationSignatureProvider = new mutationsProvider_2.mutationsSignatureProvider(this.thisCompletionList);
        this._watcher.on('change', () => {
            this.restart();
        });
        this.registerCompletionProvider();
        this.registerSignatureProvider();
    }
    registerCompletionProvider() {
        this._extensionContext.subscriptions.unshift(vscode_1.languages.registerCompletionItemProvider('vue', this._stateProvider, '.'), vscode_1.languages.registerCompletionItemProvider('vue', this._mapStateProvider, "'", '"', '/', '.'), vscode_1.languages.registerCompletionItemProvider('vue', this._gettersProvider, '.'), vscode_1.languages.registerCompletionItemProvider('vue', this._mapGettersProvider, "'", '"', '/'), vscode_1.languages.registerCompletionItemProvider('vue', this._mutationsProvider, '"', "'", '/'), vscode_1.languages.registerCompletionItemProvider('vue', this._mapMutationsProvider, "'", '"', '/'), vscode_1.languages.registerCompletionItemProvider('vue', this._actionsProvider, '"', "'", '/'), vscode_1.languages.registerCompletionItemProvider('vue', this._mapActionsProvider, "'", '"', '/'), vscode_1.languages.registerCompletionItemProvider('vue', this._thisProvider, '.'));
    }
    registerSignatureProvider() {
        this._extensionContext.subscriptions.unshift(vscode_1.languages.registerSignatureHelpProvider('*', this._mutationSignatureProvider, '(', ','));
    }
    restart() {
        this._statusBarItem.setStatus(0);
        let [_, storeInfo, setStoreActionStatus] = this.startFromEntry();
        this._stateProvider.setStoreInfo(storeInfo);
        this._mapStateProvider.setStoreInfo(storeInfo);
        this._gettersProvider.setStoreInfo(storeInfo);
        this._mapGettersProvider.setStoreInfo(storeInfo);
        this._mapMutationsProvider.setStoreInfo(storeInfo);
        this._mutationsProvider.setStoreInfo(storeInfo);
        if (setStoreActionStatus === -1) {
        }
        this._statusBarItem.setStatus(setStoreActionStatus);
    }
    setEntrancePath(entrancePath) {
        this._entrancePath = entrancePath;
    }
    startFromEntry() {
        // TODO: 这里可能会修改别人传入的新entrance:
        if (!fs.existsSync(this._entrancePath)) {
            if (!fs.existsSync(this._rootPath + '/src/index.js')) {
                this._outputChannel.clear();
                this._outputChannel.appendLine('please specify your project entrance path');
                this._outputChannel.show();
                return ['', emptyModule, -1];
            }
            else {
                this._entrancePath = this._rootPath + '/src/index.js';
            }
        }
        let { fileContent: entryFileContent, status: entryFileStatus, } = commonUtil_1.getFileContent(this._entrancePath);
        if (entryFileContent === '') {
            return ['', emptyModule, entryFileStatus];
        }
        let entryFileContentAst = commonUtil_1.getAstOfCode(entryFileContent);
        let storeRelativePath = commonUtil_1.getStoreEntryRelativePath(entryFileContentAst);
        let storeAbsolutePath = commonUtil_1.getAbsolutePath(this._entrancePath, storeRelativePath);
        let { objAst, m2pmap, defmap, cwf, lineOfFile } = traverseUtil_1.getVuexConfig(storeAbsolutePath);
        try {
            let storeInfo = { namespace: '' };
            modules_1.parseModuleAst({
                objAst,
                m2pmap,
                defmap,
                cwf,
                lineOfFile,
            }, storeInfo);
            return [storeAbsolutePath, storeInfo, 1];
        }
        catch (err) {
            this._outputChannel.clear();
            this._outputChannel.appendLine(err);
            return [storeAbsolutePath, emptyModule, -1];
        }
    }
}
exports.default = VueThis$Store;
//# sourceMappingURL=loop.js.map