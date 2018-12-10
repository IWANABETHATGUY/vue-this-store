# vue-this-store

通过使用 ast 和正则表达式，获取 store 中所有文件的定义,在用户使用.vue 文件中时给
出详细的提示，目前支持大多数 vuex 官网中定义的例子

## 安装

在扩展中搜索 VueThis\$Store,安装即可。

## 使用

当你打开一个.vue 文件时，插件会扫描从你的入口文件，开始扫描得到你的 store 所有模
块，以及模块中的(actions,mutations, getters, state)，保存必要的定义信息以给出提
示。当你的 vscode 插件的左下角有如下图标  
![statusBarItem](https://camo.githubusercontent.com/65886ccab9cc85ab8cf11e59f6d739827329b716/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f7374617475734261724974656d2e6a7067)  
那么代表扫描 成功，可以得到正确的提示，如果最右边是 x 则表示发生错误（我设置的默
认的入口路径是工作根路径下的 src/main.js，如果失败，会使用备用入口文件
,src/index.js，如果依然失败，会提示错误让你自己声明入口文件）。
你`shift+(cmd|ctrl)+p` 输入 specify entrance path 输入你的 index 文件，(就是你生
成一个 vue 实例的地方),回车。插件会重新扫描，入口文件。

## 特性

- 支持最基本的`this.$store.state.count`类型的提示，当你在其他的 module 中定义了
  其他的 state 时， 可以得到下一层 module 和所有相应 state 的提示。
  ![state](https://camo.githubusercontent.com/254611df3a09c9272d92ca5d992fd7550944e1a3/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f73746174652e676966)
- 同时支持 mapState，当输入第一个参数时，仅仅提示所有可能的下一个 module（设置了
  namespace 的 module） 和官网的机制一致。当设置了命名空间，只会提示当前命名空间
  下的 state。
  ![mapState](https://camo.githubusercontent.com/8c7db5bed3b832acc875915d590d29c6b139bc81/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f6d617073746174652e676966)
- 支持 从`this.$store.getters.xxx`这样的形式直接获取 getter,也支持 mapGetters 中
  第二个参数是数组或者对象的形式
  ![mapGetters](https://camo.githubusercontent.com/ed2e36f338acef138ff3cef7ac5ba02292c270b0/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f6d6170676574746572732e676966)
- 同理支持`this.$store.commit` 和`this.$store.dispatch` 提示
  ![commit](https://camo.githubusercontent.com/9232b7f06a643196e89eae18123bc7a7f4b25418/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f636f6d6d69742e676966)

![dispatch](https://camo.githubusercontent.com/dea3e7f1c90e968ea45da2e4b7dfb8c4f097629e/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f64697370617463682e676966)

- 支持 mapMutations 参数为数组和对象提示
  ![mapMutations](https://camo.githubusercontent.com/5ba84806b45f9305bb7d4b7eb251d72ef135879f/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f6d61704d75746174696f6e732e676966)

- 支持 mapActions 参数为数组和对象提示
  ![mapActions](https://camo.githubusercontent.com/514de30dbdafcd119094e832454aea2502102300/687474703a2f2f7675652d746869732d73746f72652e746573742e757063646e2e6e65742f6d6170416374696f6e732e676966)
- 监听你 store 文件夹的变动，当文件发生变动，会重新收集定义信息，提示也会更新

## 一些提示

因为我没有什么使用大型的应用的经验，所以测试的项目不是很多，我再 github 上找了一
个比较经典的项目[vue-elm](https://github.com/bailicangdu/vue2-elm), 并通过了测试
。可能会有其他没有发现的 bug，如果你在使用中发现任何的 bug，你可以提 issue，最好
能给我 store 的目录结构，最最好可以给我每个原先 store 目录下所有文件，当然这可能
涉及一些机密，你可以再原结构不变的情况下， 保留几条测试数据就更好了。同时也非常
希望大家可以给我更多建议，希望这个 vscode 插件能够帮助到广大开发者。:smile:

## 目前存在的问题

- 不能向 1.28 及以下兼容，只能最新版本。这个问题目前无法解决，我也是第一次开发
  vscode 插件，对 vscode 兼容这一块不太了解。
- 没有友好的错误提示。
- 因为 vuex 中模块的写法很多，可以直接在对象中定义，可以从外部引入，可以先定义在
  文件中定义在直接使用`{mutations}`这样的方法定义，可能有些写法没有覆盖到无法得
  到提示。

## 补充

能看到这里，说明你还是有点认可这个项目的吧，所以先厚着脸皮放下自己的项目链接吧。

> 项目地址： [vue-this-store](https://github.com/IWANABETHATGUY/vue-this-store)

代码写的不够好，轻拍^-^，提的 issue 可能短时间不会解决，马上要期末了，之后会持续
维护这个项目，如果对你有帮助，给个 star 吧^\_^.
