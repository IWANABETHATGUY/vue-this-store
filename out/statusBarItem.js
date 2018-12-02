"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class VueThisStoreStatusBarItem {
    constructor() {
        this._statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 4);
        this.frames = process.platform === 'win32'
            ? ['-', '\\', '|', '/']
            : ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        this.i = 0;
        this.IntervalId = null;
        this._barItemTitle = 'VueThis$Store';
        this._statusBarItem.show();
        this.setStatus(0);
    }
    /**
     * @param {number} status 1代表正确加载✔️,0代表正在加载,-1代表加载错误❌
     *
     * @memberOf VueThisStoreStatusBarItem
     */
    setStatus(status) {
        if (status === 0) {
            this.startScanning();
        }
        else if (status === 1) {
            this.stopScanning();
            this._statusBarItem.text = `${this._barItemTitle}:$(check)`;
        }
        else if (status === -1) {
            this.stopScanning();
            this._statusBarItem.text = `${this._barItemTitle}:$(x)`;
        }
    }
    startScanning() {
        this.IntervalId = setInterval(() => {
            let frame = this.frames[(this.i = ++this.i % this.frames.length)];
            this._statusBarItem.text = `${this._barItemTitle}:${frame}`;
        }, 100);
    }
    stopScanning() {
        clearInterval(this.IntervalId);
    }
    dispose() {
        this._statusBarItem.dispose();
    }
}
exports.VueThisStoreStatusBarItem = VueThisStoreStatusBarItem;
//# sourceMappingURL=statusBarItem.js.map