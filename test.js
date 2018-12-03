const parser = require('@babel/parser');

let file = `
let a = 3;
`;

console.log(parser.parse(file));
