const path = require('path');

let base = '/User/fuck/shit/main.js';
function getAbsolutePath(base, relative) {
  let ext = path.extname(base);
  if (ext) {
    base = path.dirname(base);
  }
  let res = path.resolve(base, relative);
  console.log(res);
}
getAbsolutePath(base, './store/');
