var width = 800;
var height = 600;

var config = {
  type: Phaser.AUTO, // WebGL if available, else use Canvas
  parent: 'phaser-example', // if Canvas element exists, render there, else create new element
  width: width,
  height: height,
  physics: {
    default: 'arcade', // phaser arcade physics
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: {
      preload: preload,
      create: create,
      update: update
  },
  scale: {
    mode: Phaser.Scale.ScaleModes.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

var game = new Phaser.Game(config); // passing game object to Phaser

function preload() {
    this.load.image('ship', 'assets/redShip.png');
    this.load.image('otherPlayer', 'assets/enemyBlack5.png');
    this.load.image('star', 'assets/star_gold.png');
}
function create() {
  var self = this;
  this.socket = io();
  this.otherPlayers = this.physics.add.group(); // manage all the player objects using group
  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });

  // on new player joining, don't want to reload all the player info. just manage pre-existing info
  // similar for disconnects
  this.socket.on('newPlayer', function (playerInfo) { // function updating other
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on('disconnects', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });
  this.socket.on('playerMoved', function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });
  this.cursors = this.input.keyboard.createCursorKeys();

  this.blueScoreText = this.add.text(16, 16, '', { fontSize: '32px', fill: '#0000FF' });
  this.redScoreText = this.add.text(584, 16, '', { fontSize: '32px', fill: '#FF0000' });

    // update scores
  this.socket.on('scoreUpdate', function (scores) {
    self.blueScoreText.setText('Blue: ' + scores.blue);
    self.redScoreText.setText('Red: ' + scores.red);
  });

  // upon touching the star, destroy and spawn a new one
  this.socket.on('starLocation', function (starLocation) {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
    self.physics.add.overlap(self.ship, self.star, function () {
      this.socket.emit('starCollected');
    }, null, self);
  });
//  this.physics.world.setBounds(0,0,800,600);
//  this.physics.world.setBoundsCollision();
  this.scale.displaySize.setAspectRatio( width/height );
  this.scale.refresh();
}
function update() {
    if (this.ship) {
        if (this.cursors.left.isDown) {
          this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) {
          this.ship.setAngularVelocity(150);
        } else {
          this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown) {
          this.physics.velocityFromRotation(this.ship.rotation + 1.5, 100, this.ship.body.acceleration);
        } else {
          this.ship.setAcceleration(0);
        }
        // this line doesnt work
        this.physics.world.wrap(this.ship, 5);

        // emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) {
          this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }
        // save old position data
        this.ship.oldPosition = {
          x: this.ship.x,
          y: this.ship.y,
          rotation: this.ship.rotation
        };
    }
}

function addPlayer(self, playerInfo) {
  // creates game object using arcade physics
  self.ship = self.physics.add.image(playerInfo.x, playerInfo.y, 'ship').setOrigin(0.5, 0.5).setDisplaySize(53, 40);

  // coloring of each team
  if (playerInfo.team === 'blue') {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }
  // how game object reacts w arcade physics
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
  //self.ship.setCollideWorldBounds(true);
}
function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, 'otherPlayer').setOrigin(0.5, 0.5).setDisplaySize(53, 40);
  if (playerInfo.team === 'blue') {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}

