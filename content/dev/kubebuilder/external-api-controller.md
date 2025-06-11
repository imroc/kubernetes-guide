# 创建外部 API 的 controller

有时候控制器需要 watch 外部的 API 资源（不属于本项目的 CRD），可以用下面的方式来创建 controller 脚手架： 

```bash
kubebuilder create api --external-api-domain game.kruise.io --external-api-path github.com/openkruise/kruise-game/apis/v1alpha1 --kind GameServerSet --version v1alpha1 --controller=true --resource=false 
```

## 参考资料

- [Kubebuilder Tutorial: Multi-Version API](https://book.kubebuilder.io/multiversion-tutorial/tutorial)
