import StartScene from './scenes/StartScene.js';

const config = {
    type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
    width: 640,
    height: 360,
    parent: 'phaser-game', // ID of the div to contain the game
    pixelArt: true, // Ensure pixel art isn't blurred when scaled
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No gravity needed for a start screen
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT, // Fit the game within the available space while maintaining aspect ratio
        autoCenter: Phaser.Scale.CENTER_BOTH // Center the game canvas horizontally and vertically
    },
    scene: [StartScene] // Add the StartScene to the game
};

const game = new Phaser.Game(config);