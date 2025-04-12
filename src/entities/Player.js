import { PhysicalObject } from './PhysicalObject.js';
import { InputHandler } from './InputHandler.js';
import { Entity } from './Entity.js'; // Need this to call the base update

export class Player extends PhysicalObject {
    constructor(x, y, inputHandler, options = {}) {
        // Player specific defaults
        options.type = 'player';
        options.friction = options.friction !== undefined ? options.friction : 0.98; // Player needs friction (Reduced significantly)
        options.gravity = options.gravity !== undefined ? options.gravity : 0; // Keep gravity off for now (top-down?)
        options.maxVelocityX = options.maxVelocityX !== undefined ? options.maxVelocityX : 200;
        options.maxVelocityY = options.maxVelocityY !== undefined ? options.maxVelocityY : 200;
        options.maxHealth = options.maxHealth || 100; // Give player health
        options.collisionBounds = options.collisionBounds || { x: 0, y: 0, width: 16, height: 16 }; // Example size

        // Call PhysicalObject constructor, which calls Entity constructor
        super(x, y, options);

        // Re-enable physics properties potentially deleted by PhysicalObject
        this.health = options.health || this.maxHealth;
        this.state = 'idle'; // Start idle

        // Movement properties
        this.moveSpeed = options.moveSpeed || 3000; // Acceleration force
        this.sprintMultiplier = options.sprintMultiplier || 1.5; // Speed multiplier for sprinting
        this.isSprinting = false;
        this.originalMaxVelocityX = options.maxVelocityX !== undefined ? options.maxVelocityX : 200; // Store original max speed
        this.originalMaxVelocityY = options.maxVelocityY !== undefined ? options.maxVelocityY : 200; // Store original max speed

        // Dash properties
        this.dashSpeed = options.dashSpeed || 1200; // Target: ~300px (6 tiles)
        this.dashDuration = options.dashDuration || 0.25; // Longer duration
        this.dashCooldown = options.dashCooldown || 0.5; // seconds
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;

        // Attack properties
        this.attackLungeSpeed = options.attackLungeSpeed || 750; // Target: ~150px (3 tiles)
        this.attackDuration = options.attackDuration || 0.2;
        this.attackCooldown = options.attackCooldown || 0.4;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackCooldownTimer = 0;
        this.attackDirection = { x: 0, y: 0 }; // Direction of the last attack

        // Input
        this.inputHandler = inputHandler; // Use the shared InputHandler
        this.lastInputDirectionX = 1; // Default facing direction
        this.lastInputDirectionY = 0;
    }

    update(deltaTime, world) { // Pass world/scene context if needed for interactions
        if (this.state === 'dead') {
            Entity.prototype.updateAnimation.call(this, deltaTime); // Still update animation if dead
            return;
        }

        // Update timers
        this.dashTimer = Math.max(0, this.dashTimer - deltaTime);
        this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - deltaTime);
        this.attackTimer = Math.max(0, this.attackTimer - deltaTime);
        this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - deltaTime);

        // Reset state flags
        if (this.isDashing && this.dashTimer <= 0) {
            this.isDashing = false;
            // Reset velocity after dash? Optional.
            // this.velocityX = 0;
            // this.velocityY = 0;
        }
        if (this.isAttacking && this.attackTimer <= 0) {
            this.isAttacking = false;
        }

        // Reset acceleration before processing input
        this.accelerationX = 0;
        this.accelerationY = 0;

        // Handle Input only if not dashing or attacking (interruptible?)
        if (!this.isDashing && !this.isAttacking) {
            this.handleMovementInput(deltaTime);
            this.handleActionInput(deltaTime, world);
        } else if (this.isAttacking) {
            // Continue lunge momentum (or apply friction)
            // For simplicity, let friction handle slowdown after initial impulse
            // Or explicitly manage velocity during attack:
            // this.velocityX = this.attackDirection.x * this.attackLungeSpeed * (this.attackTimer / this.attackDuration);
            // this.velocityY = this.attackDirection.y * this.attackLungeSpeed * (this.attackTimer / this.attackDuration);
        }

        // Adjust max velocity if sprinting
        if (this.isSprinting) {
            this.maxVelocityX = this.originalMaxVelocityX * this.sprintMultiplier;
            this.maxVelocityY = this.originalMaxVelocityY * this.sprintMultiplier;
        } else {
            this.maxVelocityX = this.originalMaxVelocityX;
            this.maxVelocityY = this.originalMaxVelocityY;
        }

        // Call the original Entity update method to apply physics
        // We bypass PhysicalObject's empty update
        Entity.prototype.update.call(this, deltaTime);

        // Update state based on actions/movement (override Entity's basic state logic)
        if (this.isDashing) {
            this.setState('dashing');
        } else if (this.isAttacking) {
            this.setState('attacking');
        } else if (this.isSprinting && (Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1)) {
             this.setState('sprinting');
        } else if (Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1) {
            this.setState('moving');
        } else {
            this.setState('idle');
        }
    }

    handleMovementInput(deltaTime) {
        let moveX = 0;
        let moveY = 0;
        this.isSprinting = this.inputHandler.isDown('ShiftLeft') || this.inputHandler.isDown('ShiftRight');
        const currentMoveSpeed = this.isSprinting ? this.moveSpeed * this.sprintMultiplier : this.moveSpeed;

        if (this.inputHandler.isDown('KeyW')) {
            moveY -= 1;
        }
        if (this.inputHandler.isDown('KeyS')) {
            moveY += 1;
        }
        if (this.inputHandler.isDown('KeyA')) {
            moveX -= 1;
        }
        if (this.inputHandler.isDown('KeyD')) {
            moveX += 1;
        }

        // Normalize diagonal movement
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        if (len > 0) {
            moveX /= len;
            moveY /= len;
        }

        // Store the last non-zero input direction
        if (len > 0) {
            this.lastInputDirectionX = moveX;
            this.lastInputDirectionY = moveY;
        }

        this.accelerationX = moveX * currentMoveSpeed;
        this.accelerationY = moveY * currentMoveSpeed;
    }

    handleActionInput(deltaTime, world) {
        // Dash
        if (this.inputHandler.wasPressed('Space') && this.dashCooldownTimer <= 0) {
            this.startDash();
        }

        // Attack
        if (this.inputHandler.wasPressed('KeyQ') && this.attackCooldownTimer <= 0) {
            this.startLungeAttack(world);
        }
    }

    startDash() {
        if (this.dashCooldownTimer > 0 || this.isDashing) return;

        this.isDashing = true;
        this.dashTimer = this.dashDuration;
        this.dashCooldownTimer = this.dashCooldown; // Start cooldown

        // Determine dash direction based on the last movement input
        let dashDirX = this.lastInputDirectionX;
        let dashDirY = this.lastInputDirectionY;

        // Ensure there's a direction (shouldn't happen with default, but safety check)
        let len = Math.sqrt(dashDirX * dashDirX + dashDirY * dashDirY);
        if (len < 0.1) { // Use a small threshold instead of strict 0
            dashDirX = 1; // Default right if somehow direction is zero
            dashDirY = 0;
            len = 1;
        } else {
            // Normalize if needed (lastInputDirection should already be normalized)
            dashDirX /= len;
            dashDirY /= len;
        }

        // Set velocity directly for a consistent dash impulse
        this.velocityX = dashDirX * this.dashSpeed;
        this.velocityY = dashDirY * this.dashSpeed;

        // Make player temporarily invulnerable or pass through enemies? (optional)
        console.log("Player dashed!");
    }

    startLungeAttack(world) {
        if (this.attackCooldownTimer > 0 || this.isAttacking) return;

        this.isAttacking = true;
        this.attackTimer = this.attackDuration;
        this.attackCooldownTimer = this.attackCooldown; // Start cooldown

        // Determine attack direction based on the last movement input
        let attackDirX = this.lastInputDirectionX;
        let attackDirY = this.lastInputDirectionY;

        // Ensure there's a direction (shouldn't happen with default, but safety check)
        let len = Math.sqrt(attackDirX * attackDirX + attackDirY * attackDirY);
        if (len < 0.1) { // Use a small threshold instead of strict 0
            attackDirX = 1; // Default right if somehow direction is zero
            attackDirY = 0;
            len = 1;
        } else {
            // Normalize if needed (lastInputDirection should already be normalized)
            attackDirX /= len;
            attackDirY /= len;
        }
        this.attackDirection = { x: attackDirX, y: attackDirY }; // Store for potential hitbox use

        // Set velocity directly for a consistent lunge impulse
        this.velocityX = attackDirX * this.attackLungeSpeed;
        this.velocityY = attackDirY * this.attackLungeSpeed;

        console.log("Player lunged!");

        // --- Attack Hit Detection ---
        // Define hitbox relative to player and attack direction
        const hitboxWidth = 20;
        const hitboxHeight = 20;
        const hitboxOffsetX = this.collisionBounds.width / 2 + (attackDirX * hitboxWidth / 2); // Offset in attack direction
        const hitboxOffsetY = this.collisionBounds.height / 2 + (attackDirY * hitboxHeight / 2);

        const attackBounds = {
            x: this.x + hitboxOffsetX - hitboxWidth / 2,
            y: this.y + hitboxOffsetY - hitboxHeight / 2,
            width: hitboxWidth,
            height: hitboxHeight
        };

        // Debug draw hitbox (implement in draw method)
        this._debugAttackBounds = attackBounds; // Store for drawing

        // Check for collisions with other entities in the world
        if (world && world.entities) {
            world.entities.forEach(entity => {
                if (entity !== this && entity.takeDamage) { // Check if entity can take damage
                    const entityBounds = entity.getAbsoluteBounds();
                    if (this.checkAABBOverlap(attackBounds, entityBounds)) {
                        console.log(`Player attack hit ${entity.type} ${entity.id}`);
                        entity.takeDamage(10); // Example damage

                        // Apply knockback
                        if (entity.applyForce) {
                            const knockbackStrength = 250;
                            entity.applyForce(attackDirX * knockbackStrength, attackDirY * knockbackStrength);
                        } else {
                             // Basic knockback if no applyForce method
                             entity.velocityX = attackDirX * 150;
                             entity.velocityY = attackDirY * 150;
                        }
                    }
                }
            });
        }
    }

    // Helper for simple AABB overlap check
    checkAABBOverlap(boundsA, boundsB) {
        return boundsA.x < boundsB.x + boundsB.width &&
               boundsA.x + boundsA.width > boundsB.x &&
               boundsA.y < boundsB.y + boundsB.height &&
               boundsA.y + boundsA.height > boundsB.y;
    }

     // Override draw to add debug info if needed
     draw(context) {
        // Call the Entity draw method first
        Entity.prototype.draw.call(this, context);

        // Debug draw attack hitbox
        if (this.isAttacking && this._debugAttackBounds) {
            context.strokeStyle = 'red';
            context.lineWidth = 1;
            context.strokeRect(
                this._debugAttackBounds.x,
                this._debugAttackBounds.y,
                this._debugAttackBounds.width,
                this._debugAttackBounds.height
            );
        }
         // Reset debug bounds after drawing
         if (!this.isAttacking) {
             this._debugAttackBounds = null;
         }
    }

    // Override handleCollision for player-specific interactions
    handleCollision(otherEntity) {
        // Example: Stop movement if hitting a solid object
        if (otherEntity.type === 'physical_object' || otherEntity.type === 'wall') {
             // More complex resolution needed here, this is just a basic stop
             // Ideally, resolve collision based on penetration depth and direction
             // For now, just log it. The physics update in Entity doesn't have resolution yet.
             console.log(`Player collided with solid object ${otherEntity.id}`);
             // A proper physics engine would handle separation here.
             // Simple approach: Move back slightly? Risky.
             // this.x -= this.velocityX * deltaTime; // Needs deltaTime access
             // this.y -= this.velocityY * deltaTime;
             // this.velocityX = 0;
             // this.velocityY = 0;
        } else if (otherEntity.type === 'item') {
            // Handle item pickup
            console.log(`Player collided with item ${otherEntity.id}`);
            otherEntity.collect(this); // Assume item has a collect method
        } else {
            // Default collision behavior from Entity (logging)
            Entity.prototype.handleCollision.call(this, otherEntity);
        }
    }

    // Need applyForce for knockback if player can be hit
    applyForce(forceX, forceY) {
        // Add impulse directly to velocity
        this.velocityX += forceX;
        this.velocityY += forceY;
    }
}