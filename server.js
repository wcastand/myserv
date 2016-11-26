const fs = require('fs')
const { resolve } = require('path')
const chokidar = require('chokidar')
const micro = require('micro')
const browserify = require('browserify')
const createHTML = require('create-html')
const SSE = require('sse')

const sseFront = `
<script>
  const es = new EventSource("/sse");
  es.onmessage = function (event) {
    const res = JSON.parse(event.data)
    switch(res.type){
      case 'js': location.reload(); break;
      case 'css':
        document.head.querySelectorAll('link')
        .forEach(function(x) {document.head.removeChild(x)})
        const style = document.querySelector('#cssBundle')
        ? document.querySelector('#cssBundle')
        : document.createElement('style')
        style.id = 'cssBundle'
        style.innerHTML = res.data.replace(/\\n|\\s/gi, '')
        document.head.appendChild(style)
        break;
    }
  };
</script>
`

const html = createHTML({
  title: 'App',
  script: 'bundle.js',
  css: 'bundle.css',
  lang: 'fr',
  body: '<p>example</p>' + (process.env.NODE_ENV === 'development' ? sseFront : ''),
  favicon: null,
})

const index = (req, res) => {
  res.writeHead(200)
  res.end(html, 'utf-8')
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
    case 'favicon.ico': return res.end('')
    case '/': return index(req, res)
    case '/bundle.js': return js(req, res)
    case '/bundle.css': return css(req, res)
    default:
      res.writeHead(404)
      return res.end('Not Found.', 'utf-8')
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
