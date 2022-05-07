var express = require('express');

// creating instance of express
var app = express();

// supplying to http server, allowing the app to handle http requests
var server = require('http').Server(app);

// instantiates a server object of the Socket.IO class
var io = require('socket.io')(server);

// keep track of all players in the game
var players = {};

// coordinates of collectables
var star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50
};

// track of score for each team
var scores = {
  blue: 0,
  red: 0
};

// use express.static middleware to render static files
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// listen for connects and disconnects
io.on('connection', function (socket) {
  // on connect
  console.log('a user connected');

  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
  };

  // send the players object to the new player
  socket.emit('currentPlayers', players);

    // send the star object to the new player
    socket.emit('starLocation', star);
    // send the current scores
    socket.emit('scoreUpdate', scores);

  // update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // on disconnect
  socket.on('disconnect', function () {
    console.log('user disconnected');
    // remove this player from our players object
    delete players[socket.id];
    // emit a message to all players to remove this player
    io.emit('disconnects', socket.id);
  });

  // when a player moves, update the player data
  socket.on('playerMovement', function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });
    // when a star is collected, update all players of the score
    socket.on('starCollected', function () {
      if (players[socket.id].team === 'red') {
        scores.red += 10;
      } else {
        scores.blue += 10;
      }
      star.x = Math.floor(Math.random() * 700) + 50;
      star.y = Math.floor(Math.random() * 500) + 50;
      io.emit('starLocation', star);
      io.emit('scoreUpdate', scores);
    });
});

// listen on port 8081
server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});