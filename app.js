  var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('./config/config');
var fs = require('fs');
var expressJwt = require('express-jwt');
var multer = require('multer');

var app = express();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

var mongoose = require('mongoose');
mongoose.connect(config.Env.development.Database);


fs.readdirSync('./models').forEach(function(file) {
  if (~file.indexOf('.js')) {
    require('./models/' + file);
  }
});
app.use('/*', expressJwt({
    secret: config.JWTSecret
}).unless({
    path: ['/users/login', '/users/logout', '/users/signup',/^\/files\/getFileByPath\/.*/]
}));


// CORS
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, CONNECT');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Intercept OPTIONS method
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

var maxSize = 10 * 1000 * 1000;
app.use(multer({
    dest: './public/tmp/',
    limits: {
        fieldNameSize: 50,
        files: 1,
        fields: 5
            // fileSize: maxSize
    },
    rename: function(fieldname, filename) {
        return 'upload' + Date.now();
    },
    onFileUploadStart: function(file, req, res) {
        if (req.headers['content-length'] > maxSize) {
            console.log('max size');
            return res.jsonp({
                message: 'error'
            });
        }
    },
    onFileUploadComplete: function(file) {
        console.log(file.fieldname + ' uploaded to ' + file.path);
    }
}));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var routes = require('./routes/index');
var users = require('./routes/users');
var messages = require('./routes/messages');
var files = require('./routes/files');
var notifys = require('./routes/notifys');
var news = require('./routes/news');
var likes = require('./routes/likes');
var comments = require('./routes/comments');
var activities = require('./routes/activities');

app.use('/', routes);
app.use('/users', users);
app.use('/messages', messages);
app.use('/files', files);
app.use('/notifys', notifys);
app.use('/news', news);
app.use('/likes', likes);
app.use('/comments', comments);
app.use('/activities', activities);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
