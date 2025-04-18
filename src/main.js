import StartScreen from './scenes/StartScene.js';
import GameScreen from './scenes/GameScreen.js';
import PowerupSelectionScreen from './scenes/PowerupSelectionScreen.js';
import GameOverScene from './scenes/GameOverScene.js'; // Import the Game Over scene

const config = {
    type: Phaser.AUTO, // Use WebGL if available, otherwise Canvas
    // width and height are managed by the scale manager (RESIZE mode)
    parent: 'phaser-game', // ID of the div to contain the game
    pixelArt: false, // Disable pixel art for smoother scaling
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }, // No gravity needed for a start screen
            debug: true
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE, // Resize the game canvas to fill the container
        autoCenter: Phaser.Scale.CENTER_BOTH, // Center the game canvas horizontally and vertically
        width: '100%',
        height: '100%',
        parent: 'phaser-game',
        expandParent: true
    },
    // Add all scenes to the config so they are known by the Scene Manager
    scene: [StartScreen, GameScreen, PowerupSelectionScreen, GameOverScene] // Add GameOverScene here
};

const game = new Phaser.Game(config);
