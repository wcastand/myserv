const fs = require('fs')
const { resolve } = require('path')
const chokidar = require('chokidar')
const micro = require('micro')
const browserify = require('browserify')
const createHTML = require('create-html')
const SSE = require('sse')

const frontScript = require('./frontScript')
const sseFront = process.env.NODE_ENV === 'development'
  ? `<script>${frontScript}</script>`
  : ''

const html = createHTML({
  title: 'App',
  script: 'bundle.js',
  css: 'bundle.css',
  lang: 'fr',
  body: '<p>example</p>' + sseFront,
  favicon: null,
})

const index = (req, res) => {
}
const js = (req, res) => {
  const b = browserify(resolve(__dirname, './client.js'), {transform: ['es2020']})
  res.setHeader('Content-Type', 'text/javascript')
  res.writeHead(200)
  b.bundle().pipe(res)
}
const css = (req, res) => {
  res.setHeader('Content-Type', 'text/css')
  const data = fs.readFileSync('./main.css', 'utf-8')
  res.writeHead(200)
  res.end(data, 'utf-8')
}

const srv = micro(function (req, res) {
  switch(req.url){
    case 'favicon.ico':
      res.end('')
      break;
    case '/':
      res.writeHead(200)
      res.end(html, 'utf-8')
      break;
    case '/bundle.js':
      js(req, res)
      break;
    case '/bundle.css':
      css(req, res)
      break;
    default:
      res.writeHead(404)
      res.end('Not Found.', 'utf-8')
      break;
  }
})
srv.listen(3000, () => {
  const sse = new SSE(srv)
  sse.on('connection', (client) => {
    chokidar.watch('main.css')
    .on('change', path =>
      client.send({ data: JSON.stringify({ type: 'css', data: fs.readFileSync(resolve(__dirname, path), 'utf-8')}) })
    )
    chokidar.watch('client.js')
    .on('change', path =>
      client.send({ data: JSON.stringify({ type: 'js'}) })
    )
  })
})
