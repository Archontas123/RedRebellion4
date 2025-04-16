// import Phaser from 'phaser'; // Assuming Phaser is global

export default class PowerupSelectionScreen extends Phaser.Scene {
    constructor() {
        super('PowerupSelectionScreen');
        this.parentScene = null; // To store reference to the GameScreen
        this.options = [
            { type: 'speed_boost', text: 'Speed Boost (5% per stack, max 15)', maxStacks: 15 },
            // { type: 'bleeding', text: 'Bleeding Hit (5 + 2/stack DPS for 3s, max 5)', maxStacks: 5 }, // Removed Bleeding
            // { type: 'fire_rate_boost', text: 'Fire Rate Boost (8% per stack, max 5)', maxStacks: 5 }, // Removed
            { type: 'health_increase', text: 'Max Health +20 (per stack, max 5)', maxStacks: 5 },
        ];
        this.selectedPowerup = null;
    }

    init(data) {
        // Get the parent scene reference passed from GameScreen
        this.parentScene = data.parentScene;
        if (!this.parentScene) {
            console.error("PowerupSelectionScreen launched without parentScene reference!");
        }
    }

    create() {
        console.log("PowerupSelectionScreen Create");

        // Semi-transparent background overlay
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
        overlay.setOrigin(0, 0);
        overlay.setScrollFactor(0); // Keep fixed on screen

        // Title Text
        this.add.text(this.cameras.main.centerX, 100, 'Choose a Powerup', {
            fontSize: '48px', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0);

        // Display Powerup Options
        const startY = 200;
        const spacingY = 80;

        this.options.forEach((option, index) => {
            const yPos = startY + index * spacingY;
            const buttonText = this.add.text(this.cameras.main.centerX, yPos, option.text, {
                fontSize: '32px',
                fill: '#cccccc', // Default greyish color
                backgroundColor: '#333333',
                padding: { x: 15, y: 10 }
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });

            // Hover effect
            buttonText.on('pointerover', () => {
                buttonText.setFill('#ffffff'); // White on hover
                buttonText.setBackgroundColor('#555555');
            });
            buttonText.on('pointerout', () => {
                buttonText.setFill('#cccccc'); // Back to greyish
                 buttonText.setBackgroundColor('#333333');
            });

            // Click action
            buttonText.on('pointerdown', (pointer, localX, localY, event) => { // Add event parameter
                event.stopPropagation(); // Stop the event from propagating further
                // Duration is no longer needed
                this.selectPowerup(option.type);
            });
        });

         // Add Escape key listener to close the screen without selecting
        this.input.keyboard.on('keydown-ESC', () => {
            this.closeScreen();
        });
    }

    // Duration parameter removed
    selectPowerup(type) {
        console.log(`Selected Powerup: ${type}`);
        if (this.parentScene && typeof this.parentScene.applySelectedPowerup === 'function') {
            // Call the method on the parent scene (GameScreen), passing only the type
            this.parentScene.applySelectedPowerup(type);
        } else {
            console.error("Cannot apply powerup - parentScene or applySelectedPowerup method missing.");
        }
        this.closeScreen();
    }

    closeScreen() {
         console.log("Closing PowerupSelectionScreen...");
         // Resume the parent scene (GameScreen)
         if (this.parentScene && typeof this.parentScene.resumeGameScreen === 'function') {
             this.parentScene.resumeGameScreen();
         } else {
              console.error("Cannot resume parent scene - parentScene or resumeGameScreen method missing.");
         }
         // Stop this selection scene
         this.scene.stop();
    }

    // No update needed for this simple selection screen
    // update(time, delta) {}
}