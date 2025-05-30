PlayState = {}

window.onload = function () {
  let game = new Phaser.Game(960, 600, Phaser.AUTO, "game")
  game.state.add("play", PlayState)
  game.state.start("play", true, false, { level: 0 })
}

const LEVEL_COUNT = 2

function Hero(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, "hero")
  this.anchor.set(0.5, 0.5)
  this.game.physics.enable(this)
  this.body.collideWorldBounds = true
  // animation
  this.animations.add("stop", [0])
  this.animations.add("run", [1, 2], 8, true) // 8fps looped
  this.animations.add("jump", [3])
  this.animations.add("fall", [4])
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype)
Hero.prototype.constructor = Hero
Hero.HEALTH = 0
Hero.prototype.move = function (direction) {
  const SPEED = 200
  this.body.velocity.x = direction * SPEED
  if (this.body.velocity.x < 0) {
    this.scale.x = -1
  } else if (this.body.velocity.x > 0) {
    this.scale.x = 1
  }
}
Hero.prototype.jump = function () {
  const JUMP_SPEED = 600
  let canJump = this.body.touching.down
  if (canJump) {
    this.body.velocity.y = -JUMP_SPEED
  }
  return canJump
}
Hero.prototype.bounce = function () {
  const BOUNCE_SPEED = 200
  this.body.velocity.y = -BOUNCE_SPEED
}

Hero.prototype._getAnimationName = function () {
  let name = "stop" // default animation

  // jumping
  if (this.body.velocity.y < 0) {
    name = "jump"
  }
  // falling
  else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
    name = "fall"
  } else if (this.body.velocity.x !== 0 && this.body.touching.down) {
    name = "run"
  }

  return name
}

Hero.prototype.update = function () {
  // update sprite animation, if it needs changing
  let animationName = this._getAnimationName()
  if (this.animations.name !== animationName) {
    this.animations.play(animationName)
  }
}

function Spider(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, "spider")

  // anchor
  this.anchor.set(0.5)
  // animation
  this.animations.add("crawl", [0, 1, 2], 8, true)
  this.animations.add("die", [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12)
  this.animations.play("crawl")

  // physic properties
  this.game.physics.enable(this)
  this.body.collideWorldBounds = true
  this.body.velocity.x = Spider.SPEED
}

Spider.SPEED = 100

// inherit from Phaser.Sprite
Spider.prototype = Object.create(Phaser.Sprite.prototype)
Spider.prototype.constructor = Spider

Spider.prototype.update = function () {
  // check against walls and reverse direction if necessary
  if (this.body.touching.right || this.body.blocked.right) {
    this.body.velocity.x = -Spider.SPEED // turn left
  } else if (this.body.touching.left || this.body.blocked.left) {
    this.body.velocity.x = Spider.SPEED // turn right
  }
}
Spider.prototype.die = function () {
  this.body.enable = false

  this.animations.play("die").onComplete.addOnce(function () {
    this.kill()
  }, this)
}

// Load game assets here
PlayState.preload = function () {
  // backgorund
  this.game.load.image("background", "images/background.png")
  // spawn platform levels
  this.game.load.json("level:0", "data/level00.json")
  this.game.load.json("level:1", "data/level01.json")
  this.game.load.image("ground", "images/ground.png")
  this.game.load.image("grass:8x1", "images/grass_8x1.png")
  this.game.load.image("grass:6x1", "images/grass_6x1.png")
  this.game.load.image("grass:4x1", "images/grass_4x1.png")
  this.game.load.image("grass:2x1", "images/grass_2x1.png")
  this.game.load.image("grass:1x1", "images/grass_1x1.png")
  // player
  this.game.load.spritesheet("hero", "images/hero.png", 36, 42)
  // audio
  this.game.load.audio("sfx:jump", "audio/jump.wav")
  // load coins
  this.game.load.spritesheet("coin", "images/coin_animated.png", 22, 22)
  this.game.load.audio("sfx:coin", "audio/coin.wav")
  this.game.load.image("icon:coin", "images/coin_icon.png")
  // load spider enemy
  this.game.load.spritesheet("spider", "images/spider.png", 42, 32)
  // load invisible wall
  this.game.load.image("invisible-wall", "images/invisible_wall.png")
  // load stomp sound
  this.game.load.audio("sfx:stomp", "audio/stomp.wav")
  // font - numbers
  this.game.load.image("font:numbers", "images/numbers.png")
  // win condition
  this.game.load.spritesheet("door", "images/door.png", 42, 66)
  this.game.load.image("key", "images/key.png")

  this.game.load.audio("sfx:key", "audio/key.wav")
  this.game.load.audio("sfx:door", "audio/door.wav")

  this.game.load.spritesheet("icon:key", "images/key_icon.png", 34, 30)

  this.game.load.spritesheet("icon:heart", "images/heart_live.png", 128, 35)
}

PlayState.init = function (data) {
  this.game.renderer.renderSession.roundPixels = true
  this.keys = this.game.input.keyboard.addKeys({
    left: Phaser.Keyboard.LEFT,
    right: Phaser.Keyboard.RIGHT,
    up: Phaser.Keyboard.UP,
  })
  this.keys.up.onDown.add(function () {
    let didJump = this.hero.jump()
    if (didJump) {
      this.sfx.jump.play()
    }
  }, this)
  this.coinPickupCount = 0
  this.hasKey = false
  this.level = (data.level || 0) % LEVEL_COUNT
}

// create game entities and set up world here
PlayState.create = function () {
  this.game.add.image(0, 0, "background")
  this._loadLevel(this.game.cache.getJSON(`level:${this.level + 1}`))

  // create sound entities
  this.sfx = {
    key: this.game.add.audio("sfx:key"),
    door: this.game.add.audio("sfx:door"),
    jump: this.game.add.audio("sfx:jump"),
    coin: this.game.add.audio("sfx:coin"),
    stomp: this.game.add.audio("sfx:stomp"),
  }

  this._createHud()
}

PlayState._loadLevel = function (data) {
  // create all the groups/layers that we need
  this.bgDecoration = this.game.add.group()
  this.platforms = this.game.add.group()
  this.coins = this.game.add.group()
  this.spiders = this.game.add.group()
  this.enemyWalls = this.game.add.group()
  this.enemyWalls.visible = false
  // spawn all platforms
  data.platforms.forEach(this._spawnPlatform, this)
  // spawn hero and enemies
  this._spawnCharacters({
    hero: data.hero,
    spiders: data.spiders,
  })
  data.coins.forEach(this._spawnCoin, this)
  this._spawnDoor(data.door.x, data.door.y)
  this._spawnKey(data.key.x, data.key.y)
  const GRAVITY = 1200
  this.game.physics.arcade.gravity.y = GRAVITY
}

PlayState._spawnPlatform = function (platform) {
  let sprite = this.platforms.create(platform.x, platform.y, platform.image)

  this.game.physics.enable(sprite)
  sprite.body.allowGravity = false
  sprite.body.immovable = true

  this._spawnEnemyWall(platform.x, platform.y, "left")
  this._spawnEnemyWall(platform.x + sprite.width, platform.y, "right")
}

PlayState._spawnCharacters = function (data) {
  // spawn hero
  this.hero = new Hero(this.game, data.hero.x, data.hero.y)
  this.game.add.existing(this.hero)
  // spawn spiders
  data.spiders.forEach(function (spider) {
    let sprite = new Spider(this.game, spider.x, spider.y)
    this.spiders.add(sprite)
  }, this)
}

PlayState.update = function () {
  this._handleCollisions()
  this._handleInput()
  this._controls(this.hero)
  this.coinFont.text = `x${this.coinPickupCount}`
  this.keyIcon.frame = this.hasKey ? 1 : 0
  if (Hero.HEALTH === 6) {
    this.heartsIcon.frame = 0
  } else {
    this.heartsIcon.frame = Hero.HEALTH
  }
}

PlayState._handleInput = function () {
  if (this.keys.left.isDown) {
    this.hero.move(-1)
  } else if (this.keys.right.isDown) {
    this.hero.move(1)
  } else {
    this.hero.move(0)
  }
}

PlayState._handleCollisions = function () {
  // check for collisions
  this.game.physics.arcade.collide(this.hero, this.platforms)
  // check for coins
  this.game.physics.arcade.overlap(
    this.hero,
    this.coins,
    this._onHeroVsCoin,
    null,
    this
  )
  this.game.physics.arcade.collide(this.spiders, this.platforms)
  this.game.physics.arcade.collide(this.spiders, this.enemyWalls)
  this.game.physics.arcade.overlap(
    this.hero,
    this.spiders,
    this._onHeroVsEnemy,
    null,
    this
  )
  this.game.physics.arcade.overlap(
    this.hero,
    this.key,
    this._onHeroVsKey,
    null,
    this
  )

  this.game.physics.arcade.overlap(
    this.hero,
    this.door,
    this._onHeroVsDoor,
    // ignore if there is no key or the player is on air
    function (hero, door) {
      return this.hasKey && hero.body.touching.down
    },
    this
  )
}

PlayState._spawnCoin = function (coin) {
  let sprite = this.coins.create(coin.x, coin.y, "coin")
  sprite.anchor.set(0.5, 0.5)
  // add animation rotation coins
  sprite.animations.add("rotate", [0, 1, 2, 1], 6, true) // 6fps, looped
  sprite.animations.play("rotate")
  // add physics to coins
  this.game.physics.enable(sprite)
  sprite.body.allowGravity = false
}

PlayState._onHeroVsCoin = function (hero, coin) {
  this.sfx.coin.play()
  coin.kill()
  this.coinPickupCount++
}

PlayState._spawnEnemyWall = function (x, y, side) {
  let sprite = this.enemyWalls.create(x, y, "invisible-wall")
  // anchor and y displacement
  sprite.anchor.set(side === "left" ? 1 : 0, 1)

  // physic properties
  this.game.physics.enable(sprite)
  sprite.body.immovable = true
  sprite.body.allowGravity = false
}

PlayState._onHeroVsEnemy = function (hero, enemy) {
  if (hero.body.velocity.y > 0) {
    // kill enemies when hero is falling
    hero.bounce()
    enemy.die()
    this.sfx.stomp.play()
  } else {
    this.sfx.stomp.play()
    Hero.HEALTH += 2
    this.game.state.restart(true, false, { level: this.level })
  }
}

PlayState._createHud = function () {
  this.heartsIcon = this.game.make.image(820, 0, "icon:heart")
  this.heartsIcon.anchor.set(0, 0)

  this.keyIcon = this.game.make.image(0, 19, "icon:key")
  this.keyIcon.anchor.set(0, 0.5)
  const NUMBERS_STR = "0123456789X "
  this.coinFont = this.game.add.retroFont(
    "font:numbers",
    20,
    26,
    NUMBERS_STR,
    6
  )
  let coinIcon = this.game.make.image(this.keyIcon.width + 7, 0, "icon:coin")
  let coinScoreImg = this.game.make.image(
    coinIcon.x + coinIcon.width,
    coinIcon.height / 2,
    this.coinFont
  )
  coinScoreImg.anchor.set(0, 0.5)

  this.hud = this.game.add.group()
  this.hud.add(coinIcon)
  this.hud.position.set(10, 10)
  this.hud.add(coinScoreImg)
  this.hud.add(this.keyIcon)
  this.hud.add(this.heartsIcon)
}

PlayState._spawnDoor = function (x, y) {
  this.door = this.bgDecoration.create(x, y, "door")
  this.door.anchor.setTo(0.5, 1)
  this.game.physics.enable(this.door)
  this.door.body.allowGravity = false
}

PlayState._spawnKey = function (x, y) {
  this.key = this.bgDecoration.create(x, y, "key")
  this.key.anchor.set(0.5, 0.5)
  this.game.physics.enable(this.key)
  this.key.body.allowGravity = false
  // add a small 'up & down' animation via a tween
  this.key.y -= 3
  this.game.add
    .tween(this.key)
    .to({ y: this.key.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
    .yoyo(true)
    .loop()
    .start()
}

PlayState._onHeroVsKey = function (hero, key) {
  this.sfx.key.play()
  key.kill()
  this.hasKey = true
}

PlayState._onHeroVsDoor = function (hero, door) {
  this.sfx.door.play()
  this.game.state.restart(true, false, { level: this.level + 1 })
  // TODO: go to the next level instead
}

PlayState._controls = function (hero) {
  const leftBtn = document.getElementById("btn-left")
  const rightBtn = document.getElementById("btn-right")
  const jumpBtn = document.getElementById("btn-jump")

  leftBtn.addEventListener("click", function () {
    hero.move(-10)
  })

  rightBtn.addEventListener("click", function () {
    hero.move(10)
  })

  jumpBtn.addEventListener("click", function () {
    let didJump = hero.jump()
    if (didJump) {
      this.sfx.jump.play()
    }
  })
}
