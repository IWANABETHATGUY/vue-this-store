const parser = require('@babel/parser');
const generator = require('@babel/generator');
const traverse = require('@babel/traverse');
let file = `
function test() {
  return 3;
}
`;
let ast = parser.parse(file);
traverse.default(ast, {
  Identifier(path) {
    path.node.name = path.node.name
      .split('')
      .reverse()
      .join('');
  },
});
console.log(generator.default(ast, {}).code);
console.log('shit');
