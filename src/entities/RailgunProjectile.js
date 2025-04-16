// src/entities/RailgunProjectile.js
import { Projectile } from './Projectile.js';

export class RailgunProjectile extends Projectile {
    constructor(x, y, direction, speed, damage, ownerId, chargeRatio, options = {}) { // Damage is now passed directly
        const railgunOptions = {
            type: 'player_railgun_projectile',
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 8, height: 8 },
            maxLifetime: options.maxLifetime || 1.5,
            ...options,
        };

        // Pass the calculated damage to the base Projectile constructor
        super(x, y, direction, speed, damage, ownerId, railgunOptions.type, railgunOptions);

        this.chargeRatio = chargeRatio; // Still store for potential visual effects
        // this.enemiesHit = new Set(); // REMOVED - No longer piercing
    }

    // Override handleCollision for non-piercing behavior
    handleCollision(otherEntity) {
        // Ignore collision with the owner
        if (otherEntity.id === this.ownerId) {
            return;
        }

        // Ignore collision with other projectiles or non-damageable entities
        if (otherEntity.type.includes('projectile') || otherEntity.type === 'plasma' || otherEntity.type === 'powerup') {
             return;
        }

        // Check if it's an enemy type
        if (otherEntity.type === 'enemy' || otherEntity.type === 'ranged_enemy') {
            console.log(`Railgun Projectile ${this.id} hit Enemy ${otherEntity.id}`);
            otherEntity.takeDamage(this.damage); // Apply damage

            // --- DESTROY ON HIT ---
            this.destroy(); // Destroy the projectile after hitting one enemy

            // Optional: Apply knockback or other effects?
            // Optional: Create impact effect

        } else if (otherEntity.id !== this.ownerId) {
            // If it hits something else significant (like a wall)
            // console.log(`Railgun Projectile ${this.id} hit non-enemy: ${otherEntity.type} ${otherEntity.id}`);
            // Destroy the projectile if it hits a non-pierceable object
            this.destroy();
        }
    }

    // Override destroy if specific cleanup is needed for railgun projectiles
    // destroy() {
    //     super.destroy();
    // }

    // Override onDeath if specific effects are needed on destruction (e.g., fade out)
    // onDeath() {
    //     super.onDeath();
    // }
}