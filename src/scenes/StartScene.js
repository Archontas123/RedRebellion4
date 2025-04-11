export default class StartScreen extends Phaser.Scene {
    constructor() {
        super('StartScreen');
    }

    preload() {
        // Load the background image
        this.load.image('background', 'assets/mars-background.jpg');
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Add background image and scale it initially
        this.bg = this.add.image(width / 2, height / 2, 'background').setOrigin(0.5);
        this.resizeBackground(width, height); // Initial scale

        // --- Create the clickable Title ---
        this.titleText = this.add.text(width / 2, height / 2, 'RED REBELLION', {
            fontFamily: 'Impact, fantasy', // More impactful font
            fontSize: '80px', // Larger size
            color: '#ff3333',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.titleText.setInteractive({ useHandCursor: true });

        // Title hover effects
        this.titleText.on('pointerover', () => {
            this.titleText.setColor('#ff6666'); // Slightly lighter red
            this.titleText.setScale(1.05); // Slightly larger
        });

        this.titleText.on('pointerout', () => {
            this.titleText.setColor('#ff3333'); // Back to original red
            this.titleText.setScale(1.0); // Back to original size
        });

        // Title click action
        this.titleText.on('pointerdown', () => {
            // Add visual feedback
            this.tweens.add({
                targets: this.titleText,
                scale: 0.9,
                duration: 100,
                yoyo: true,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    // Fade out and switch scene
                    this.cameras.main.fade(500, 0, 0, 0); // Fade to black
                    this.time.delayedCall(500, () => {
                        this.scene.start('GamePlay'); // Go to GamePlay scene
                    });
                }
            });
        });

        // Bobbing animation for the title
        this.tweens.add({
            targets: this.titleText,
            y: (height / 2) - 15, // Bob up slightly
            duration: 1800, // Slower, more subtle bobbing
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1 // Repeat indefinitely
        });

        // Add a subtle instruction text below the title
        this.instructionText = this.add.text(width / 2, height / 2 + 80, 'Click title to start', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#cccccc',
            align: 'center'
        }).setOrigin(0.5);

        // Handle window resize events
        this.scale.on('resize', this.handleResize, this);
    }

    resizeBackground(width, height) {
        if (!this.bg) return;
        // Scale background to cover the larger dimension
        const scaleX = width / this.bg.width;
        const scaleY = height / this.bg.height;
        this.bg.setPosition(width / 2, height / 2);
        this.bg.setScale(Math.max(scaleX, scaleY));
    }

    handleResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.cameras.resize(width, height);

        // Re-scale background
        this.resizeBackground(width, height);

        // Re-center title and instruction text
        if (this.titleText) {
            this.titleText.setPosition(width / 2, height / 2);
            // Adjust bobbing target Y based on new height
            this.tweens.getTweensOf(this.titleText).forEach(tween => {
                if (tween.props && tween.props.includes('y')) {
                    tween.updateTo('y', (height / 2) - 15, true);
                }
            });
        }
        if (this.instructionText) {
            this.instructionText.setPosition(width / 2, height / 2 + 80);
        }
    }
}