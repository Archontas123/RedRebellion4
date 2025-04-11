export default class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        // Load assets here if needed for the start screen
    }

    create() {
        // Add title text
        this.add.text(
            this.cameras.main.centerX, // Center horizontally
            this.cameras.main.centerY - 50, // Position slightly above center
            'My Awesome Game',
            {
                fontFamily: 'Arial', // Basic font
                fontSize: '48px', // Large title size
                color: '#ffffff', // White color
                align: 'center' // Center align text
            }
        ).setOrigin(0.5); // Set origin to the center of the text

        // Add instruction text
        const startText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 50,
            'Click to Start',
            {
                fontFamily: 'Arial',
                fontSize: '24px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Make the instruction text interactive
        startText.setInteractive({ useHandCursor: true });

        // Add event listener to start the main game scene when clicked
        // For now, it just logs to the console
        startText.on('pointerdown', () => {
            console.log('Starting game...');
            // In a real game, you would transition to the main game scene:
            // this.scene.start('GameScene');
        });
    }

    update() {
        // Update logic for the start screen (e.g., animations)
    }
}