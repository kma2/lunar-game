var LunarAdventure = LunarAdventure || {};

LunarAdventure.Multiplayer = function(){};

LunarAdventure.Multiplayer.prototype = {

	create: function() {

		// update cooperative game count
		fetch('/incrementGame/Cooperative', {
			method: 'PUT'
		})
		.catch(err => console.error('updating multi did not work', err));


		// ======== set timer ========
		me = this;
		me.startTime = new Date();
		me.timeElapsed = 0;
		me.createTimer();

		me.gameTimer = this.game.time.events.loop(100, function() {
			me.updateTimer();
		});

		timeElapsedBeforeLanding = 0, globalTime = 0, penalty = 0;
		timerText = this.game.add.text(centerX - 60, 32, ('Time :  ' + globalTime + 's'), fontStyle);


		// ======== set up game world ========
		this.physics.p2.gravity.y = 70;
		this.physics.p2.setImpactEvents(true);
		this.invulnerable = true;
    this.toggle = true;
    this.lifeCounter = 3;
		gameWidth = this.world.width;
		gameHeight = this.world.height;
		divide = 15;
		tilesprite = this.add.tileSprite(0, 0, gameWidth, gameHeight, 'starfield');
		// initial angle for landing pad position
		centerX = gameWidth * 0.5;
		centerY = gameHeight + 500;


		// ======== define key controls ========
		cursors = {
			up: this.input.keyboard.addKey(Phaser.Keyboard.W),
			left: this.input.keyboard.addKey(Phaser.Keyboard.LEFT),
			right: this.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
			spacebar: this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR)
		}

		keyboardArray = ['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M'];
    cursorArray = ['up', 'left', 'right', 'spacebar'];


		// ======== make collision groups ========
		terrainCollisionGroup = this.physics.p2.createCollisionGroup();
		shipCollisionGroup = this.physics.p2.createCollisionGroup();
		landingPadCollisionGroup = this.physics.p2.createCollisionGroup();
		obstaclesCollisionGroup = this.physics.p2.createCollisionGroup();
		// boundsCollisionGroup = this.physics.p2.createCollisionGroup();


		// ======== generate obstacles ========
		smallObstacles = this.add.group();
		smallObstacles.enableBody = true;
		smallObstacles.physicsBodyType = Phaser.Physics.P2JS;

		mediumObstacles = this.add.group();
		mediumObstacles.enableBody = true;
		mediumObstacles.physicsBodyType = Phaser.Physics.P2JS;

		largeObstacles = this.add.group();
		largeObstacles.enableBody = true;
		largeObstacles.physicsBodyType = Phaser.Physics.P2JS;

		this.physics.p2.enable(smallObstacles);
		this.physics.p2.enable(mediumObstacles);
		this.physics.p2.enable(largeObstacles);

		// generate waves of obstacles
		this.sendObstacleWaves();


		// ======== create ship, terrain, and landing pad ========
		ship = this.add.sprite(gameWidth * 0.5, gameHeight * 0.2, 'ship');
		ship.scale.setTo(0.06, 0.06);
		this.physics.p2.enable(ship, false);

		landingPad = this.add.sprite(centerX, 2000, 'landingPad');
		landingPad.scale.setTo(0.2, 0.2);
		this.physics.p2.enable(landingPad, false);
		landingPad.body.static = true;

		// initial angle for landing pad position
		this.landingPadAngle = 1.5;

		terrain = this.add.sprite(centerX, centerY, 'terrain');
		terrain.anchor.set(0.5);
		this.physics.p2.enable(terrain, false);
		terrain.body.static = true;
		terrain.body.clearShapes();
		terrain.body.loadPolygon('tracedTerrain', 'terrain');

		// set terrain bounce
		var shipMaterial = this.game.physics.p2.createMaterial('shipMaterial', ship.body);
		var terrainMaterial = this.game.physics.p2.createMaterial('terrainMaterial', terrain.body);
		var terrainContactMaterial = this.game.physics.p2.createContactMaterial(shipMaterial, terrainMaterial);
		terrainContactMaterial.friction = 0.3;
		terrainContactMaterial.restitution = 1.3;
		terrainContactMaterial.stiffness = 1e7;
		terrainContactMaterial.relaxation = 3;
		terrainContactMaterial.frictionStiffness = 1e7;
		terrainContactMaterial.frictionRelaxation = 3;
		terrainContactMaterial.surfaceVelocity = 0;


		// ======== boundaries  ========
		// boundaryL = this.add.sprite(-1, 0, 'boundary');
		// boundaryL.scale.setTo(width/1000000, height);
		// this.physics.p2.enable(boundaryL, true);
		// boundaryL.body.static = true;


		// boundaryR = this.add.sprite(width, 0, 'boundary');
		// boundaryR.scale.setTo(width/1000000, height)
		// this.physics.p2.enable(boundaryR, true);
		// boundaryR.body.static = true;

		// create bounds on bounds of screen
		this.physics.p2.setBoundsToWorld(true, true, true, true, true);

		// set boundaries on left and right of the screen
		// var bounds = new Phaser.Rectangle(gameWidth/divide, 0, gameWidth/divide * (divide-2), gameHeight);
		// customBounds = { left: null, right: null, top: null, bottom: null };


		// ======== set collision groups ========
		terrain.body.setCollisionGroup(terrainCollisionGroup);
		ship.body.setCollisionGroup(shipCollisionGroup);
		landingPad.body.setCollisionGroup(landingPadCollisionGroup);
		// boundaryL.body.setCollisionGroup(boundsCollisionGroup);
		// boundaryR.body.setCollisionGroup(boundsCollisionGroup);

		// ship and terrain collision
		terrain.body.collides([terrainCollisionGroup, shipCollisionGroup]);
		ship.body.collides(terrainCollisionGroup, this.hitTerrain, this);

		// ship and landing pad collision
		landingPad.body.collides([landingPadCollisionGroup, shipCollisionGroup]);
		ship.body.collides(landingPadCollisionGroup, this.landedShip, this);

		// ship and obstacle collision
		ship.body.collides(obstaclesCollisionGroup, this.hitObstacle, this);

		// ship and boundary collistion
		// boundaryL.body.collides(shipCollisionGroup);
		// boundaryR.body.collides(shipCollisionGroup);
		// ship.body.collides(boundsCollisionGroup, null, this);


		// ======== particle effects for time penalties ========
		// emitter for 5 sec penalty
		fivePenaltyEmitter = this.game.add.emitter(220,32,5000);
		fivePenaltyEmitter.makeParticles('penalty5');
		fivePenaltyEmitter.minParticleScale = 0.1;
		fivePenaltyEmitter.maxParticleScale = 0.1;
		fivePenaltyEmitter.gravity = 50;

		// emitter for 10 sec penalty
		tenPenaltyEmitter = this.game.add.emitter(230,32,5000);
		tenPenaltyEmitter.makeParticles('penalty10');
		tenPenaltyEmitter.minParticleScale = 0.1;
		tenPenaltyEmitter.maxParticleScale = 0.1;
		tenPenaltyEmitter.gravity = 50;


		// ======== health bar UI ========
    fullHealth = this.add.sprite(gameWidth - 200, 20, 'fullHealth');
    fullHealth.scale.setTo(0.25, 0.20);
    fullHealth.alpha = 1;
    this.fullHealth = fullHealth;

    twoHealth = this.add.sprite(gameWidth - 200, 20, 'twoHealth');
    twoHealth.scale.setTo(0.25, 0.20);
    twoHealth.alpha = 1;
    this.twoHealth = twoHealth;

    oneHealth = this.add.sprite(gameWidth - 200, 20, 'oneHealth');
    oneHealth.scale.setTo(0.25, 0.20);
    oneHealth.alpha = 1;
    this.oneHealth = oneHealth;

    emptyHealth = this.add.sprite(gameWidth - 200, 20, 'emptyHealth');
    emptyHealth.scale.setTo(0.25, 0.20);

    invulnerableUI = this.add.sprite(gameWidth - 200, 90, 'invulnerable');
    invulnerableUI.scale.setTo(0.25, 0.25);
    invulnerableUI.alpha = 0;


		// ======== key control UI ========
		leftKeyUp = this.add.sprite(centerX - 115 + 250, this.world.height - 120, 'leftKeyUp');
		leftKeyUp.scale.setTo(0.25, 0.25);
		leftKeyUp.visible = true;

		rightKeyUp = this.add.sprite(centerX + 48 + 250, this.world.height - 120, 'rightKeyUp');
		rightKeyUp.scale.setTo(0.25, 0.25);
		rightKeyUp.visible = true;

		upKeyUp = this.add.sprite(centerX - 300, this.world.height - 120, 'upKeyLetterWUnpressed');
		upKeyUp.scale.setTo(0.25, 0.25);
		upKeyUp.visible = true;

		leftKeyDown = this.add.sprite(centerX - 115 + 250, this.world.height - 107, 'leftKeyDown');
		leftKeyDown.scale.setTo(0.25, 0.25);
		leftKeyDown.visible = false;

		rightKeyDown = this.add.sprite(centerX + 48 + 250, this.world.height - 107, 'rightKeyDown');
		rightKeyDown.scale.setTo(0.25, 0.25);
		rightKeyDown.visible = false;

		upKeyDown = this.add.sprite(centerX - 300, this.world.height - 107, 'upKeyLetterWPressed');
		upKeyDown.scale.setTo(0.25, 0.25);
		upKeyDown.visible = false;

		thrustUI = this.add.sprite(centerX - 300, this.world.height - 40, 'thrust');
		thrustUI.scale.setTo(0.25, 0.25);

		rotateRightUI = this.add.sprite(centerX + 48 + 250, this.world.height - 40, 'rotateR');
		rotateRightUI.scale.setTo(0.25, 0.25);

		rotateLeftUI = this.add.sprite(centerX - 152 + 250, this.world.height - 40, 'rotateL');
		rotateLeftUI.scale.setTo(0.25, 0.25);


		// ======== arrow UI ========
		landingArrow = this.add.sprite(centerX, 2000, 'landingArrow');
		landingArrow.scale.setTo(0.25, 0.25);
		landingArrow.alpha = 0;

		leftIndicator = this.add.sprite(100, 400, 'landingArrow');
    leftIndicator.scale.setTo(0.20, 0.20);
    leftIndicator.alpha = 0;
    leftIndicator.anchor.set(0.5);
    leftIndicator.rotation = 1.5;

    rightIndicator = this.add.sprite(gameWidth - 100, 400, 'landingArrow');
    rightIndicator.scale.setTo(0.20, 0.20);
    rightIndicator.alpha = 0;
    rightIndicator.anchor.set(0.5);
    rightIndicator.rotation = -1.5;

		// arrow tweens
    this.add.tween(leftIndicator).to({ alpha: 1 }, 1000, Phaser.Easing.Linear.None, true, 0, 3, true);
    this.add.tween(rightIndicator).to({ alpha: 1 }, 1000, Phaser.Easing.Linear.None, true, 0, 3, true);
		this.add.tween(landingArrow).to({ alpha: 1 }, 2000, Phaser.Easing.Linear.None, true, 0, 1000, true);
	},

	createTimer: function() {
		let me = this;
		me.timeLabel = {};
	},

	updateTimer: function() {
		let me = this;
		let currentTime = new Date();
		let timeDifference = me.startTime.getTime() - currentTime.getTime();

		// time elapsed in seconds
		timeElapsedNoRound = Math.abs(timeDifference * 0.001);

		// add penalty for hitting obstacles
		timeElapsedNoRound += penalty;
		timeString = timeElapsedNoRound.toString();

		// returns floating pt number
		floatNum = parseFloat(Math.round(timeString * 100) * 0.01).toFixed(2);
		result = floatNum;

		// display two decimal points
		if (result.length === 5) {
			result = result.slice(0, 5);
		} else if (result.length === 6) {
			result = result.slice(0, 6);
		} else if (result.length === 7) {
			result = result.slice(0, 7);
		} else if (result.length === 8) {
			result = result.slice(0, 8);
		}

		me.timeLabel.text = result;

		// make time text globally accessible
		globalTime = me.timeLabel.text;
	},

	rotateLandingPadRight: function(radius, startX, startY) {
		var x = startX + Math.cos(this.landingPadAngle) * radius;
		var y = startY + Math.sin(this.landingPadAngle) * radius;
		landingPad.body.x = x;
		landingPad.body.y = y;

		if (this.landingPadAngle <= 360) {
			this.landingPadAngle += 0.003;
		} else {
			this.landingPadAngle = 0;
		}
	},

	rotateLandingPadLeft: function(radius, startX, startY) {
		var x = startX + Math.cos(this.landingPadAngle) * radius;
		var y = startY + Math.sin(this.landingPadAngle) * radius;
		landingPad.body.x = x;
		landingPad.body.y = y;

		if(this.landingPadAngle <= 360){
			this.landingPadAngle -= 0.003;
		} else {
			this.landingPadAngle = 0;
		}
	},

	rotateLandingArrow: function(radius, startX, startY) {
		landingArrow.x = landingPad.body.x - 32;
		landingArrow.y = landingPad.body.y - 85;
	},

	setVulnerablity: function() {
    if (this.lifeCounter === 3) {
      this.fullHealth.alpha = 1;
    } else if (this.lifeCounter === 2) {
      this.fullHealth.alpha = 0;
      this.twoHealth.alpha = 1;
    } else if (this.lifeCounter === 1) {
      this.fullHealth.alpha = 0;
      this.twoHealth.alpha = 0;
      this.oneHealth.alpha = 1;
    } else {
      this.fullHealth.alpha = 1;
      this.twoHealth.alpha = 0;
      this.oneHealth.alpha = 0;
      this.lifeCounter = 3;
    }

    this.invulnerable = false;
    this.toggle = true;
    ship.tint = 0xFFFFFF;
  },

	// if the ship is not invulnerable upon hitting terrain, it will crash
	hitTerrain: function(body1, body2) {
		if (!this.invulnerable) {
			endGameTime = globalTime;
			let posX = ship.x;
			let posY = ship.y;
			ship.destroy();
			explosion = this.add.sprite(posX - 30, posY, 'explosion');
			explosion.scale.setTo(0.05, 0.05);
			this.game.time.events.add(Phaser.Timer.SECOND * 0.5, this.gameOverCrash, this);
    }
	},

	hitObstacle: function(body1, body2) {
    if(!this.invulnerable){
      this.lifeCounter--;
      this.fullHealth.alpha = 0;
      this.twoHealth.alpha = 0;
      this.oneHealth.alpha = 0;

			// change key
      if (this.lifeCounter === 0) {
        var cursorToChange = cursorArray[Math.floor(Math.random() * 3)];
        var newKey = keyboardArray[Math.floor(Math.random() * 26)];
        var collisionToggle = true;

        while (collisionToggle) {
          if (cursors.left.keyCode === Phaser.KeyCode[newKey]) {
            newKey = keyboardArray[Math.floor(Math.random() * 26)];
          } else if (cursors.right.keyCode === Phaser.KeyCode[newKey]){
            newKey = keyboardArray[Math.floor(Math.random() * 26)];
          } else if (cursors.up.keyCode === Phaser.KeyCode[newKey]){
            newKey = keyboardArray[Math.floor(Math.random() * 26)];
          } else {
            collisionToggle = false;
          }
        }

				cursors[cursorToChange] = this.input.keyboard.addKey(Phaser.KeyCode[newKey]);

        // assign new key icons
        if (cursorToChange === 'left') {
          leftKeyUp.destroy();
          leftKeyDown.destroy();

          leftKeyUp = this.add.sprite(centerX - 115, this.world.height - 120, `leftKeyLetter${newKey}Unpressed`);
          leftKeyUp.scale.setTo(0.25, 0.25);
          leftKeyUp.visible = true;

          leftKeyDown = this.add.sprite(centerX - 115, this.world.height - 107, `leftKeyLetter${newKey}Pressed`);
          leftKeyDown.scale.setTo(0.25, 0.25);
          leftKeyDown.visible = false;
        } else if ( cursorToChange === 'right') {
          rightKeyUp.destroy();
          rightKeyDown.destroy();

          rightKeyUp = this.add.sprite(centerX + 48, this.world.height - 120, `rightKeyLetter${newKey}Unpressed`);
          rightKeyUp.scale.setTo(0.25, 0.25);
          rightKeyUp.visible = true;

          rightKeyDown = this.add.sprite(centerX + 48, this.world.height - 107, `rightKeyLetter${newKey}Pressed`);
          rightKeyDown.scale.setTo(0.25, 0.25);
          rightKeyDown.visible = false;
        } else {
          upKeyUp.destroy();
          upKeyDown.destroy();

          upKeyUp = this.add.sprite(centerX - 300, this.world.height - 120, `upKeyLetter${newKey}Unpressed`);
          upKeyUp.scale.setTo(0.25, 0.25);
          upKeyUp.visible = true;

          upKeyDown = this.add.sprite(centerX - 300, this.world.height - 107, `upKeyLetter${newKey}Pressed`);
          upKeyDown.scale.setTo(0.25, 0.25);
          upKeyDown.visible = false;
        }

      	// add penalty for when ship hits obstacle
        penalty += 5;
        fivePenaltyEmitter.start(true, 1000, null, 1);
      }
    }
    this.invulnerable = true;
	},

	landedShip: function(body1, body2) {
		if (ship.body) {
			endGameTime = globalTime
			// if ship lands carefully, the landing is successful
			if (ship.angle < 20 && ship.angle > -20 && Math.abs(ship.body.velocity.x) < 20 && Math.abs(ship.body.velocity.y) < 20) {
				// disable ship from moving
				ship.body = null;
				this.game.time.events.add(Phaser.Timer.SECOND, this.gameOverSuccess, this);
			// else, ship crashes
			} else {
				let posX = ship.x;
				let posY = ship.y;
				ship.destroy();
				explosion = this.add.sprite(posX - 30, posY, 'explosion');
				explosion.scale.setTo(0.05, 0.05);
				this.game.time.events.add(Phaser.Timer.SECOND, this.gameOverCrash, this);
			}
		}
	},

	generateSmallObstacles: function(amount, startX, startY, velocityX, velocityY) {
		for (var i = 0; i < amount; i++) {
			var obstacle = smallObstacles.create(startX, startY, 'smallObstacle', this.rnd.pick(frames));
			obstacle.body.setCircle(25);
			obstacle.body.setCollisionGroup(obstaclesCollisionGroup);
			obstacle.body.collides([obstaclesCollisionGroup, shipCollisionGroup]);

			this.game.physics.p2.enable(obstacle, false);
			obstacle.body.static = true;
			obstacle.body.velocity.y = velocityY;
			obstacle.body.velocity.x = velocityX;
		}
	},

	generateTinyObstacles: function(amount, startX, startY, velocityX, velocityY) {
		for (var i = 0; i < amount; i++) {
			var obstacle = smallObstacles.create(startX, startY, 'tinyObstacle', this.rnd.pick(frames));
			obstacle.body.setCircle(8);
			obstacle.body.setCollisionGroup(obstaclesCollisionGroup);
			obstacle.body.collides([obstaclesCollisionGroup, shipCollisionGroup]);

			this.game.physics.p2.enable(obstacle, false);
			obstacle.body.static = true;
			obstacle.body.velocity.y = velocityY;
			obstacle.body.velocity.x = velocityX;
		}
	},

	generateMediumObstacles: function(amount, startX, startY, velocityX, velocityY) {
		for (var i = 0; i < amount; i++) {
			var obstacle = mediumObstacles.create(startX, startY, 'mediumObstacle', this.rnd.pick(frames));
			obstacle.body.setCircle(52);
			obstacle.body.setCollisionGroup(obstaclesCollisionGroup);
			obstacle.body.collides([obstaclesCollisionGroup, shipCollisionGroup]);

			this.game.physics.p2.enable(obstacle, false);
			obstacle.body.static = true;
			obstacle.body.velocity.y = velocityY;
			obstacle.body.velocity.x = velocityX;
		}
	},

	generateLargeObstacles: function(amount, startX, startY, velocityX, velocityY) {
		for (var i = 0; i < amount; i++) {
			var obstacle = largeObstacles.create(startX, startY, 'largeObstacle', this.rnd.pick(frames));
			obstacle.body.setCircle(180);
			obstacle.body.setCollisionGroup(obstaclesCollisionGroup);
			obstacle.body.collides([obstaclesCollisionGroup, shipCollisionGroup]);

			this.game.physics.p2.enable(obstacle, false);
			obstacle.body.static = true;
			obstacle.body.velocity.y = velocityY;
			obstacle.body.velocity.x = velocityX;
		}
	},

	sendObstacleWaves: function() {
		waveOne = this.game.time.events.loop(6000, () => {
			this.generateTinyObstacles(1, this.world.width + Math.random() * 100, 400 + Math.random() * 300, -40 + Math.random() * -60, -20 + Math.random() * -50);
			this.generateTinyObstacles(1, Math.random() * -100, 400 + Math.random() * 300, 40 + Math.random() * 60, -20 + Math.random() * -50);
		});

		waveTwo = this.game.time.events.loop(10000, () => {
			this.generateSmallObstacles(1, this.world.width + Math.random() * 100, 100 + Math.random() * 400, -60 + Math.random() * -50, -30 + Math.random() * -30);
			this.generateSmallObstacles(1, Math.random() * -100, + Math.random() * 400,  Math.random() * 50, + Math.random() * -30);
			this.generateMediumObstacles(1, this.world.width + Math.random() * 100, 200 + Math.random() * 400, -60 + Math.random() * -100, -20 + Math.random() * -30);
			this.generateMediumObstacles(1, Math.random() * -100, + Math.random() * 400,  Math.random() * 100, + Math.random() * -30);
		});

		waveThree = this.game.time.events.loop(30000, () => {
			this.generateLargeObstacles(1, this.world.width + 250, 400 + Math.random() * 200, -80, -40 + Math.random() * -20);
			this.generateLargeObstacles(1, -1000, 800 + Math.random() * 200, 80, -40 + Math.random() * -20);
		});
	},

	gameOverCrash: function() {
		this.game.state.start('MultiCrash', true, false);
	},

	gameOverSuccess: function() {
		this.game.state.start('MultiSuccess', true, false);
	},

	update: function() {
    if (this.invulnerable) {
      if (this.toggle){
        // ship flash
        let shipTween = this.game.add.tween(ship).to({tint: 0x00FFFF}, 200, "Linear", true);
        shipTween.repeat(11);

        // invulnerable UI flash
        let invulnerableTween = this.game.add.tween(invulnerableUI).from({alpha : 1}, 200, "Linear", true);
        invulnerableTween.repeat(11);

        // healthbar UI
        if (this.lifeCounter === 2) {
          let fullHealthTween = this.game.add.tween(fullHealth).from({alpha : 1}, 200, "Linear", true);
          fullHealthTween.repeat(11);
        } else if (this.lifeCounter === 1) {
          let twoHealthTween = this.game.add.tween(twoHealth).from({alpha : 1}, 200, "Linear", true);
          twoHealthTween.repeat(11);
        } else if (this.lifeCounter === 0) {
          let oneHealthTween = this.game.add.tween(oneHealth).from({alpha : 1}, 200, "Linear", true);
          oneHealthTween.repeat(11);
        }

        this.toggle = false;
        this.time.events.add(Phaser.Timer.SECOND * 3, this.setVulnerablity, this);
      }
      invulnerableUI.alpha = 0;
    }

		if (ship.body) {
			// update the timer
			timerText.destroy()
			timerText = this.game.add.text(centerX - 60, 32, ('Time :  ' + globalTime + 's'), fontStyle)

			// left key, rotate ship
			if (cursors.left.isDown) {
				leftKeyUp.visible = false;
				leftKeyDown.visible = true;
				ship.body.rotateLeft(100);
			// right key, rotate ship
			} else if (cursors.right.isDown){
				rightKeyUp.visible = false;
				rightKeyDown.visible = true;
				ship.body.rotateRight(100);
			// stop rotating if key is not pressed
			} else {
				leftKeyUp.visible = true;
				leftKeyDown.visible = false;
				rightKeyUp.visible = true;
				rightKeyDown.visible = false;
				ship.body.setZeroRotation();
			}

			// up key, accelerate
			if (cursors.up.isDown){
				upKeyUp.visible = false;
				upKeyDown.visible = true;
				ship.body.thrust(200);
			} else {
				upKeyUp.visible = true;
				upKeyDown.visible = false;
			}

			if (ship.body.rotation < -3.15) { ship.body.rotation = 3.15; }
			if (ship.body.rotation > 3.15) { ship.body.rotation = -3.15; }

			let radius = 820;

			// ======== terrain rotation ========

			// if landing pad is visible, use screen edge:
			if (landingPad.body.y <= gameHeight) {

				// LEFT side of screen
				if (ship.body.x <= 27.5) {
					terrain.body.rotation += 0.003;
					this.rotateLandingPadRight(radius, centerX, centerY);
					this.rotateLandingArrow();
					tilesprite.tilePosition.x += 0.6;
					tilesprite.tilePosition.y -= 0.3;

					// add angular velocity so terrain continues to rotate slightly for smoother feel
					terrain.body.angularVelocity += 0.002;
				}

				// remove velocity once away from bound
				if (ship.body.x <= 45 || ship.body.x >= 27.5) {
					terrain.body.angularVelocity = 0;		
				}

				// RIGHT side of screen
				if (ship.body.x >= 1252) {
					this.rotateLandingPadLeft(radius, centerX, centerY);
					this.rotateLandingArrow();
					terrain.body.rotation -= 0.003;
					tilesprite.tilePosition.x -= 0.6;
					tilesprite.tilePosition.y -= 0.3;

				// add angular velocity so terrain continues to rotate slightly for smoother feel
					terrain.body.angularVelocity += 0.002;
				}
				// remove velocity once away from bound
				if (ship.body.x <= 1252 || ship.body.x >= 1236) {
					terrain.body.angularVelocity = 0;		
				}

				// if landing pad is NOT visible, use larger area:
			} else {

					// LEFT SIDE OF SCREEN
					// rotate planet if ship is close to arrows
					if (ship.body.x <= 120) {
						terrain.body.rotation += 0.003;
						this.rotateLandingPadRight(radius, centerX, centerY);
						this.rotateLandingArrow();
						tilesprite.tilePosition.x += 0.6;
						tilesprite.tilePosition.y -= 0.3;

						//add angular velocity so terrain continues to rotate slightly for smoother feel
						terrain.body.angularVelocity += 0.002;
					}
						// remove velocity once away from bound
					if (ship.body.x <= 140 || ship.body.x >= 100) {
						terrain.body.angularVelocity = 0;		
					}

					// RIGHT SIDE OF SCREEN
					if (ship.body.x >= 1159.5) {
						terrain.body.rotation -= 0.003;
						this.rotateLandingPadLeft(radius, centerX, centerY);
						this.rotateLandingArrow();
						tilesprite.tilePosition.x -= 0.6;
						tilesprite.tilePosition.y -= 0.3;

						//add angular velocity so terrain continues to rotate slightly for smoother feel
						terrain.body.angularVelocity += 0.002;
					}
						// remove velocity once away from bound
					if (ship.body.x <= 1179.5 || ship.body.x >= 1139.5) {
						terrain.body.angularVelocity = 0;		
					}
				}

			// OLD TERRAIN ROTATION
			// // terrain spins when rocket nears the edges
			// if (ship.world.x <= gameWidth/divide + 250 && ship.body.rotation < 0) {
			// 	terrain.body.rotation += 0.003;
			// 	this.rotateLandingPadRight(radius, centerX, centerY);
			// 	this.rotateLandingArrow();
			// 	tilesprite.tilePosition.x += 0.6;
			// 	tilesprite.tilePosition.y -= 0.3;
			// } else if (ship.world.x >= gameWidth/divide * (divide-1) - 250 && ship.body.rotation > 0) {
			// 	this.rotateLandingPadLeft(radius, centerX, centerY);
			// 	this.rotateLandingArrow();
			// 	terrain.body.rotation -= 0.003;
			// 	tilesprite.tilePosition.x -= 0.6;
			// 	tilesprite.tilePosition.y -= 0.3;
			// }

    }
	}
};
