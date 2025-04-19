// src/entities/Projectile.js
import { Entity } from './Entity.js';

export class Projectile extends Entity {
    constructor(x, y, direction, speed, damage, ownerId, type = 'projectile', options = {}) {
        const projectileOptions = {
            type: type, // e.g., 'enemy_projectile', 'player_projectile'
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 10, height: 10 }, // Small collision box
            friction: 1, // No friction, moves constantly
            maxHealth: 1, // Destroyed on first hit
            ...options,
        };

        super(x, y, projectileOptions);

        this.speed = speed;
        this.damage = damage;
        this.ownerId = ownerId; // ID of the entity that fired it (to prevent self-collision)
        this.direction = { ...direction }; // Store normalized direction {x, y}

        // Set initial velocity based on direction and speed
        this.velocityX = this.direction.x * this.speed;
        this.velocityY = this.direction.y * this.speed;

        // Lifetime properties
        this.lifeTimer = 0;
        this.maxLifetime = options.maxLifetime || 3; // seconds before disappearing
    }

    update(deltaTime, worldContext) {
        // If already marked for removal (e.g., after collision), do nothing
        if (this.state === 'dead') return;

        // Update lifetime timer
        this.lifeTimer += deltaTime;
        if (this.lifeTimer >= this.maxLifetime) {
            this.destroy(); // Mark for removal if lifetime expires
            return;
        }

        // Movement is handled by the base Entity update using velocityX/Y
        super.update(deltaTime);

        // Optional: Check world bounds if needed, though lifetime usually handles it
        // if (worldContext && worldContext.worldBounds) {
        //     if (this.x < worldContext.worldBounds.minX || this.x > worldContext.worldBounds.maxX ||
        //         this.y < worldContext.worldBounds.minY || this.y > worldContext.worldBounds.maxY) {
        //         this.destroy();
        //     }
        // }
    }

    // Handle collision with other entities
    handleCollision(otherEntity) {
        // --- IMMEDIATE OWNER CHECK ---
        // Ignore collision with the entity that fired it, regardless of type checks below.
        if (otherEntity.id === this.ownerId) {
            // console.log(`Projectile ${this.id} ignoring collision with owner ${this.ownerId}`); // Optional debug
            return;
        }
        // --- END IMMEDIATE OWNER CHECK ---

        // Ignore collision with other projectiles for now
        if (otherEntity.type.includes('projectile')) {
             return;
        }

        // Specific collision logic based on projectile type
        // --- DEBUG LOGGING ---
        console.log(`[Projectile.handleCollision] Collision detected: Projectile ${this.id} (Type: ${this.type}, Owner: ${this.ownerId}) vs Entity ${otherEntity.id} (Type: ${otherEntity.type})`);
        // --- END DEBUG LOGGING ---

        if (this.type === 'enemy_projectile' && otherEntity.type === 'player') {
            // --- ADD LOGGING ---
            console.log(`[Projectile.handleCollision] Condition met: Projectile ${this.id} (Type: ${this.type}) vs Player ${otherEntity.id} (Type: ${otherEntity.type}). Damage: ${this.damage}`);
            // --- END LOGGING ---
            // Pass 'this' (the projectile) as the source for knockback calculation
            console.log(`[Projectile.handleCollision] Calling takeDamage on Player ${otherEntity.id}`); // DEBUG LOG
            otherEntity.takeDamage(this.damage, this); 
            this.destroy(); // Destroy projectile on hit
        } else if (this.type === 'player_projectile' && (otherEntity.type === 'enemy' || otherEntity.type === 'ranged_enemy' || otherEntity.type === 'engineer' || otherEntity.type === 'drone_enemy')) { // Added 'drone_enemy'
            // Example if player could shoot projectiles
            // console.log(`Projectile ${this.id} hit Enemy ${otherEntity.id}`);
            otherEntity.takeDamage(this.damage);
            this.destroy(); // Destroy projectile on hit
        } else {
            // Optional: Collide with environment? Destroy on wall hit?
            // For now, just destroy on any other significant collision
            // Check if it's not the owner or another projectile before destroying
             if (otherEntity.id !== this.ownerId && !otherEntity.type.includes('projectile')) {
                 // console.log(`Projectile ${this.id} hit something else: ${otherEntity.type} ${otherEntity.id}`);
                 // this.destroy(); // Uncomment if projectiles should break on walls/other entities
             }
        }
    }

    // Override destroy to set state for removal
    destroy() {
        if (this.state !== 'dead') {
            // console.log(`Projectile ${this.id} destroyed.`); // Optional debug log
            this.setState('dead'); // Mark for removal by the scene/manager
            this.velocityX = 0;
            this.velocityY = 0;
            // The actual removal from the scene/arrays happens in the manager/scene update loop
        }
    }

    // Override onDeath (called by setState('dead'))
    onDeath() {
        // No specific action needed here for basic projectiles,
        // but could trigger explosion effects, etc.
        super.onDeath();
    }
}
