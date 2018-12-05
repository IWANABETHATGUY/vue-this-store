import { ModuleInfo } from '../traverse/modules';

export function getModuleFromPath(
  obj: ModuleInfo,
  path: string[] | undefined,
): ModuleInfo | undefined {
  if (path === undefined) {
    return obj;
  }
  try {
    return path.reduce((acc, cur) => {
      return acc['modules'][cur];
    }, obj);
  } catch (err) {
    return undefined;
  }
}
