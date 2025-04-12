import StartScreen from './scenes/StartScene.js';
import GameScreen from './scenes/GameScreen.js';

const config = {
    type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
    width: 640,
    height: 360,
    parent: 'phaser-game', // ID of the div to contain the game
    pixelArt: false, // Disable pixel art for smoother scaling
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No gravity needed for a start screen
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE, // Resize the game canvas to fill the container
        autoCenter: Phaser.Scale.CENTER_BOTH // Center the game canvas horizontally and vertically
    },
    scene: [StartScreen] // Only start with the StartScreen initially
};

const game = new Phaser.Game(config);