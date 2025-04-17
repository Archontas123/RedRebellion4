// Removed EngineerBoss import

class WaveManager {
    constructor(scene, enemyManager) {
        this.scene = scene;
        this.enemyManager = enemyManager;
        this.currentWave = 0;
        this.waveActive = false;
        this.enemiesToSpawn = 0;
        this.enemiesRemainingInWave = 0;
        this.timeBetweenWaves = 5000; // 5 seconds
        this.waveTimer = null;

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
        if (this.waveTimer) {
            this.waveTimer.remove(false); // Clear any existing timer
        }
        this.currentWave++;
        this.waveActive = true;
        console.log(`Starting Wave ${this.currentWave}`);

        // --- Boss Wave Check ---
        // --- Special Wave 15 Logic ---
        const isWave15 = this.currentWave === 15;

        if (isWave15) {
            console.log(`Starting Special Wave ${this.currentWave}: Spawning the Engineer!`);
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
        if (!this.waveActive) {
            return; // Do nothing if no wave is active
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
        this.waveTimer = this.scene.time.delayedCall(this.timeBetweenWaves, () => {
            this.startNextWave();
        }, [], this);
        console.log(`Next wave in ${this.timeBetweenWaves / 1000} seconds.`);
    }

    // Call this method when an enemy is destroyed
    reportEnemyDestroyed() {
       this.enemyDefeated();
    }
 
    getCurrentWave() {
        return this.currentWave;
    }
 
    // New method to jump to a specific wave
    jumpToWave(waveNumber) {
        console.log(`Attempting to jump to wave ${waveNumber}`);
        if (this.waveTimer) {
            this.waveTimer.remove(false); // Clear any pending wave start timer
            this.waveTimer = null;
            console.log("Cleared pending wave timer.");
        }
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
        this.startNextWave(); // Start the target wave immediately
    }
}

export default WaveManager;