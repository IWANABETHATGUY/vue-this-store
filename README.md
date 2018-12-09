# vue-this-store

通过使用 ast 和正则表达式，获取 store 中所有文件的定义,在用户使用.vue 文件中时给
出详细的提示，目前支持大多数 vuex 官网中定义的例子

## 安装

在扩展中搜索 VueThis\$Store,安装即可。

## 使用

当你打开一个.vue 文件时，插件会扫描从你的入口文件，开始扫描得到你的 store 所有模
块，以及模块中的(actions,mutations, getters, state)，保存必要的定义信息以给出提
示。当你的 vscode 插件的左下角有如下图标  
![statusBarItem](http://vue-this-store.test.upcdn.net/statusBarItem.jpg)  
那么代表扫描 成功，可以得到正确的提示，如果最右边是 x 则表示发生错误（我设置的默
认的入口路径是工作根路径下的 src/main.js，如果失败，会使用备用入口文件
,src/index.js，如果依然失败，会提示错误让你自己声明入口文件）。
你`shift+(cmd|ctrl)+p` 输入 specify entrance path 输入你的 index 文件，(就是你生
成一个 vue 实例的地方),回车。插件会重新扫描，入口文件。

## 特性

- 支持最基本的`this.$store.state.count`类型的提示，当你在其他的 module 中定义了
  其他的 state 时， 可以得到下一层 module 和所有相应 state 的提示。
  ![state](http://vue-this-store.test.upcdn.net/state.gif)
- 同时支持 mapState，当输入第一个参数时，仅仅提示所有可能的下一个 module（设置了
  namespace 的 module） 和官网的机制一致。当设置了命名空间，只会提示当前命名空间
  下的 state。 ![mapState](http://vue-this-store.test.upcdn.net/mapstate.gif)
- 支持 从`this.$store.getters.xxx`这样的形式直接获取 getter,也支持 mapGetters 中
  第二个参数是数组或者对象的形式
  ![mapGetters](http://vue-this-store.test.upcdn.net/mapgetters.gif)
- 同理支持`this.$store.commit` 和`this.$store.dispatch` 提示
  ![commit](http://vue-this-store.test.upcdn.net/commit.gif)

![dispatch](http://vue-this-store.test.upcdn.net/dispatch.gif)

- 支持 mapMutations 参数为数组和对象提示
  ![mapMutations](http://vue-this-store.test.upcdn.net/mapMutations.gif)

- 支持 mapActions 参数为数组和对象提示
  ![mapActions](http://vue-this-store.test.upcdn.net/mapActions.gif)

## 一些提示

因为我没有什么使用大型的应用的经验，所以测试的项目不是很多，我再 github 上找了一
个比较经典的项目[vue-elm](https://github.com/bailicangdu/vue2-elm), 并通过了测试
。可能会有其他没有发现的 bug，如果你在使用中发现任何的 bug，你可以提 issue，最
好能给我 store 的目录结构，最最好可以给我每个原先 store 目录下所有文件，当然这可
能涉及一些机密，你可以再原结构不变的情况下， 保留几条测试数据就更好了。同时也非常希
望大家可以给我更多建议，希望这个 vscode 插件能够帮助到广大开发者。:smile:
