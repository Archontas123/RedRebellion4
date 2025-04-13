import { Enemy } from './Enemy.js';

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = []; // Local reference to enemies
        this.maxEnemies = 10; // Maximum enemies to spawn
        this.spawnTimer = 0;
        this.spawnInterval = 2; // Seconds between spawns
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
            this.spawnTimer = 0;
            this.spawnRandomEnemy();
        }
    }

    spawnRandomEnemy() {
        // Check that we have access to the player
        if (!this.scene.player) {
            console.log("Cannot spawn enemy: Player not found");
            return;
        }

        // Get player position
        const playerX = this.scene.player.x;
        const playerY = this.scene.player.y;

        // Choose a random distance from min-max range
        const spawnDistance = this.spawnDistance.min + Math.random() * (this.spawnDistance.max - this.spawnDistance.min);

        // Choose a random angle
        const angle = Math.random() * Math.PI * 2;

        // Calculate spawn position
        const spawnX = playerX + Math.cos(angle) * spawnDistance;
        const spawnY = playerY + Math.sin(angle) * spawnDistance;

        // Create the enemy
        this.spawnEnemy(spawnX, spawnY);
    }

    spawnEnemy(x, y) {
        console.log(`Spawning enemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);

        // Random enemy properties
        const enemySize = 30 + Math.floor(Math.random() * 20); // 30-50px
        const enemySpeed = 60 + Math.floor(Math.random() * 60); // 60-120 speed
        const enemyHealth = 30 + Math.floor(Math.random() * 50); // 30-80 health

        // Create enemy with randomized properties
        const enemy = new Enemy(x, y, {
            maxHealth: enemyHealth,
            moveSpeed: enemySpeed,
            collisionBounds: { x: 0, y: 0, width: enemySize, height: enemySize },
            aggressiveness: 0.5 + Math.random() * 0.5 // 0.5-1.0 aggressiveness
        });

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