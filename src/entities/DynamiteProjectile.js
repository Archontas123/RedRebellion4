// src/entities/DynamiteProjectile.js
import { Projectile } from './Projectile.js';
import { Player } from './Player.js'; // To check type for damage
import { Entity } from './Entity.js'; // Import Entity for calling its update method

export class DynamiteProjectile extends Projectile {
    constructor(x, y, options = {}) {
        const dynamiteOptions = {
            type: 'dynamite_projectile', // Specific type
            collisionBounds: { x: 0, y: 0, width: 20, height: 10 }, // Small stick shape
            friction: 0.99, // Slight air resistance
            maxHealth: 1, // Destroyed on explosion
            size: 15, // Visual size reference
            color: '#8B0000', // Dark red color for dynamite stick
            maxLifetime: (options.fuseTime || 3.0) + 0.5, // Ensure it lives slightly longer than fuse
            gravity: 800, // Apply gravity for arcing motion
            ...options, // Allow overriding defaults (like velocityX/Y, scene, owner)
            damage: 0, // Projectile itself doesn't deal damage on direct hit
            speed: 0, // Speed is determined by initial velocityX/Y
            direction: { x: 0, y: 0 }, // Direction is determined by initial velocityX/Y
        };

        // Call Projectile constructor with modified options
        // Note: We pass 0 for speed/damage/direction as they are handled differently or irrelevant
        super(x, y, { x: 0, y: 0 }, 0, 0, options.owner ? options.owner.id : null, dynamiteOptions.type, dynamiteOptions);

        // Dynamite specific properties
        this.fuseTime = options.fuseTime || 3.0; // Time until explosion
        this.fuseTimer = this.fuseTime;
        this.explosionDamage = options.damage || 350; // Damage dealt by explosion
        this.explosionRadius = options.explosionRadius || 120;
        this.owner = options.owner || null; // Reference to the entity that threw it
        this.gravity = dynamiteOptions.gravity; // Store gravity value

        // Visual properties
        this.rotationSpeed = (Math.random() - 0.5) * 10; // Random initial spin
        this.angle = Math.random() * Math.PI * 2; // Random initial angle
        // Fuse visual properties
        this.fuseBlinkTimer = 0;
        this.fuseBlinkInterval = 0.2; // Blink faster as fuse runs out
        this.fuseVisible = true;

        console.log(`Dynamite ${this.id} created by ${this.ownerId} with fuse ${this.fuseTime}s`);
    }

    update(deltaTime, worldContext) {
        // If already dead (exploded), do nothing
        if (this.state === 'dead') return;

        // Update fuse timer
        this.fuseTimer -= deltaTime;
        this.fuseBlinkTimer -= deltaTime;
 
        // Update fuse blink state
        const fuseRemainingRatio = Math.max(0, this.fuseTimer / this.fuseTime);
        const currentBlinkInterval = 0.1 + (this.fuseBlinkInterval * fuseRemainingRatio * fuseRemainingRatio); // Blink faster near end
        if (this.fuseBlinkTimer <= 0) {
            this.fuseVisible = !this.fuseVisible;
            this.fuseBlinkTimer = currentBlinkInterval;
        }


        // Check for explosion
        if (this.fuseTimer <= 0) {
            this.explode(worldContext);
            return; // Stop further updates after exploding
        }

        // Apply gravity
        this.velocityY += this.gravity * deltaTime;

        // Apply rotation
        this.angle += this.rotationSpeed * deltaTime;

        // Call the base Entity update for movement (which uses velocityX/Y and friction)
        // We skip the base Projectile update as it handles lifetime differently
        Entity.prototype.update.call(this, deltaTime); // Call Entity's update directly

        // Optional: Check for collision with solid world tiles (if implemented)
        // if (worldContext && worldContext.worldManager && worldContext.worldManager.isSolid(this.x, this.y)) {
        //     this.explode(worldContext);
        //     return;
        // }
    }

    explode(worldContext) {
        if (this.state === 'dead') return; // Prevent double explosion

        console.log(`Dynamite ${this.id} exploding at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        this.destroy(); // Mark as dead first

        // --- Create Visual Explosion ---
        if (this.scene && typeof this.scene.createExplosion === 'function') {
            this.scene.createExplosion(this.x, this.y, this.explosionRadius, {
                color: '#FFA500', // Orange/Yellow explosion
                particleCount: 50, // More particles for bigger boom
                duration: 0.6
            });
        }
         // Add shockwave effect
        if (this.scene && typeof this.scene.createShockwaveEffect === 'function') {
            this.scene.createShockwaveEffect(this.x, this.y, this.explosionRadius * 1.5); // Slightly larger shockwave
        }
        // Optional: Play sound
        // if (this.scene && typeof this.scene.playSound === 'function') {
        //     this.scene.playSound('dynamite_explosion', { volume: 0.8 });
        // }


        // --- Deal Damage in Radius ---
        if (!this.scene) return; // Need scene context

        const explosionRadiusSq = this.explosionRadius * this.explosionRadius;

        // Check player
        if (this.scene.player && this.scene.player.state !== 'dead') {
            const dx = this.scene.player.x - this.x;
            const dy = this.scene.player.y - this.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= explosionRadiusSq) {
                console.log(`Dynamite ${this.id} hitting Player ${this.scene.player.id}`);
                this.scene.player.takeDamage(this.explosionDamage);
                // Optional: Apply knockback
                // const angle = Math.atan2(dy, dx);
                // const knockbackForce = 300 * (1 - Math.sqrt(distSq) / this.explosionRadius); // Stronger closer
                // this.scene.player.applyForce(Math.cos(angle) * knockbackForce, Math.sin(angle) * knockbackForce);
            }
        }

        // Check enemies (excluding the owner)
        if (this.scene.enemies) {
            this.scene.enemies.forEach(enemy => {
                // Ensure enemy exists, is not dead, and is not the owner before processing
                if (enemy && enemy.state !== 'dead' && enemy.id !== this.ownerId) {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq <= explosionRadiusSq) {
                         console.log(`Dynamite ${this.id} hitting Enemy ${enemy.id}`);
                        enemy.takeDamage(this.explosionDamage);
                        // Optional: Apply knockback to enemies
                        // const angle = Math.atan2(dy, dx);
                        // const knockbackForce = 250 * (1 - Math.sqrt(distSq) / this.explosionRadius);
                        // enemy.applyForce(Math.cos(angle) * knockbackForce, Math.sin(angle) * knockbackForce);
                    }
                }
            });
        }
    }

    // Override handleCollision - Dynamite explodes on timer or hitting solid terrain (if implemented)
    // It should pass through entities until it explodes.
    handleCollision(otherEntity) {
        // Ignore collision with owner
        if (!otherEntity || otherEntity.id === this.ownerId) {
            return;
        }

        // Ignore collisions with other projectiles or things it shouldn't interact with before exploding
        if (otherEntity.type.includes('projectile') || otherEntity.type === 'powerup' || otherEntity.type === 'xp_orb') {
             return;
        }

        // Optional: Explode on hitting solid terrain/walls if implemented
        // if (otherEntity.isSolid) { // Assuming an 'isSolid' property or similar
        //     console.log(`Dynamite ${this.id} hit solid object ${otherEntity.id}, exploding early.`);
        //     this.explode();
        // }

        // Otherwise, do nothing - let the fuse timer handle explosion.
    }

    // Override destroy to ensure explosion happens if destroyed prematurely (e.g., lifetime)
    destroy() {
        if (this.state !== 'dead') {
            // Ensure explosion happens even if destroyed by other means (like maxLifetime)
            if (this.fuseTimer > 0) { // Only explode if fuse hasn't naturally finished
                 console.log(`Dynamite ${this.id} destroyed prematurely, triggering explosion.`);
                 // Set fuse to 0 to ensure explode logic runs correctly if called again
                 this.fuseTimer = 0;
                 this.explode(); // Trigger explosion logic
            } else {
                // If fuse already ran out, just mark as dead using Entity's destroy
                 super.destroy(); // Call parent's destroy method
            }
        }
    }

     // Override onDeath (called by setState('dead') via Entity.destroy)
     onDeath() {
        // Stop movement and mark as not visible/collidable immediately
        this.velocityX = 0;
        this.velocityY = 0;
        this.visible = false;
        this.collidable = false;
        // Base Entity onDeath handles state setting
        Entity.prototype.onDeath.call(this);
    }


    // Override draw for custom visuals
    draw(ctx, camera) {
        if (this.state === 'dead' || !this.visible) return;

        const camX = this.x - camera.x;
        const camY = this.y - camera.y;

        ctx.save();
        ctx.translate(camX, camY);
        ctx.rotate(this.angle); // Apply rotation

        // Draw dynamite body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.collisionBounds.width / 2, -this.collisionBounds.height / 2, this.collisionBounds.width, this.collisionBounds.height);

        // Draw fuse (simple line)
        const fuseLength = 8;
        const fuseX = this.collisionBounds.width / 2;
        const fuseY = 0;
        ctx.strokeStyle = '#555555'; // Dark grey fuse
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fuseX, fuseY);
        ctx.lineTo(fuseX + fuseLength, fuseY);
        ctx.stroke();

        // Draw blinking fuse tip
        if (this.fuseVisible) {
            ctx.fillStyle = '#FFFF00'; // Yellow/Orange spark
            ctx.beginPath();
            ctx.arc(fuseX + fuseLength, fuseY, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Optional: Draw collision bounds for debugging
        // super.draw(ctx, camera); // This would call Projectile's draw, which calls Entity's draw
        // Entity.prototype.draw.call(this, ctx, camera); // Call Entity draw directly if needed for bounds
    }
}