import { Enemy } from './Enemy.js';
import { RangedEnemy } from './RangedEnemy.js'; // Import the new enemy type

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
        let enemy;
        const enemyTypeRoll = Math.random();

        // Example: 70% chance for melee, 30% chance for ranged
        if (enemyTypeRoll < 0.7) {
            // --- Spawn Melee Enemy ---
            console.log(`Spawning Melee Enemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
            const enemySize = 30 + Math.floor(Math.random() * 20); // 30-50px
            const enemySpeed = 70 + Math.floor(Math.random() * 60); // 70-130 speed (slightly faster base)
            const enemyHealth = 40 + Math.floor(Math.random() * 60); // 40-100 health (slightly tankier base)

            enemy = new Enemy(x, y, {
                maxHealth: enemyHealth,
                moveSpeed: enemySpeed,
                collisionBounds: { x: 0, y: 0, width: enemySize, height: enemySize },
                aggressiveness: 0.6 + Math.random() * 0.4 // 0.6-1.0 aggressiveness
            });

        } else {
            // --- Spawn Ranged Enemy ---
             console.log(`Spawning Ranged Enemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
             const enemySize = 25 + Math.floor(Math.random() * 15); // 25-40px (slightly smaller)
             // Ranged enemies use default stats defined in RangedEnemy.js unless overridden here
             // We can still randomize some aspects if desired:
             const enemyHealth = 30 + Math.floor(Math.random() * 30); // 30-60 health (less tanky)
             const attackCooldown = 1.5 + Math.random() * 1.0; // 1.5s - 2.5s cooldown

             enemy = new RangedEnemy(x, y, {
                 maxHealth: enemyHealth,
                 collisionBounds: { x: 0, y: 0, width: enemySize, height: enemySize },
                 attackCooldown: attackCooldown,
                 // Other RangedEnemy specific options could be randomized here too
             });
        }

        // Add to both the local and scene enemy arrays
        if (enemy) {
            this.enemies.push(enemy);
            this.scene.enemies.push(enemy); // Ensure GameScreen knows about it
        }

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