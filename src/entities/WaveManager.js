// Removed EngineerBoss import

class WaveManager {
    constructor(scene, enemyManager, options = {}) { // Add options parameter
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.endlessMode = options.endlessMode || false; // Store endlessMode flag
        this.currentWave = 0;
        this.waveActive = false;
        this.enemiesToSpawn = 0;
        this.enemiesRemainingInWave = 0;
        this.timeBetweenWaves = 5000; // 5 seconds
        this.waveTimer = null; // Will be replaced by countdown logic
        this.countdownActive = false;
        this.countdownValue = 0; // Time remaining in ms

        // Removed fixed waveConfig array
        this.availableEnemyTypes = ['Enemy', 'RangedEnemy', 'Splitter']; // All possible types
    }

    generateWaveConfig(waveNumber) {
        const baseCount = 5;
        const countIncreasePerWave = 2;
        const countRandomness = 3; // +/- up to this amount

        // Calculate base count for the wave
        let count = baseCount + (waveNumber - 1) * countIncreasePerWave;
        // Add randomness
        count += Phaser.Math.Between(-countRandomness, countRandomness);
        // Ensure minimum count
        count = Math.max(3, count); // Minimum 3 enemies per wave

        // Determine available types based on wave number
        let possibleTypes = ['Enemy'];
        if (waveNumber >= 3) {
            possibleTypes.push('RangedEnemy');
        }
        if (waveNumber >= 5) {
            possibleTypes.push('Splitter');
        }

        // --- Dynamic Type Distribution ---
        // Increase chance of harder enemies as waves progress
        const types = [];
        for (let i = 0; i < count; i++) {
            let selectedType = 'Enemy'; // Default
            const roll = Math.random(); // 0.0 to 1.0

            // Adjust probabilities based on wave number (example scaling)
            const splitterChance = (waveNumber >= 5) ? Math.min(0.3, 0.05 + (waveNumber - 5) * 0.02) : 0; // Starts at 5%, max 30%
            const rangedChance = (waveNumber >= 3) ? Math.min(0.4, 0.1 + (waveNumber - 3) * 0.03) : 0; // Starts at 10%, max 40%

            if (possibleTypes.includes('Splitter') && roll < splitterChance) {
                selectedType = 'Splitter';
            } else if (possibleTypes.includes('RangedEnemy') && roll < splitterChance + rangedChance) {
                selectedType = 'RangedEnemy';
            } else {
                selectedType = 'Enemy'; // Fallback to basic enemy
            }
            types.push(selectedType);
        }
        // --- End Dynamic Type Distribution ---

        console.log(`Generated Wave ${waveNumber} Config: Count=${count}, PossibleTypes=${possibleTypes.join(',')}`);

        // Return the dynamically generated config object
        // Note: We return the list of types to spawn directly, not just the possibilities
        return { count: count, types: types };
    }

    startNextWave() {
        // No longer need to check/remove waveTimer here
        this.currentWave++;
        this.waveActive = true;
        this.countdownActive = false; // Ensure countdown stops when wave starts
        this.countdownValue = 0;
        console.log(`Starting Wave ${this.currentWave}`);

        // --- Boss Wave Check ---
        // --- Special Boss Wave Logic (Now Wave 8) ---
        const isBossWave = this.currentWave === 8; // Changed from 15

        if (isBossWave) {
            console.log(`Starting Boss Wave ${this.currentWave}: Spawning the Engineer!`); // Updated log
            this.enemiesToSpawn = 1; // Only one Engineer
            this.enemiesRemainingInWave = 1;
            // Spawn a single EngineerEnemy
            this.enemyManager.spawnEnemy('EngineerEnemy');
        } else {
            // --- Regular Wave Logic ---
            console.log(`Starting Regular Wave ${this.currentWave}`);
            // Generate config dynamically for the current wave
            const config = this.generateWaveConfig(this.currentWave);
            this.enemiesToSpawn = config.count;
            this.enemiesRemainingInWave = config.count;
            const typesToSpawn = config.types; // Get the specific list of types for this wave

            // Spawn regular enemies
            for (let i = 0; i < this.enemiesToSpawn; i++) {
                const enemyType = typesToSpawn[i];
                this.enemyManager.spawnEnemy(enemyType); // Pass the specific type
            }
        }

        // Update the UI in GameScreen
        if (this.scene && typeof this.scene.updateWaveUI === 'function') {
            this.scene.updateWaveUI(this.currentWave);
        } else {
            console.warn("WaveManager: Scene or updateWaveUI method not found!");
        }
    }

    update(time, delta) {
        // Handle countdown timer first
        if (this.countdownActive) {
            this.countdownValue -= delta;
            if (this.countdownValue <= 0) {
                this.countdownActive = false;
                this.countdownValue = 0;
                this.startNextWave();
            }
            // Don't process wave logic if counting down
            return;
        }

        // Original wave active logic
        if (!this.waveActive) {
            return; // Do nothing if no wave is active and not counting down
        }

        // Check if the wave should end
        // Condition 1: All initially spawned enemies for this wave have been defeated
        if (this.enemiesRemainingInWave <= 0) {
            // Condition 2: Check if *all* active enemies (including spawned ones like Splitters) are gone
            const activeEnemies = this.enemyManager.getActiveEnemyCount ? this.enemyManager.getActiveEnemyCount() : 0;
            if (activeEnemies <= 0) {
                // Only end the wave if both conditions are met
                this.endWave();
            }
            // else: Initial enemies are gone, but spawned enemies (Splitters) remain. Wait for them to be cleared.
        }
        // else: Initial enemies still remain in the wave. Continue the wave.
    }

    enemyDefeated() {
        if (this.waveActive) {
            this.enemiesRemainingInWave--;
             console.log(`Enemy defeated, ${this.enemiesRemainingInWave} remaining in wave ${this.currentWave}`);
            // Don't immediately end the wave here.
            // The update loop will now handle the check based on both
            // enemiesRemainingInWave and getActiveEnemyCount.
            // if (this.enemiesRemainingInWave <= 0) {
            //      // this.endWave(); // Removed immediate call
            // }
        }
    }


    endWave() {
        if (!this.waveActive) return; // Prevent multiple ends

        console.log(`Wave ${this.currentWave} Complete!`);
        this.waveActive = false;
        this.enemiesToSpawn = 0;
        // Maybe give rewards or trigger powerup screen here?

        // Start timer for the next wave
        // --- Game Over Check (Only if not in Endless Mode) ---
        if (this.currentWave === 8 && !this.endlessMode) {
            console.log("Reached Wave 8 end (non-endless). Transitioning to Game Over screen.");

            // --- Calculate Final Score (using GameScreen's data) ---
            // Define constants locally or access them from GameScreen if possible/preferred
            const POINTS_PER_KILL = 10;
            const PENALTY_PER_DEATH = 50;
            const POINTS_PER_SECOND = 1;
            const BOSS_KILL_MULTIPLIER = 2.5;

            const baseScore = (this.scene.kills * POINTS_PER_KILL) + Math.floor(this.scene.elapsedTime * POINTS_PER_SECOND) - (this.scene.deaths * PENALTY_PER_DEATH);
            // Apply boss multiplier if applicable (check GameScreen's bossKilled status)
            const finalScore = this.scene.bossKilled ? Math.floor(baseScore * BOSS_KILL_MULTIPLIER) : baseScore;
            console.log(`Objective Complete. Base Score: ${baseScore}, Boss Killed: ${this.scene.bossKilled}, Final Score: ${finalScore}`);
            // --- End Final Score Calculation ---

            // Transition to GameOverScene with all necessary data
            this.scene.scene.start('GameOverScene', {
                waveReached: this.currentWave,
                endlessMode: this.endlessMode, // Pass endless mode status
                outOfLives: false, // Indicate success (objective complete)
                // --- Pass Score Data ---
                finalScore: finalScore,
                kills: this.scene.kills,
                deaths: this.scene.deaths,
                timeSurvived: Math.floor(this.scene.elapsedTime), // Pass time in seconds
                bossKilled: this.scene.bossKilled
                // --- End Pass Score Data ---
            });
        } else {
            // --- Regular Wave End OR Endless Mode: Start timer for the next wave ---
            if (this.currentWave === 8 && this.endlessMode) {
                console.log("Reached Wave 8 end (endless mode). Starting countdown for next wave.");
            }
            // Instead of delayedCall, start the countdown
            this.countdownActive = true;
            this.countdownValue = this.timeBetweenWaves;
            console.log(`Starting countdown: ${this.timeBetweenWaves / 1000} seconds.`);

            // Inform the scene (GameScreen) that the countdown has started
            if (this.scene && typeof this.scene.startInterWaveCountdown === 'function') {
                this.scene.startInterWaveCountdown(this.timeBetweenWaves / 1000);
            }
        } // <-- This brace closes the else block
    }; // Added semicolon for linter (Line 190)

    // Call this method when an enemy is destroyed
    reportEnemyDestroyed() {
        this.enemyDefeated();
    }; // Added semicolon for linter (Line 194)

    getCurrentWave() {
        return this.currentWave;
    }; // Added semicolon for linter (Line 198)

    getCountdownTime() {
        // Returns remaining time in seconds, rounded up, or null if not active
        return this.countdownActive ? Math.ceil(this.countdownValue / 1000) : null;
    }; // Added semicolon for linter (Line 204)

    // New method to jump to a specific wave
    jumpToWave(waveNumber) {
        console.log(`Attempting to jump to wave ${waveNumber}`);
        // Stop any active countdown
        this.countdownActive = false;
        this.countdownValue = 0;
        // Clear existing enemies immediately before starting the new wave
        if (this.scene && this.scene.enemies) {
             console.log(`Clearing ${this.scene.enemies.length} existing enemies...`);
             // Iterate backwards to avoid issues with removing elements while iterating
             for (let i = this.scene.enemies.length - 1; i >= 0; i--) {
                 const enemy = this.scene.enemies[i];
                 if (enemy && enemy.state !== 'dead') {
                     // Mark for removal (setting health to 0 triggers removal logic in GameScreen update)
                     enemy.health = 0;
                     enemy.state = 'dead'; // Force state change
                 }
             }
             // The GameScreen update loop will handle visual/shadow removal based on the 'dead' state
             console.log("Existing enemies marked for removal.");
        } else {
             console.warn("Could not clear enemies: Scene or enemies array not found.");
        }
 
        this.currentWave = waveNumber - 1; // Set to wave *before* the target
        this.waveActive = false; // Ensure wave is not considered active before starting
        this.enemiesRemainingInWave = 0; // Reset remaining count
        // Inform the scene to potentially hide countdown UI if it was visible
        if (this.scene && typeof this.scene.hideCountdownUI === 'function') {
            this.scene.hideCountdownUI();
        }
        this.startNextWave(); // Start the target wave immediately
    }; // Added semicolon for linter (Line 238)
}

export default WaveManager;
