import chokidar = require('chokidar');
import { dirname } from 'path';

export function generateWatcher(path) {
  let realPath = dirname(path);
  const watcher = chokidar.watch(realPath, {
    persistent: true,
  });
  return watcher;
}
