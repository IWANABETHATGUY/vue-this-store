## 0.0.7
- 添加了this对于getter，action，mutation，state的提示，对于mapMutation得到的新方法，提供了signature help功能
## 0.0.6

- 修复了 modules 属性不为缩写时不能给出正确提示的 bug
- 添加了 icon

## 0.0.5

支持 mapState 参数为对象的情况，并且支持三种不同函数写法，通过 ast 获取函数的第
一个参数给出更加精确的提示。

## 0.0.4

修复文件从外部引入，且导出方式为 export default Identifier 形式时，报错。

## 0.0.3

添加仓库地址

## 0.0.2

- 支持最基本的`this.$store.state.count`类型的提示，当你在其他的 module 中定义了
  其他的 state 时， 可以得到下一层 module 和所有相应 state 的提示。
- 同时支持 mapState，当输入第一个参数时，仅仅提示所有可能的下一个 module（设置了
  namespace 的 module） 和官网的机制一致。当设置了命名空间，只会提示当前命名空间
  下的 state。
- 支持 从`this.$store.getters.xxx`这样的形式直接获取 getter,也支持 mapGetters 中
  第二个参数是数组或者对象的形式
- 同理支持`this.$store.commit` 和`this.$store.dispatch` 提示

- 支持 mapMutations 参数为数组和对象提示

- 支持 mapActions 参数为数组和对象提示

## 0.0.1
