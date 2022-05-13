# Serverless cdn combo

利用腾讯云 serverless 完成 CDN 回源服务。

本地开发：
```
curl http://localhost:9000/??xps/1.1.1/hello.js&xps/1.1.1/the.js
```

淘宝例子：
```
https://g.alicdn.com/??kissy/k/6.2.4/seed-min.js,kg/global-util/1.0.7/index-min.js,secdev/sufei_data/3.8.7/index.js
```

## 部署

需提供以下环境变量：
- TENCENT_BUCKET: test
- TENCENT_REGION: ap-shanghai
- TENCENT_SECRET_ID: abc
- TENCENT_SECRET_KEY: abc

## 参考
- https://github.com/rgrove/combohandler
- https://github.com/YahooArchive/express-combo
- https://github.com/jayli/combo