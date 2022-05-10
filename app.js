const koa = require('koa');
const process = require('process');
const path = require('path');
const COSSDK = require('cos-nodejs-sdk-v5');
const async = require("async");
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const Bucket = process.env.TENCENT_BUCKET || 'test';
const Region = process.env.TENCENT_REGION || 'ap-shanghai';
const SecretId = process.env.TENCENT_SECRET_ID || 'xxx';
const SecretKey = process.env.TENCENT_SECRET_KEY || 'xxx';

const app = new koa();
const cos = new COSSDK({
  SecretId: SecretId,
  SecretKey: SecretKey
});

app.use(async (ctx, next) => {
  // 得到扩展名
  function getFileExtension(Key) { 
    let ext = path.extname(Key || '').split('.');
    return ext[ext.length - 1];
  }

  // 返回文件格式
  function getContentType(ext) {
    const typeMap = {
      'js': 'application/javascript',
      'css': 'text/css'
    }
    return typeMap[ext]
  }

  // 检查请求是否有效，文件只允许有一个格式
  function check(fileKeyList) {
    let res = true,
        ext = '',
        type = '';
    fileKeyList.forEach((key) => {
      ext = getFileExtension(key)
      type = getContentType(ext)
      if (!ext) {
        res = false
      } else {
        if (!type) {
          res = false
        } else {
          filesExt[ext] = type
        }
      }
    })
    return res ? (Object.keys(filesExt).length == 1) : res
  }

  async function getFile(files) {
    return new Promise((resolve, reject) => {
      async.mapLimit(files, 5, (Key, cb) => {
        cos.getObject({
          Bucket,
          Region,
          Key
        }, (err, data) => {
          if (err) {
            return cb(err)
          }
          filesContent.push(data.Body)

          // 获取源文件的 last modification time
          let mtime = dayjs(data.headers['last-modified'])
          if (mtime && mtime > lastModifiedTime) {
            lastModifiedTime = mtime
          }
    
          return cb(null)
        })
      }, (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  // 兼容逻辑。当直接请求单个文件，不开启combo特性时，则直接返回源站对应的文件Url
  if (!decodeURIComponent(ctx.querystring).startsWith('?')) {
    let cosUrl = ctx.href.replace(/(\w*:\/\/)([^\/]*)([\s\S]*)/, `$1${Bucket}.cos.${Region}.myqcloud.com$3`)
    if (ctx.headers.Authorization) {
      cosUrl = `${cosUrl}?Authorization=${ctx.headers.Authorization}`
    }
    return ctx.redirect(cosUrl)
  }

  let filesExt = {}
  // 资源内容
  let filesContent = []
  // 文件最后修改时间
  let lastModifiedTime = 0
  let resHeaders = {}
  let resBody = ''

  // 获取请求的文件路径
  let fileKeyList = Object.keys(ctx.query || {}).map((key) => {
    // 将开头的?和/去掉
    return key.replace(/(\?)*(\/)*(.*)/, '$3')
  })

  if (ctx.path === '/favicon.ico') {
    ctx.status = 200
    return;
  }

  // 检查请求是否有效，文件只允许有一个格式
  if (!check(fileKeyList)) {
    ctx.status = 400
    ctx.set({ "Content-Type":"text/plain" })
    ctx.body = 'Your browser sent a request that this server could not understand.'
    return;
  }

  try {
    await getFile(fileKeyList)

    // response headers设置
    resHeaders['Expires'] = dayjs().add(30, 'day').utc().toString();
    resHeaders['Cache-Control'] = 'max-age=2592000'
    resHeaders['Last-Modified'] = dayjs(lastModifiedTime).utc().toString();
    resHeaders['Content-Type'] = Object.values(filesExt)[0];
    resHeaders['Access-Control-Allow-Origin'] = '*';
    // 拼装文件
    resBody = filesContent.join('\n');
    
    ctx.status = 200
    ctx.set(resHeaders)
    ctx.body = resBody
  } catch(e) {
    ctx.status = 400
    ctx.set({ "Content-Type":"text/plain" })
    ctx.body = 'file not found.'
  }
});


app.listen(9000, () => {
  console.log(`Server start on http://localhost:9000`);
})