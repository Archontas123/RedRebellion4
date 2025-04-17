import { Enemy } from './Enemy.js';
import { RangedEnemy } from './RangedEnemy.js';
// import { SplitterEnemy } from './SplitterEnemy.js'; // Removed SplitterEnemy
import { EngineerEnemy } from './EngineerEnemy.js'; // Import the new EngineerEnemy
// Removed Splinter import
// Removed EngineerBoss import
export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = []; // Local reference to enemies
        this.maxEnemies = 50; // Maximum enemies to spawn
        this.spawnTimer = 0;
        this.spawnInterval = 10; // Seconds between spawns (now spawns squads)
        this.spawnDistance = { min: 300, max: 600 }; // Increased distance range from player
        this.worldBounds = {
            width: 5000,
            height: 5000,
            centerX: 0,
            centerY: 0
        }; // Default world bounds
    }

    update(deltaTime) {
        // WaveManager now handles spawning timing and logic
    }

    // Helper function to calculate a spawn position outside player view but within bounds
    _calculateSpawnPosition() {
        const player = this.scene.player; // Assuming player exists on the scene
        if (!player) {
            console.warn("EnemyManager: Player not found on scene, spawning at random world position.");
            // Fallback: Spawn randomly within world bounds if player isn't available yet
            const padding = 100;
            const minX = this.worldBounds.centerX - this.worldBounds.width / 2 + padding;
            const maxX = this.worldBounds.centerX + this.worldBounds.width / 2 - padding;
            const minY = this.worldBounds.centerY - this.worldBounds.height / 2 + padding;
            const maxY = this.worldBounds.centerY + this.worldBounds.height / 2 - padding;
            return {
                x: Phaser.Math.Between(minX, maxX),
                y: Phaser.Math.Between(minY, maxY)
            };
        }

        // Calculate spawn position relative to the player
        const angle = Math.random() * Math.PI * 2; // Random angle
        const distance = Phaser.Math.Between(this.spawnDistance.min, this.spawnDistance.max); // Random distance within range
        let spawnX = player.x + Math.cos(angle) * distance;
        let spawnY = player.y + Math.sin(angle) * distance;

        // Clamp the position to world bounds
        const halfWidth = this.worldBounds.width / 2;
        const halfHeight = this.worldBounds.height / 2;
        const minX = this.worldBounds.centerX - halfWidth;
        const maxX = this.worldBounds.centerX + halfWidth;
        const minY = this.worldBounds.centerY - halfHeight;
        const maxY = this.worldBounds.centerY + halfHeight;

        spawnX = Phaser.Math.Clamp(spawnX, minX + 50, maxX - 50); // Add some padding
        spawnY = Phaser.Math.Clamp(spawnY, minY + 50, maxY - 50);

        return { x: spawnX, y: spawnY };
    }

    // spawnSquad() { // Keep this method for potential future use, but don't call it automatically
    //     // Determine squad size (5-8 enemies)
    //     const squadSize = 5 + Math.floor(Math.random() * 4); // 5 + (0 to 3)
    //
    //     // Calculate a random center point for the squad within world bounds
    //     // Ensure the center is not too close to the edge to avoid immediate out-of-bounds spawns
    //     const padding = 100; // Padding from world edges
    //     const minX = this.worldBounds.centerX - this.worldBounds.width / 2 + padding;
    //     const maxX = this.worldBounds.centerX + this.worldBounds.width / 2 - padding;
    //     const minY = this.worldBounds.centerY - this.worldBounds.height / 2 + padding;
    //     const maxY = this.worldBounds.centerY + this.worldBounds.height / 2 - padding;
    //
    //     const squadCenterX = minX + Math.random() * (maxX - minX);
    //     const squadCenterY = minY + Math.random() * (maxY - minY);
    //
    //     console.log(`Spawning squad of ${squadSize} near (${squadCenterX.toFixed(0)}, ${squadCenterY.toFixed(0)})`);
    //
    //     // Spawn each enemy in the squad with slight position variations
    //     const squadSpawnRadius = 50; // Max distance from squad center
    //     for (let i = 0; i < squadSize; i++) {
    //         // Check if we've hit the max enemy limit during squad spawning
    //         if (this.scene.enemies.length >= this.maxEnemies) {
    //             console.log("Max enemy limit reached during squad spawn.");
    //             break; // Stop spawning this squad
    //         }
    //
    //         const angle = Math.random() * Math.PI * 2;
    //         const radius = Math.random() * squadSpawnRadius;
    //         const spawnX = squadCenterX + Math.cos(angle) * radius;
    //         const spawnY = squadCenterY + Math.sin(angle) * radius;
    //
    //         // Ensure spawn position is within world bounds (though center calculation helps)
    //         const clampedX = Phaser.Math.Clamp(spawnX, minX - padding, maxX + padding);
    //         const clampedY = Phaser.Math.Clamp(spawnY, minY - padding, maxY + padding);
    //
    //
    //         this.spawnEnemy(clampedX, clampedY); // Call the modified spawnEnemy
    //     }
    // }

    // Modified spawnEnemy: Accepts type, x, and y
    spawnEnemy(enemyType, x, y) {
        // If x or y are not provided, calculate a position
        if (x === undefined || y === undefined) {
            const pos = this._calculateSpawnPosition();
            x = pos.x;
            y = pos.y;
        }

        let enemy;
        // Random base properties (can be adjusted per type later)
        const enemySize = 30 + Math.floor(Math.random() * 20); // 30-50px
        const collisionBounds = { x: 0, y: 0, width: enemySize, height: enemySize };

        switch (enemyType) {
            case 'RangedEnemy':
                console.log(`Spawning RangedEnemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
                enemy = new RangedEnemy(x, y, {
                    collisionBounds: collisionBounds,
                    scene: this.scene,
                    color: 0x0000ff // Blue for Ranged
                });
                break;
            // case 'SplitterEnemy': // Removed SplitterEnemy case
            //     console.log(`Spawning SplitterEnemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
            //     enemy = new SplitterEnemy(x, y, {
            //         collisionBounds: { x: 0, y: 0, width: 45, height: 45 },
            //         scene: this.scene,
            //         color: 0x00ff00 // Green for Splitter
            //     });
            //     break;
            case 'EngineerEnemy':
                console.log(`Spawning EngineerEnemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
                enemy = new EngineerEnemy(x, y, {
                    scene: this.scene
                    // Specific options for Engineer are set within its constructor
                });
                break;
            case 'Enemy': // Fallback to base Enemy
            default:
                 console.log(`Spawning base Enemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
                 const enemySpeed = 60 + Math.floor(Math.random() * 60); // 60-120 speed
                 enemy = new Enemy(x, y, {
                     moveSpeed: enemySpeed,
                     collisionBounds: collisionBounds,
                     aggressiveness: 0.5 + Math.random() * 0.5, // 0.5-1.0 aggressiveness
                     scene: this.scene,
                     color: 0xff0000 // Red for base Enemy
                 });
                 break;
        }

        if (enemy) {
             // Check max enemy limit before adding
             if (this.scene.enemies.length >= this.maxEnemies) {
                 console.log("Max enemy limit reached. Cannot spawn:", enemyType);
                 // Optionally destroy the created enemy instance if not added
                 // enemy.destroy(); // If Enemy class has a destroy method
                 return null; // Indicate spawn failed
             }
             // Add to both the local and scene enemy arrays
             this.enemies.push(enemy);
             this.scene.enemies.push(enemy);
             return enemy;
        } else {
            console.error(`EnemyManager: Failed to create enemy of type ${enemyType}`);
            return null;
        }
    }
    // Removed the duplicated code block that caused syntax errors

    // Clean up enemies when resetting
    clearAllEnemies() {
        // Clear local reference
        this.enemies = [];
        // The GameScreen is responsible for cleaning up enemy visuals/objects from the scene itself
        console.log("EnemyManager cleared its local enemy reference.");
    }

    // Set world bounds for spawn logic
    setWorldBounds(bounds) {
        this.worldBounds = bounds;
        // console.log("EnemyManager world bounds set:", bounds); // Commented out noisy log
    }

    // Method for WaveManager to check remaining enemies
    getActiveEnemyCount() {
        // Filter enemies in the scene that are not dead
        // Ensure scene and enemies array exist
        if (!this.scene || !this.scene.enemies) {
            console.warn("getActiveEnemyCount: Scene or scene.enemies not available.");
            return 0;
        }
        return this.scene.enemies.filter(enemy => enemy && enemy.state !== 'dead').length;
    }

    destroy() {
        console.log("Destroying EnemyManager...");
        this.clearAllEnemies(); // Clear local array
        this.scene = null; // Release scene reference
    }
}