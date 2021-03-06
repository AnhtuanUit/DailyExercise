#!/usr/bin/env node

var debug = require('debug')('app');
var app = require('./app');

app.set('port', process.env.PORT || 9000);

var server = app.listen(app.get('port'), function() {
    var socketIO = require('./socketio')(server);
    // debug('Express server listening on port ' + server.address().port);
    console.log('Express server listening on port ' + server.address().port);
});
