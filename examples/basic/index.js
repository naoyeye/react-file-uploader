var fs = require('fs');
var express = require('express');
var app = express();
var multiparty = require('connect-multiparty')();

app.disable('x-powered-by');
app.use(express.static('./'));
app.set('view engine', 'html');

app.get('/', function(req, res) {
  res.sendFile('./index.html', {
     root: '.'
   });
});

app.post('/upload', multiparty, function(req, res) {
    var file = req.files.file;

    fs.unlink(file.path, function(err) {
        res.json({
            success: !err,
            file: file
        });
    });
});

app.listen(8302, function(err) {
    console.log('app is started at port 8302');
});