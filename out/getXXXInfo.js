"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
exports.default = ({ storeAstMap, moduleOrPathMap, abPath, storeContentLines, }) => ({
    module(property) {
        let moduleInfo = { state: [], abPath };
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
    state(property) {
        if (property.shorthand) {
            if (storeAstMap[property.key.name]) {
                return util_1.getStateInfoList(storeAstMap[property.key.name], storeContentLines);
            }
            // TODO: 需要做state从外部文件中引入的情况判断
        }
        else {
            if (property.value.type === 'ObjectExpression') {
                return util_1.getStateInfoList(property.value, storeContentLines);
            }
        }
    },
});
//# sourceMappingURL=getXXXInfo.js.map