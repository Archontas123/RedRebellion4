import { Enemy } from './Enemy.js';
import { RangedEnemy } from './RangedEnemy.js'; // Import the RangedEnemy class

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = []; // Local reference to enemies
        this.maxEnemies = 50; // Maximum enemies to spawn
        this.spawnTimer = 0;
        this.spawnInterval = 10; // Seconds between spawns (now spawns squads)
        this.spawnDistance = { min: 200, max: 500 }; // Distance range from player
        this.worldBounds = {
            width: 5000,
            height: 5000,
            centerX: 0,
            centerY: 0
        }; // Default world bounds
    }

    update(deltaTime) {
        // Update spawn timer
        this.spawnTimer += deltaTime;

        // Don't spawn if at max capacity
        if (this.scene.enemies.length >= this.maxEnemies) {
            return;
        }

        // Spawn a new enemy when timer expires
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0; // Reset timer
            this.spawnSquad(); // Spawn a squad instead of a single enemy
        }
    }

    spawnSquad() {
        // Determine squad size (5-8 enemies)
        const squadSize = 5 + Math.floor(Math.random() * 4); // 5 + (0 to 3)

        // Calculate a random center point for the squad within world bounds
        // Ensure the center is not too close to the edge to avoid immediate out-of-bounds spawns
        const padding = 100; // Padding from world edges
        const minX = this.worldBounds.centerX - this.worldBounds.width / 2 + padding;
        const maxX = this.worldBounds.centerX + this.worldBounds.width / 2 - padding;
        const minY = this.worldBounds.centerY - this.worldBounds.height / 2 + padding;
        const maxY = this.worldBounds.centerY + this.worldBounds.height / 2 - padding;

        const squadCenterX = minX + Math.random() * (maxX - minX);
        const squadCenterY = minY + Math.random() * (maxY - minY);

        console.log(`Spawning squad of ${squadSize} near (${squadCenterX.toFixed(0)}, ${squadCenterY.toFixed(0)})`);

        // Spawn each enemy in the squad with slight position variations
        const squadSpawnRadius = 50; // Max distance from squad center
        for (let i = 0; i < squadSize; i++) {
            // Check if we've hit the max enemy limit during squad spawning
            if (this.scene.enemies.length >= this.maxEnemies) {
                console.log("Max enemy limit reached during squad spawn.");
                break; // Stop spawning this squad
            }

            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * squadSpawnRadius;
            const spawnX = squadCenterX + Math.cos(angle) * radius;
            const spawnY = squadCenterY + Math.sin(angle) * radius;

            // Ensure spawn position is within world bounds (though center calculation helps)
            const clampedX = Phaser.Math.Clamp(spawnX, minX - padding, maxX + padding);
            const clampedY = Phaser.Math.Clamp(spawnY, minY - padding, maxY + padding);


            this.spawnEnemy(clampedX, clampedY);
        }
    }

    spawnEnemy(x, y) {
        let enemy;
        const enemyTypeRoll = Math.random(); // Roll for enemy type

        // Random base properties (can be adjusted per type)
        const enemySize = 30 + Math.floor(Math.random() * 20); // 30-50px
        const collisionBounds = { x: 0, y: 0, width: enemySize, height: enemySize };

        if (enemyTypeRoll < 0.25) { // 25% chance to spawn a RangedEnemy
            console.log(`Spawning RangedEnemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
            enemy = new RangedEnemy(x, y, {
                // RangedEnemy specific options (can use defaults or customize)
                // maxHealth: 35, // Example: Use default from RangedEnemy class
                // moveSpeed: 60, // Example: Use default
                collisionBounds: collisionBounds,
                // attackRange: 250, // Example: Use default
                // attackCooldown: 2.0, // Example: Use default
                // projectileSpeed: 300, // Example: Use default
                scene: this.scene // Pass scene reference
            });
        } else { // 75% chance to spawn a base Enemy
            console.log(`Spawning base Enemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
            const enemySpeed = 60 + Math.floor(Math.random() * 60); // 60-120 speed
            enemy = new Enemy(x, y, {
                // maxHealth is now handled by the Enemy class default
                moveSpeed: enemySpeed,
                collisionBounds: collisionBounds,
                aggressiveness: 0.5 + Math.random() * 0.5, // 0.5-1.0 aggressiveness
                scene: this.scene // Pass scene reference
            });
        }


        // Add to both the local and scene enemy arrays
        this.enemies.push(enemy);
        this.scene.enemies.push(enemy);

        return enemy;
    }

    // Clean up enemies when resetting
    clearAllEnemies() {
        this.enemies = [];
        // The GameScreen is responsible for cleaning up enemy visuals
    }

    // Set world bounds for spawn logic
    setWorldBounds(bounds) {
        this.worldBounds = bounds;
    }

    destroy() {
        this.clearAllEnemies();
        this.scene = null;
    }
}