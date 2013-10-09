var express = require('express');
var http = require('http');
var path = require('path');
var stylus = require('stylus');
var nib = require('nib');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(stylus.middleware({
  src: path.join(__dirname, 'styles'),
  dest: path.join(__dirname, 'public', 'styles', path.sep),
  compile: function compile(str, pathName) {
    return stylus(str)
      .set('filename', pathName)
      .set('compress', true)
      .use(nib())
      .import('nib');
  }
}));
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('PST server listening on port ' + app.get('port'));
});
