var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.use(express.static(__dirname + '/public'));

io.configure('production', function(){
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  // enable all transports (optional if you want flashsocket)
  io.set('transports', [ 'websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
});

var port = process.env.PORT || 8000;
server.listen(port);
console.log("Listening at port: " + port);

// Routes
app.get('*', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Setup game

var nextUserId = 0;
var game = require('./private/js/game');

io.sockets.on('connection', function (socket) {
  socket.userId = ++nextUserId;

  // When connecting
  var gameData = game.getGameData();
  var data = {
    userId: socket.userId,
    gameData: gameData
  };
  socket.emit('connected', data);

  // When someone moves
  socket.on('move', function (direction) {
    // update the game
    game.move(direction);

    // Send the move with the game state
    var gameData = game.getGameData();
    var data = {
      direction: direction,
      userId: socket.userId,
      gameData: gameData
    };
    io.sockets.emit('move', data);

    // Reset the game if it is game over
    if (gameData.over) {
      game.reset(function () {
        io.sockets.emit('reset', game.getGameData());
      });
    }
  });
});