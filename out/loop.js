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
const util_1 = require("./util");
const modules_1 = require("./traverse/modules");
const utils_1 = require("./traverse/utils");
const statusBarItem_1 = require("./statusBarItem");
const watcher_1 = require("./watcher");
const stateProvider_1 = require("./provider/stateProvider");
const gettersProvider_1 = require("./provider/gettersProvider");
const emptyModule = {
    namespace: '',
    state: [],
};
class VueThis$Store {
    constructor(ctx, rootPath) {
        this._outputChannel = vscode_1.window.createOutputChannel('VueThis$Store');
        this._statusBarItem = new statusBarItem_1.VueThisStoreStatusBarItem();
        this._watcher = null;
        this._extensionContext = ctx;
        if (rootPath === undefined) {
            return;
        }
        else {
            this._rootPath = rootPath;
        }
        this._entrancePath = path.resolve(this._rootPath, 'src/main.js');
        this.initCommands();
        this.start();
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
        this._watcher.on('change', () => {
            this.restart();
        });
        this._extensionContext.subscriptions.push(vscode_1.languages.registerCompletionItemProvider('vue', this._stateProvider, '.'), vscode_1.languages.registerCompletionItemProvider('vue', this._mapStateProvider, "'", '"'), vscode_1.languages.registerCompletionItemProvider('vue', this._gettersProvider, '.'));
    }
    restart() {
        this._statusBarItem.setStatus(0);
        let [_, storeInfo, setStoreActionStatus] = this.startFromEntry();
        this._stateProvider.setStateKeysList(storeInfo);
        this._mapStateProvider.setStateKeysList(storeInfo);
        this._gettersProvider.setGettersKeyList(storeInfo);
        this._statusBarItem.setStatus(setStoreActionStatus);
    }
    setEntrancePath(entrancePath) {
        this._entrancePath = entrancePath;
    }
    startFromEntry() {
        if (!fs.existsSync(this._entrancePath)) {
            this._outputChannel.clear();
            this._outputChannel.appendLine('please specify your project entrance path');
            return ['', emptyModule, -1];
        }
        let { fileContent: entryFileContent, status: entryFileStatus, } = util_1.getFileContent(this._entrancePath);
        if (entryFileContent === '') {
            return ['', emptyModule, entryFileStatus];
        }
        let entryFileContentAst = util_1.getAstOfCode(entryFileContent);
        let storeRelativePath = util_1.getStoreEntryRelativePath(entryFileContentAst);
        let storeAbsolutePath = util_1.getAbsolutePath(this._entrancePath, storeRelativePath);
        let { objAst, m2pmap, defmap, cwf, lineOfFile } = utils_1.getVuexConfig(storeAbsolutePath);
        try {
            let storeInfo = { namespace: '' };
            modules_1.parseModuleAst({
                objAst,
                m2pmap,
                defmap,
                cwf,
                lineOfFile,
            }, storeInfo);
            // debugger;
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