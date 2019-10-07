import {
  DefinitionProvider,
  TextDocument,
  Position,
  CancellationToken,
  ProviderResult,
  Location,
  Uri,
} from 'vscode';
import { StoreTreeInfo } from '../traverse/normal/modules';
import { Nullable } from '../type';
import { getMapGMACursorInfo } from '../util/completionUtil';
import { getAstOfCode } from '../util/commonUtil';
export class StoreMutationDefination implements DefinitionProvider {
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
    const reg = /((?:this\.)?(?:\$store\.)\s*commit\(\s*)('[^']+'|"[^"]+")[\s\S]+?\)/g;
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
      if (lastModule && lastModule.mutations) {
        const mutationName = namespaceList.pop();
        const mutation = lastModule.mutations.find(act => {
          return act.identifier === mutationName;
        });
        if (mutation) {
          return new Location(
            Uri.file(mutation.parent.abPath),
            new Position(mutation.position.line - 1, mutation.position.column),
          );
        }
      }
    }
    return null;
  }
}

export class StoreMapMutationDefination implements DefinitionProvider {
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
    console.time('mapMutationsDefination');
    let reg = /\bmapMutations\((?:'[^']*'|"[^"]*"\s*\,)?\s*(?:[\s\S]*?)\)/g;
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
          .filter(Boolean)
          .join('.')
          .split('.');
        const clickPrefixNamespace = !cursorInfo.secondNameSpace;
        const lastModule: Nullable<StoreTreeInfo> = namespaceList
          .slice(0, namespaceList.length - Number(!clickPrefixNamespace))
          .reduce((pre, cur) => {
            if (pre !== null) {
              let modules = pre['modules'];
              return modules && modules[cur] ? modules[cur] : null;
            }
            return pre;
          }, this.storeInfo);
        if (lastModule) {
          console.timeEnd('mapMutationsDefination');
          if (clickPrefixNamespace) {
            return new Location(
              Uri.file(lastModule.abPath),
              new Position(0, 0),
            );
          }
          if (!lastModule.mutations) return null;
          const mutationName = namespaceList.pop();
          const mutation = lastModule.mutations.find(act => {
            return act.identifier === mutationName;
          });
          if (mutation) {
            return new Location(
              Uri.file(
                mutation.parent ? mutation.parent.abPath : mutation.abPath,
              ),
              new Position(
                mutation.position.line - 1,
                mutation.position.column,
              ),
            );
          }
        }
      }
    }

    return undefined;
  }
}
