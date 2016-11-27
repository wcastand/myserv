module.exports = () => {
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
}
