import { Enemy } from './Enemy.js';

export class DroneEnemy extends Enemy {
    constructor(x, y, options = {}) {
        const droneOptions = {
            maxHealth: 15, // Low health
            moveSpeed: 110, // Slightly faster than base enemy
            damageAmount: 2, // Very low contact damage
            friction: 0.95, // Less friction for quicker movement changes
            collisionBounds: { x: 0, y: 0, width: 20, height: 20 }, // Smaller size
            color: '#FFD700', // Gold/Yellow color for drones
            agroRange: 50 * 50, // Standard agro range
            separationRadius: 30, // Less separation needed for smaller drones
            separationForce: 90,
            type: 'drone_enemy', // Specific type identifier
            spritePath: 'assets/drone.png', // Added sprite path
            // color: '#FFD700', // Color determined by sprite
            ...options, // Allow specific overrides from spawner
        };

        super(x, y, droneOptions);

        this.explosionRadius = 60; // Radius of the explosion on death
        this.explosionDamage = 20; // Damage dealt by the explosion
    }

    onDeath() {
        // Call base onDeath first (stops movement, sets state, handles basic cleanup)
        // Note: super.onDeath() might handle powerup drops, which we might want to disable for drones.
        // We'll skip the super.onDeath() for now to avoid potential powerup drops from drones.
        // Instead, manually set state and stop movement.
        this.state = 'dead';
        this.velocityX = 0;
        this.velocityY = 0;
        this.isStunned = false; // Clear stun on death
        console.log(`DroneEnemy ${this.id} died and is exploding!`);

        // --- Explosion Logic ---
        // 1. Visual Effect
        if (this.scene && typeof this.scene.createExplosionEffect === 'function') {
             this.scene.createExplosionEffect(this.x, this.y, this.explosionRadius);
        } else {
            console.warn(`DroneEnemy ${this.id}: Scene or createExplosionEffect method not found!`);
            // Fallback: Draw a simple circle? (Requires access to drawing context, tricky here)
        }

        // 2. Damage Nearby Entities
        // Assuming the scene has access to the EnemyManager or a general entity manager
        let entitiesToDamage = [];
        if (this.scene && this.scene.enemyManager && this.scene.player) {
            // Check player
            entitiesToDamage.push(this.scene.player);
            // Check other enemies (excluding self and other drones potentially)
            // Access the scene's enemy array directly
            entitiesToDamage = entitiesToDamage.concat(
                this.scene.enemies.filter(e => e !== this) // Get all other enemies from the scene list
            );

        } else if (this.scene && this.scene.entityManager) { // Fallback to a generic entity manager
             entitiesToDamage = this.scene.entityManager.getEntitiesNear(this.x, this.y, this.explosionRadius)
                                     .filter(e => e !== this); // Ensure not targeting self
        } else {
             console.warn(`DroneEnemy ${this.id}: Scene, EnemyManager/Player, or EntityManager not found for explosion damage.`);
        }

        entitiesToDamage.forEach(entity => {
             // Don't damage dead things
             if (entity.state !== 'dead') {
                 const dx = entity.x - this.x;
                 const dy = entity.y - this.y;
                 const distanceSq = dx * dx + dy * dy;

                 // Check if within circular radius
                 if (distanceSq <= this.explosionRadius * this.explosionRadius) {
                     // Apply damage (only to player and other enemies for now)
                     if (entity.type === 'player' || entity.type === 'enemy' || entity.type === 'drone_enemy' || entity.type === 'engineer_enemy' || entity.type === 'ranged_enemy' || entity.type === 'splitter_enemy') { // Check against known enemy/player types
                         console.log(`Drone explosion hitting ${entity.type} ${entity.id} for ${this.explosionDamage} damage.`);
                         entity.takeDamage(this.explosionDamage);
                     }
                 }
             }
         });
        // --- End Explosion Logic ---

        // The EnemyManager should handle the actual removal of the 'dead' entity from the game loop.
    }

    // Removed custom draw method - rely on parent Entity draw
}
