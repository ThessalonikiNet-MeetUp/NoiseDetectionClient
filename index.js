var menubar = require('menubar');

var opts = {
  dir: process.cwd(), 
  webSecurity: false, 
  icon: process.cwd()+'/assets/ndb/img/bot.png',
  width: 400,
  height: 500
};

var mb = menubar(opts);

mb.on('ready', function ready () {
  console.log('App is ready and running in your taskbar');
});

// app.on('browser-window-created',function(e,window) {
//   console.log('browser-window-created', windoew);
// });
