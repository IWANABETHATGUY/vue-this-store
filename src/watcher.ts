import chokidar = require('chokidar');
import { dirname, extname } from 'path';

export function generateWatcher(originpath) {
  let ext: string = extname(originpath);
  let realPath: string = originpath;
  if (ext.length > 0) {
    realPath = dirname(originpath);
  }
  debugger;
  const watcher = chokidar.watch(realPath, {
    persistent: true,
  });
  return watcher;
}
