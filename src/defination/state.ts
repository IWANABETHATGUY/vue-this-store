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
import { getMapGMACursorInfo, whichCommit } from '../util/completionUtil';
import { getCursorInfoFromRegExp } from '../completion/mutationsProvider';
import { getAstOfCode } from '../util/commonUtil';
import { getMapStateCursorInfo } from '../completion/stateProvider';

export class StoreMapStateDefination implements DefinitionProvider {
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
    console.time('mapStateDefination')
    let reg = /\bmapState\((?:'[^']*'|"[^"]*"\s*\,)?\s*(?:[\s\S]*?)\)/g;
    const sourceCode: string = document.getText();
    let regExec: RegExpExecArray = null;
    const positionNumber = document.offsetAt(position);
    while ((regExec = reg.exec(sourceCode))) {
      const pos = regExec.index;
      const len = regExec[0].length;
      const end: number = pos + len;
      if (positionNumber > pos && positionNumber < end) {
        break;
      }
    }
    if (regExec) {
      let commitAst = getAstOfCode(regExec[0]);
      
      const cursorInfo = getMapStateCursorInfo(
        commitAst,
        positionNumber - regExec.index,
        true,
      );
      if (cursorInfo) {
        let namespaceList = [cursorInfo.namespace, cursorInfo.secondNameSpace]
          .map(item => item.split('/').join('.'))
          .filter(Boolean).join('.').split('.');
        const clickPrefixNamespace = !cursorInfo.secondNameSpace
        const lastModule: Nullable<StoreTreeInfo> = namespaceList
          .slice(0, namespaceList.length - Number(!clickPrefixNamespace))
          .reduce((pre, cur) => {
            if (pre !== null) {
              let modules = pre['modules'];
              return modules && modules[cur] ? modules[cur] : null;
            }
            return pre;
          }, this.storeInfo);
        if (lastModule && lastModule.state) {
          console.timeEnd('mapstatesDefination')
          if (clickPrefixNamespace) {
            return new Location(
              Uri.file(lastModule.abPath),
              new Position(0, 0),
            );
          }
          const stateName = namespaceList.pop();
          const state = lastModule.state.find(act => {
            return act.identifier === stateName;
          });
          if (state) {
            return new Location(
              Uri.file(state.parent.abPath),
              new Position(state.position.line - 1, state.position.column),
            );
          }
        }
      }
    }

    return undefined;
  }
}
