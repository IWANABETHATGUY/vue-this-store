import { window, StatusBarItem, StatusBarAlignment } from 'vscode';

export class VueThisStoreStatusBarItem {
  private _statusBarItem: StatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Left,
    4,
  );
  private frames =
    process.platform === 'win32'
      ? ['-', '\\', '|', '/']
      : ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private i = 0;
  private IntervalId = null;
  private _barItemTitle: string;
  constructor() {
    this._barItemTitle = 'VueThis$Store';
    this._statusBarItem.show();
    this.setStatus(0);
  }

  /**
   * @param {number} status 1代表正确加载✔️,0代表正在加载,-1代表加载错误❌
   *
   * @memberOf VueThisStoreStatusBarItem
   */
  public setStatus(status: number) {
    if (status === 0) {
      this.startScanning();
    } else if (status === 1) {
      this.stopScanning();
      this._statusBarItem.text = `${this._barItemTitle}:$(check)`;
    } else if (status === -1) {
      this.stopScanning();
      this._statusBarItem.text = `${this._barItemTitle}:$(x)`;
    }
  }
  private startScanning() {
    this.IntervalId = setInterval(() => {
      let frame = this.frames[(this.i = ++this.i % this.frames.length)];
      this._statusBarItem.text = `${this._barItemTitle}:${frame}`;
    }, 100);
  }
  private stopScanning() {
    clearInterval(this.IntervalId);
  }
  dispose() {
    this._statusBarItem.dispose();
  }
}
