import { Enemy } from './Enemy.js';

class EnemyManager {
    constructor(scene) {
        this.scene = scene; // Reference to the GameScreen scene
        this.enemies = []; // Array managed by the manager
        this.waveNumber = 0;
        this.waveTimer = null; // Phaser timer event
        this.timeBetweenWaves = 15000; // 15 seconds between waves
        this.enemiesPerWave = 3; // Start with 3 enemies
        this.spawnRadius = 600; // How far from the player enemies should spawn
        this.minSpawnRadius = 400; // Minimum distance to avoid spawning on top of player
        this.isSpawning = false; // Flag to prevent overlapping spawns

        // Start the first wave after a short delay
        this.scene.time.delayedCall(5000, () => { // 5 second initial delay
            this.startNextWave();
        });
    }

    startNextWave() {
        if (this.isSpawning) return; // Don't start if already spawning

        this.isSpawning = true;
        this.waveNumber++;
        console.log(`Starting Wave ${this.waveNumber}`);

        // Increase difficulty slightly each wave (example)
        const currentEnemiesToSpawn = this.enemiesPerWave + Math.floor(this.waveNumber / 3); // Increase every 3 waves

        for (let i = 0; i < currentEnemiesToSpawn; i++) {
            // Spawn enemies with a slight delay between them
            this.scene.time.delayedCall(i * 500, () => { // 500ms delay between spawns in a wave
                this.spawnEnemy();
            });
        }

        // Schedule the end of the spawning phase and the start of the next wave timer
        this.scene.time.delayedCall(currentEnemiesToSpawn * 500 + 1000, () => {
             this.isSpawning = false;
             console.log(`Wave ${this.waveNumber} spawning complete. Next wave in ${this.timeBetweenWaves / 1000}s`);
             // Schedule the next wave
             this.waveTimer = this.scene.time.delayedCall(this.timeBetweenWaves, () => {
                 this.startNextWave();
             });
        });
    }

    spawnEnemy() {
        if (!this.scene.player || this.scene.player.state === 'dead') return; // Don't spawn if player doesn't exist or is dead

        const playerX = this.scene.player.x;
        const playerY = this.scene.player.y;

        // Find a spawn point outside the player's view but within a reasonable range
        let spawnX, spawnY;
        let attempts = 0;
        do {
            const angle = Math.random() * Math.PI * 2;
            const radius = this.minSpawnRadius + Math.random() * (this.spawnRadius - this.minSpawnRadius);
            spawnX = playerX + Math.cos(angle) * radius;
            spawnY = playerY + Math.sin(angle) * radius;
            attempts++;
        } while (this.isSpawnPointVisible(spawnX, spawnY) && attempts < 10); // Try to spawn off-screen

        // Create Enemy instance
        const enemy = new Enemy(spawnX, spawnY, {
            // Customize stats based on wave number if desired
            // maxHealth: 50 + this.waveNumber * 5,
            // speed: 50 + this.waveNumber * 2,
        });

        // Add to the manager's list AND the scene's group/list if needed for physics/rendering
        this.enemies.push(enemy);
        this.scene.enemies.push(enemy); // Add to the scene's list for update/drawing loops

        // TODO: Add visual representation in the scene
        // Example:
        // enemy.visual = this.scene.add.rectangle(spawnX, spawnY, 32, 32, 0xff0000); // Red square for enemy
        // enemy.visual.setDepth(1);
        // this.scene.enemyVisualsGroup.add(enemy.visual); // Assuming a group exists

        console.log(`Spawned enemy at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
    }

    isSpawnPointVisible(x, y) {
        // Basic check if the point is within the camera bounds
        const cam = this.scene.cameras.main;
        return Phaser.Geom.Rectangle.Contains(cam.worldView, x, y);
    }

    update(time, delta) {
        const dtSeconds = delta / 1000;
        const worldContext = this.scene; // Pass the scene as world context

        // Update all enemies managed by this manager
        this.enemies.forEach(enemy => {
            if (enemy.state !== 'dead') {
                enemy.update(dtSeconds, worldContext);
                // Sync visual position if visuals exist
                // if (enemy.visual) {
                //     enemy.visual.setPosition(enemy.x, enemy.y);
                // }
            }
        });

        // Remove dead enemies from the manager's list
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.state === 'dead' /* && !enemy.markedForRemoval */) {
                 // Optionally add a delay or animation before actual removal
                 // enemy.markedForRemoval = true;
                 // this.scene.time.delayedCall(1000, () => this.removeEnemy(enemy));
                 // For now, immediate removal from manager list
                 // Visual removal should happen in the scene's update loop where it checks its own list
                 return false;
            }
            return true;
        });
    }

    // Optional: Method to handle actual removal after delay/animation
    // removeEnemy(enemy) {
    //     const index = this.enemies.indexOf(enemy);
    //     if (index > -1) {
    //         this.enemies.splice(index, 1);
    //     }
    //     // Visual removal should be handled by the scene
    // }

    destroy() {
        // Clear timers
        if (this.waveTimer) {
            this.waveTimer.remove();
            this.waveTimer = null;
        }
        // Stop any delayed calls related to spawning
        this.scene.time.removeAllEvents(); // Be careful if other timers exist

        // Destroy enemies (optional, depends if scene handles this)
        // this.enemies.forEach(enemy => {
        //     if (enemy.visual) enemy.visual.destroy();
        //     // Call enemy.destroy() if it exists
        // });
        this.enemies = [];
        console.log("EnemyManager destroyed.");
    }
}

export { EnemyManager };