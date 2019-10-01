import {
  DefinitionProvider,
  TextDocument,
  Position,
  CancellationToken,
  ProviderResult,
  Location,
  Disposable,
  Uri,
} from 'vscode';
import { StoreTreeInfo, ActionInfo } from '../traverse/normal/modules';
import { Nullable } from '../type';
export class StoreActionDefination implements DefinitionProvider {
  private storeInfo: StoreTreeInfo;
  constructor(storeInfo: StoreTreeInfo) {
    this.storeInfo = storeInfo;
  }
  public setStoreInfo(newStoreInfo: StoreTreeInfo) {
    this.storeInfo = newStoreInfo;
  }
  provideDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
  ): ProviderResult<Location | Location[]> {
    const reg = /((?:this\.)?(?:\$store\.)\s*dispatch\(\s*)('[^']+'|"[^"]+")[\s\S]+?\)/g;
    const sourceCode: string = document.getText();
    let regExec: RegExpExecArray = null;
    const positionNumber = document.offsetAt(position);
    while ((regExec = reg.exec(sourceCode))) {
      const pos = regExec.index;
      const [, prefix, namespace] = regExec;
      const start: number = pos + prefix.length;
      const end: number = start + namespace.length;
      if (positionNumber > start && positionNumber < end) {
        break;
      }
    }
    if (regExec) {
      let [, , namespace] = regExec;
      const namespaceList = namespace
        .slice(1, -1)
        .split('/')
        .filter(Boolean);
      const lastModule: Nullable<StoreTreeInfo> = namespaceList
        .slice(0, -1)
        .reduce((pre, cur) => {
          if (pre !== null) {
            let modules = pre['modules'];
            return modules && modules[cur] ? modules[cur] : null;
          }
          return pre;
        }, this.storeInfo);
      if (lastModule && lastModule.actions) {
        const actionName = namespaceList.pop();
        const action = lastModule.actions.find(act => {
          return act.identifier === actionName;
        });
        if (action) {
          return new Location(
            Uri.file(action.parent.abPath),
            new Position(action.position.line - 1, action.position.column)
          );
        }
      }
    }
    return null;
  }
}
