var menubar = require('menubar')

var opts = {dir: process.cwd(), webSecurity: false}
var mb = menubar(opts)

mb.on('ready', function ready () {
  console.log('app is ready')
  // your app code here
})