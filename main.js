// main.js

const fruitKeys = [
    'Apple_96x96','Apple_Green_96x96','Banana_96x96',
    'Cherry_96x96','Green_Grape_96x96',
    'Lemon_96x96','Lime_96x96','Orange_96x96',
    'Peer_96x96','PineApple_96x96','Plum_96x96',
    'Red_Grape_96x96','StrawBerry_96x96','Watermelon_96x96'
  ];
  
  class MenuScene extends Phaser.Scene {//Complete mainmenu that launches on start up 
    constructor() { super('Menu'); }
    preload() {
      this.load.image('menuBg', 'assets/backgroundDeadTree.png');
      this.load.audio('sfx_ui',  'assets/Audio/ui/switch1.wav');
    }
    create() {
      if (this.textures.exists('menuBg')) {
        this.add.image(400,300,'menuBg').setDisplaySize(800,600);
      } else {
        this.add.rectangle(400,300,800,600,0x444444);
      }
      // title for game
      this.add.text(400,100,'Catch the Fruit', {
        fontSize: '48px', fill: '#fff'
      }).setOrigin(0.5);
      // rules 
      this.add.text(400,240,
        [
          '← / → to move',
          'Catch fruits to score',
          '3 Lives • Combo boosts points',
          'Hearts fall sometimes to restore'
        ].join('\n'),
        { fontSize: '24px', fill: '#fff', align: 'center' }
      ).setOrigin(0.5);
      // high score
      const hs = localStorage.getItem('highscore') || 0;
      this.add.text(400,360, `High Score: ${hs}`, {
        fontSize: '32px', fill: '#ff0'
      }).setOrigin(0.5);
      // start prompt
      this.add.text(400,480,'Click to Start', {
        fontSize: '24px', fill: '#fff'
      }).setOrigin(0.5); 
      // fade effect to MainScene on click
      this.input.once('pointerdown', () => {
        this.sound.play('sfx_ui');
        this.cameras.main.fade(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('Main');
        });
      });
    }
  }
  
  //  Main Game Scene has all functionallity for the game
  class MainScene extends Phaser.Scene {
    constructor() { super('Main'); }
    preload() {
      // images
      this.load.image('bg',      'assets/backgroundDeadTree.png');
      this.load.image('basket',  'assets/Fruits/tile_0107.png');
      this.load.image('heart',   'assets/Fruits/Hearth_96x96.png');
      fruitKeys.forEach(k =>
        this.load.image(k, `assets/Fruits/${k}.png`)
      );
      // audio
      this.load.audio('bgm',         'assets/Audio/music/bgm.ogg');
      this.load.audio('sfx_collect', 'assets/Audio/kenney-digital/pepSound1.ogg');
      this.load.audio('sfx_miss',    'assets/Audio/kenney-digital/spaceTrash1.ogg');
      this.load.audio('sfx_levelup', 'assets/Audio/kenney-digital/phaserUp1.ogg');
      this.load.audio('sfx_heart',   'assets/Audio/kenney-digital/powerup2.ogg');
    }
  
    create() {
      // fade in from menu
      this.cameras.main.fadeIn(500); 
      // play Background music
      this.sound.play('bgm', { loop: true, volume: 0.4 });

      this.score      = 0;
      this.lives      = 3;
      this.comboCount = 0;
      this.scoreMult  = 1;
      this.fallSpeed  = 1;
      this.fruitsCaught = 0;
      this.maxCombo     = 0;
      // background
      if (this.textures.exists('bg')) {
        this.add.image(400,300,'bg').setDisplaySize(800,600);
      }
      // HUD: score and combo multi
      this.scoreText = this.add.text(20, 20, 'Score: 0', {
        fontSize: '24px', fill: '#fff'
      });
      this.comboText = this.add.text(20, 60, 'Combo: x1', {
        fontSize: '20px', fill: '#0f0'
      });
      // lives icons
      this.heartsIcons = [];
      for (let i = 0; i < 3; i++) {
        const h = this.add.image(750 - i*40, 40, 'heart')
          .setScale(0.5);
        this.heartsIcons.push(h);
      } 
      // basket
      this.basket = this.physics.add.image(400,550,'basket')
        .setScale(2)
        .setImmovable()
        .setCollideWorldBounds(true);
      // input
      this.cursors = this.input.keyboard.createCursorKeys();
  
      // fruit group + overlap for "collection"
      this.fruits = this.physics.add.group();
      this.validFruitKeys = fruitKeys.filter(k => this.textures.exists(k));
      this.physics.add.overlap(
        this.basket, this.fruits,
        this.catchFruit, null, this
      );
      // heart group + overlap
      this.hearts = this.physics.add.group();
      this.physics.add.overlap(
        this.basket, this.hearts,
        this.catchHeart, null, this
      );
  
      // spawn fruit
      this.spawnFruit();
      // spawn heart every 25 seconds
      this.time.addEvent({
        delay: 25000,
        callback: this.spawnHeart,
        callbackScope: this,
        loop: true
      });
    }
  
    update() {
      // basket movement
      this.basket.setVelocityX(0);
      if (this.cursors.left.isDown)  this.basket.setVelocityX(-400);
      if (this.cursors.right.isDown) this.basket.setVelocityX( 400);
  
      // missed fruits
      this.fruits.getChildren().slice().forEach(f => {
        if (f.y > 600) {
          f.destroy();
          this.sound.play('sfx_miss');
          this.loseLife();
        }
      });
    }
    spawnFruit() {
      if (!this.validFruitKeys.length) return;
      const x   = Phaser.Math.Between(50,750);
      const key = Phaser.Utils.Array.GetRandom(this.validFruitKeys);
  
      this.fruits.create(x, -50, key)
        .setVelocityY(Phaser.Math.Between(30,80) * this.fallSpeed)
        .setScale(0.5);
  
      // delay between spawns
      this.time.delayedCall(
        Phaser.Math.Between(1500,3000),
        this.spawnFruit,
        [], this
      );
    }
  
    spawnHeart() {
      if (this.lives < 3) {
        const x = Phaser.Math.Between(50,750);
        this.hearts.create(x, -50, 'heart')
          .setVelocityY(Phaser.Math.Between(20,40))
          .setScale(0.5);
      }
    }
  
    catchFruit(_, fruit) {
      fruit.destroy();
      this.sound.play('sfx_collect');
      this.fruitsCaught++;
      // combo logic
      this.comboCount++;
      this.scoreMult = 1 + Math.floor(this.comboCount / 5);
      this.comboText.setText(`Combo: x${this.scoreMult}`);  
      // track max combo
      this.maxCombo = Math.max(this.maxCombo, this.comboCount);
  
      // scoring
      const pts = 10 * this.scoreMult;
      this.score += pts;
      this.scoreText.setText(`Score: ${this.score}`);
  
      // text popup for points increases visual appeal
      const pop = this.add.text(fruit.x, fruit.y, `+${pts}`, {
        fontSize: '20px', fill: '#ff0', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5);
      this.tweens.add({
        targets: pop,
        y: pop.y - 50,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onComplete: () => pop.destroy()
      });
    }
  
    catchHeart(_, heart) {
      heart.destroy();
      if (this.lives < 3) {
        this.sound.play('sfx_heart');
        this.heartsIcons[this.lives].setVisible(true);
        this.lives++;
      }
    }
  
    loseLife() {
      this.lives--;
      if (this.lives >= 0) {
        this.heartsIcons[this.lives].setVisible(false);
      }
      // reset combo
      this.comboCount = 0;
      this.scoreMult  = 1;
      this.comboText.setText('Combo: x1'); 
      this.cameras.main.shake(200, 0.01); 
      if (this.lives <= 0) {
        this.endGame();
      }
    }
  
    endGame() {
      this.cameras.main.fade(800, 0, 0, 0);
      // on complete, pause, save stats, go to Summary
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.physics.pause();
        // save high score
        const hs = Math.max(this.score, +localStorage.getItem('highscore')||0);
        localStorage.setItem('highscore', hs);
        // stash summary
        this.registry.set('summary', {
          score:        this.score,
          maxCombo:     this.maxCombo,
          fruitsCaught: this.fruitsCaught,
          livesLeft:    0
        });
        this.scene.start('Summary');
      });
    }
  }
  
  //After game summary scene 
  class SummaryScene extends Phaser.Scene {
    constructor() { super('Summary'); }
    create() {
      const s = this.registry.get('summary');
      this.add.rectangle(400,300,800,600,0x000000,0.75);
      this.add.text(400,80,'Game Summary', {
        fontSize: '48px', fill: '#fff'
      }).setOrigin(0.5);
      // stats
      const lines = [
        `Score: ${s.score}`,
        `Max Combo: x${s.maxCombo}`,
        `Fruits Caught: ${s.fruitsCaught}`,
        `Lives Remaining: ${s.livesLeft}`
      ];
      this.add.text(400,180, lines.join('\n'), {
        fontSize: '28px', fill: '#fff', align: 'center'
      }).setOrigin(0.5);
      // buttons for replayability
      const playAgain = this.add.text(400,380,'▶ Play Again', {
        fontSize: '32px', fill: '#0f0'
      }).setOrigin(0.5).setInteractive();
      const backToMenu = this.add.text(400,440,'☰ Main Menu', {
        fontSize: '32px', fill: '#0af'
      }).setOrigin(0.5).setInteractive();
  
      playAgain.on('pointerdown', () => this.scene.start('Main'));
      backToMenu.on('pointerdown', () => this.scene.start('Menu'));
    }
  }
  
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800, height: 600,
    physics: { default:'arcade', arcade:{ debug:false } },
    scene: [ MenuScene, MainScene, SummaryScene ]
  });