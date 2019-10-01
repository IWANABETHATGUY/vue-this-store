import { MutationInfo, ActionInfo, StoreTreeInfo } from '../normal/modules';
import {
  VariableDeclarator,
  isObjectExpression,
  isIdentifier,
  ObjectMethod,
  isObjectMethod,
  BaseNode,
} from '@babel/types';

export function parseNuxtMutationsOrActions(
  declarator: VariableDeclarator,
  sourceCode: string,
  parent: StoreTreeInfo,
): MutationInfo[] | ActionInfo[] {
  let mOrAInfoList: MutationInfo[] | ActionInfo[] = [];
  if (isObjectExpression(declarator.init)) {
    const objectExpression = declarator.init;
    objectExpression.properties.forEach((property: ObjectMethod) => {
      if (isObjectMethod(property) && isIdentifier(property.key)) {
        let params: BaseNode[] = property.params;
        let paramList = params.map(param =>
          sourceCode.slice(param.start, param.end),
        );
        mOrAInfoList.push({
          functionDeclarator: `${property.key.name} (${paramList.join(', ')})`,
          params: paramList,
          identifier: property.key.name,
          defination: sourceCode.slice(property.start, property.end),
          position: property.loc.start,
          parent,
        });
      }
    });
  }
  return mOrAInfoList;
}
