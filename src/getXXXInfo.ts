import { ModuleInfo, StoreAstMap, ModuleOrPathMap, StateInfo } from './type';
import { BaseNode, ObjectExpression, ObjectProperty } from '@babel/types';
import { getStateInfoList } from './util';

interface ModuleInfoConfig {
  storeAstMap: StoreAstMap;
  moduleOrPathMap: ModuleOrPathMap;
  abPath: string;
  storeContentLines: string[];
}
export default ({
  storeAstMap,
  moduleOrPathMap,
  abPath,
  storeContentLines,
}: ModuleInfoConfig): object => ({
  module(property: ObjectProperty): ModuleInfo {
    let moduleInfo: ModuleInfo = { state: [], abPath };
    return moduleInfo;
    //   if (StateProperty.shorthand) {
    //     if (storeAstMap[StateProperty.key.name]) {
    //       let Obj: ObjectExpression = storeAstMap[
    //         StateProperty.key.name
    //       ] as ObjectExpression;
    //       moduleInfo.state = getStateInfoList(Obj, storeContentLines);
    //     }
    //   } else {
    //     moduleInfo.state = getStateInfoList(
    //       StateProperty.value as ObjectExpression,
    //       storeContentLines,
    //     );
    //   }
    // }
  },
  state(property: ObjectProperty): StateInfo[] {
    if (property.shorthand) {
      if (storeAstMap[property.key.name]) {
        return getStateInfoList(
          storeAstMap[property.key.name] as ObjectExpression,
          storeContentLines,
        );
      }
      // TODO: 需要做state从外部文件中引入的情况判断
    } else {
      if (property.value.type === 'ObjectExpression') {
        return getStateInfoList(
          property.value as ObjectExpression,
          storeContentLines,
        );
      }
    }
  },
});
