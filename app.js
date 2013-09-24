var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware({
  src: path.join(__dirname, 'styles'),
  dest: path.join(__dirname, 'public', 'styles'),
  compile: function compile(str, path) {
    return stylus(str)
      .set('filename', path)
      .set('compress', true)
      .use(require('nib')())
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
