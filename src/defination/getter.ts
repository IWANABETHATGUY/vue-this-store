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

export class StoreMapGettersDefination implements DefinitionProvider {
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
    console.time('mapGettersDefination')
    let reg = /\bmapGetters\((?:'[^']*'|"[^"]*"\s*\,)?\s*(?:[\s\S]*?)\)/g;
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
      const cursorInfo = getMapGMACursorInfo(
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
        if (lastModule && lastModule.getters) {
          console.timeEnd('mapGettersDefination')
          if (clickPrefixNamespace) {
            return new Location(
              Uri.file(lastModule.abPath),
              new Position(0, 0),
            );
          }
          const getterName = namespaceList.pop();
          const getter = lastModule.getters.find(act => {
            return act.identifier === getterName;
          });
          if (getter) {
            return new Location(
              Uri.file(getter.parent ? getter.parent.abPath : getter.abPath),
              new Position(getter.position.line - 1, getter.position.column),
            );
          }
        }
      }
    }

    return undefined;
  }
}
