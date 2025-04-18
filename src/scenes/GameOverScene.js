class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        // Store the final wave number passed from GameScreen/WaveManager
        this.finalWave = data.waveReached || 0; // Use waveReached from GameScreen
        // Store the reason for game over
        this.outOfLives = data.outOfLives || false;
        // Store score data
        this.finalScore = data.finalScore || 0;
        this.kills = data.kills || 0;
        this.deaths = data.deaths || 0;
        this.timeSurvived = data.timeSurvived || 0;
        this.bossKilled = data.bossKilled || false;
    }

    create() {
        // Define scoring constants used in this scene
        const BOSS_KILL_MULTIPLIER = 2.5;

        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;

        // --- Theming ---
        const theme = {
            primaryColor: '#FF6B00', // Martian Orange
            secondaryColor: '#00E0FF', // Tech Cyan
            textColor: '#E0E0E0', // Light Grey/White
            backgroundColor: '#201510', // Dark Reddish Brown
            overlayAlpha: 0.85,
            fontFamily: 'Consolas, "Courier New", monospace', // Tech font
            titleFontSize: '72px',
            bodyFontSize: '36px',
            buttonFontSize: '38px',
            strokeColor: '#111111',
            buttonBgColor: '#443020', // Darker Brown/Orange
            buttonHoverBgColor: '#664530',
            buttonTextColor: '#00E0FF', // Cyan text on buttons
            buttonHoverTextColor: '#FFFFFF',
            gameOverColor: '#FF4444', // Keep a distinct red for failure
            waveClearColor: '#66FF66', // Keep a distinct green for success
        };

        // --- Background Overlay ---
        const overlay = this.add.graphics({ fillStyle: { color: Phaser.Display.Color.HexStringToColor(theme.backgroundColor).color, alpha: theme.overlayAlpha } });
        overlay.fillRect(0, 0, width, height);
        // Optional: Add subtle grid lines?
        // overlay.lineStyle(1, Phaser.Display.Color.HexStringToColor(theme.primaryColor).color, 0.1);
        // for (let i = 0; i < width; i += 50) { overlay.lineBetween(i, 0, i, height); }
        // for (let j = 0; j < height; j += 50) { overlay.lineBetween(0, j, width, j); }

        // --- Title ---
        const titleText = this.outOfLives ? 'SYSTEM FAILURE' : 'OBJECTIVE COMPLETE'; // More thematic text
        const titleColor = this.outOfLives ? theme.gameOverColor : theme.waveClearColor;

        this.add.text(centerX, centerY - 150, titleText, {
            fontSize: theme.titleFontSize,
            fill: titleColor,
            fontFamily: theme.fontFamily,
            fontStyle: 'bold',
            stroke: theme.strokeColor,
            strokeThickness: 5,
            shadow: { offsetX: 2, offsetY: 2, color: '#111', blur: 4, fill: true }
        }).setOrigin(0.5);

        // --- Final Wave Text ---
        this.add.text(centerX, centerY - 80, `Reached Sector: ${this.finalWave}`, { // Changed "Wave" to "Sector"
            fontSize: theme.bodyFontSize,
            fill: theme.textColor,
            fontFamily: theme.fontFamily,
            stroke: theme.strokeColor,
            strokeThickness: 3
        }).setOrigin(0.5);

        // --- Score Details Text ---
        const scoreYStart = centerY - 30; // Start position for score details
        const scoreLineHeight = 40; // INCREASED Spacing between lines

        // Display Kills and Deaths
        this.add.text(centerX, scoreYStart, `Kills: ${this.kills} / Deaths: ${this.deaths}`, {
            fontSize: '24px', // Smaller font for details
            fill: theme.textColor,
            fontFamily: theme.fontFamily,
        }).setOrigin(0.5);

        // Display Time Survived
        this.add.text(centerX, scoreYStart + scoreLineHeight, `Time Survived: ${this.timeSurvived}s`, {
            fontSize: '24px',
            fill: theme.textColor,
            fontFamily: theme.fontFamily,
        }).setOrigin(0.5);

        // Display Boss Bonus (if applicable)
        if (this.bossKilled) {
            this.add.text(centerX, scoreYStart + scoreLineHeight * 2, `Boss Bonus: x${BOSS_KILL_MULTIPLIER} Applied!`, {
                fontSize: '24px',
                fill: theme.secondaryColor, // Use a highlight color
                fontFamily: theme.fontFamily,
                fontStyle: 'italic'
            }).setOrigin(0.5);
        }

        // Display Final Score (Larger)
        // Increased multiplier from 3.5 to 4.0 when bossKilled is true for more spacing
        this.add.text(centerX, scoreYStart + scoreLineHeight * (this.bossKilled ? 4.0 : 2.5), `Final Score: ${this.finalScore}`, {
            fontSize: '42px', // Larger font for final score
            fill: theme.primaryColor, // Use primary theme color
            fontFamily: theme.fontFamily,
            fontStyle: 'bold',
            stroke: theme.strokeColor,
            strokeThickness: 4
        }).setOrigin(0.5);
        // --- End Score Details Text ---


        // --- Button Styling ---
        const buttonBaseStyle = {
            fontSize: theme.buttonFontSize,
            fontFamily: theme.fontFamily,
            fill: theme.buttonTextColor,
            backgroundColor: theme.buttonBgColor,
            padding: { x: 30, y: 15 }, // Increased padding
            // Add fixed width for alignment?
            // fixedWidth: 350,
            // align: 'center'
        };
        const buttonHoverStyle = {
            fill: theme.buttonHoverTextColor,
            backgroundColor: theme.buttonHoverBgColor,
        };

        // --- Buttons ---
        const buttonYOffset = 120; // INCREASED Y offset to make space for score
        const buttonSpacing = 80; // DECREASED spacing between buttons slightly

        // --- Helper to add decorative brackets ---
        const addBrackets = (button) => {
            const bracketColor = Phaser.Display.Color.HexStringToColor(theme.secondaryColor).color;
            const bracketThickness = 2;
            const bracketLength = 20;
            const bracketOffset = 10; // Offset from button edge

            const bounds = button.getBounds();
            const graphics = this.add.graphics().setDepth(button.depth); // Draw on same depth

            // Top-left
            graphics.lineStyle(bracketThickness, bracketColor, 0.8);
            graphics.beginPath();
            graphics.moveTo(bounds.left - bracketOffset, bounds.top - bracketOffset + bracketLength);
            graphics.lineTo(bounds.left - bracketOffset, bounds.top - bracketOffset);
            graphics.lineTo(bounds.left - bracketOffset + bracketLength, bounds.top - bracketOffset);
            graphics.strokePath();

            // Top-right
            graphics.beginPath();
            graphics.moveTo(bounds.right + bracketOffset - bracketLength, bounds.top - bracketOffset);
            graphics.lineTo(bounds.right + bracketOffset, bounds.top - bracketOffset);
            graphics.lineTo(bounds.right + bracketOffset, bounds.top - bracketOffset + bracketLength);
            graphics.strokePath();

            // Bottom-left
            graphics.beginPath();
            graphics.moveTo(bounds.left - bracketOffset, bounds.bottom + bracketOffset - bracketLength);
            graphics.lineTo(bounds.left - bracketOffset, bounds.bottom + bracketOffset);
            graphics.lineTo(bounds.left - bracketOffset + bracketLength, bounds.bottom + bracketOffset);
            graphics.strokePath();

            // Bottom-right
            graphics.beginPath();
            graphics.moveTo(bounds.right + bracketOffset - bracketLength, bounds.bottom + bracketOffset);
            graphics.lineTo(bounds.right + bracketOffset, bounds.bottom + bracketOffset);
            graphics.lineTo(bounds.right + bracketOffset, bounds.bottom + bracketOffset - bracketLength);
            graphics.strokePath();

            return graphics; // Return graphics if needed for cleanup
        };


        // --- Restart Button ---
        const restartY = this.outOfLives ? centerY + buttonYOffset + buttonSpacing / 2 : centerY + buttonYOffset; // Adjust Y if endless is hidden
        const restartButton = this.add.text(centerX, restartY, 'REINITIALIZE', { // Thematic text
            ...buttonBaseStyle,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        const restartBrackets = addBrackets(restartButton); // Add brackets

        restartButton.on('pointerdown', () => {
            console.log('Restarting game from Wave 1...');
            this.scene.start('GameScreen', { startingWave: 1 });
        });
        restartButton.on('pointerover', () => restartButton.setStyle({ ...buttonBaseStyle, ...buttonHoverStyle }));
        restartButton.on('pointerout', () => restartButton.setStyle({ ...buttonBaseStyle }));


        // --- Continue to Endless Button ---
        const endlessButton = this.add.text(centerX, centerY + buttonYOffset + buttonSpacing, 'CONTINUE EXPLORATION', { // Thematic text
             ...buttonBaseStyle,
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        const endlessBrackets = addBrackets(endlessButton); // Add brackets

        endlessButton.on('pointerdown', () => {
            console.log('Continuing to endless mode...');
            this.scene.start('GameScreen', { endlessMode: true, startingWave: this.finalWave + 1 });
        });
        endlessButton.on('pointerover', () => endlessButton.setStyle({ ...buttonBaseStyle, ...buttonHoverStyle }));
        endlessButton.on('pointerout', () => endlessButton.setStyle({ ...buttonBaseStyle }));

        // Only show the endless button if the player didn't run out of lives
        if (this.outOfLives) {
            endlessButton.setVisible(false);
            endlessButton.disableInteractive();
            if (endlessBrackets) endlessBrackets.setVisible(false); // Hide brackets too
        }
    }
}

export default GameOverScene;
