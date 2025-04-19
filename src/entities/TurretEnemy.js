// src/entities/TurretEnemy.js
import { Enemy } from './Enemy.js';
import { Entity } from './Entity.js'; // Import Entity for direct prototype calls if needed

export class TurretEnemy extends Enemy {
    constructor(x, y, options = {}) {
        const turretOptions = {
            maxHealth: Infinity, // Invincible
            moveSpeed: 0,        // Stationary
            wanderSpeed: 0,      // Stationary
            friction: 1,         // No sliding
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 50, height: 50 }, // Adjust size as needed
            attackRange: options.attackRange || 600,
            attackCooldown: options.attackCooldown || 2.5, // Slower fire rate than RangedEnemy?
            attackPower: options.attackPower || 8,
            projectileSpeed: options.projectileSpeed || 250,
            damageAmount: 0, // No contact damage
            spritePath: 'assets/turret.png', // Added sprite path
            ...options,
            type: 'turret_enemy', // Specific type identifier
            // Remove properties not needed for a stationary turret
            aggressiveness: 1, // Always aggressive if player in range
            separationRadius: 0,
            separationForce: 0,
            avoidanceRadius: 0,
            avoidanceForce: 0,
            flankDirection: 0,
            flankOffsetDistance: 0,
        };

        super(x, y, turretOptions);

        // Turret specific properties
        this.attackRange = turretOptions.attackRange;
        this.attackCooldown = turretOptions.attackCooldown;
        this.attackPower = turretOptions.attackPower;
        this.projectileSpeed = turretOptions.projectileSpeed;

        this.attackTimer = Math.random() * this.attackCooldown; // Start with random cooldown
        this.isShooting = false; // Flag if currently shooting (for potential animation)
        this.shootDuration = 0.2; // How long the shooting visual takes
        this.shootTimer = 0;

        // Turrets don't wander or pursue in the traditional sense
        this.state = 'idle'; // Start as idle, will switch to attacking if player is near

        // --- NEW: Destruction Indicator ---
        this.indicatorOffsetY = -40; // Position above the turret
        this.indicatorWidth = 50;
        this.indicatorHeight = 8;
        this.indicatorBgGraphics = null;
        this.indicatorProgressGraphics = null;
        this.isIndicatorVisible = false;
        // Create graphics objects if scene is available (might not be during initial construction)
        if (options.scene) {
            this.scene = options.scene; // Ensure scene is set
            this.createIndicatorGraphics();
        }
    }

    update(deltaTime, worldContext) {
        if (this.state === 'dead') return; // Should not happen due to invincibility, but safety first

        // Store player reference if not already set
        if (worldContext && worldContext.player && !this.targetPlayer) {
            this.targetPlayer = worldContext.player;
        }
        // Store scene reference if not already set
        if (worldContext && worldContext.scene && !this.scene) {
            this.scene = worldContext.scene;
        }


        // Update attack cooldown timer
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }

        // Update shooting visual timer
        if (this.isShooting) {
            this.shootTimer += deltaTime;
            if (this.shootTimer >= this.shootDuration) {
                this.isShooting = false;
                this.shootTimer = 0;
            }
        }

        // --- Decision Making (Simplified for Turret) ---
        this.makeDecision(); // Check if should attack

        // --- Execute Attack (if decided) ---
        if (this.state === 'attacking' && !this.isShooting && this.attackTimer <= 0 && this.targetPlayer && this.targetPlayer.state !== 'dead') {
            this.performAttack();
        }

        // Call Entity's update for basic state management (like stun if ever implemented)
        // Bypasses Enemy's movement/AI logic.
        Entity.prototype.update.call(this, deltaTime);

        // Turrets don't move, so ensure velocity is always zero
        this.velocityX = 0;
        this.velocityY = 0;

        // --- NEW: Update indicator position ---
        this.updateIndicatorPosition();
    }

    makeDecision() {
        // Turrets only decide whether to be 'attacking' (ready to shoot) or 'idle'
        if (this.isStunned || !this.targetPlayer || this.targetPlayer.state === 'dead') {
            this.setState('idle');
            return;
        }

        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

        if (distanceToPlayer <= this.attackRange) {
            this.setState('attacking'); // Player is in range, ready to attack when cooldown allows
        } else {
            this.setState('idle'); // Player out of range
        }
    }

    performAttack() {
        if (!this.targetPlayer || this.targetPlayer.state === 'dead' || !this.scene) return;

        this.isShooting = true;
        this.shootTimer = 0;
        this.attackTimer = this.attackCooldown; // Reset cooldown

        // Calculate direction towards the player
        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let fireDirection = { x: 0, y: 1 }; // Default direction
        if (distance > 0) {
            fireDirection = { x: dx / distance, y: dy / distance };
        }

        // Fire projectile via the scene
        this.fireProjectile(fireDirection);
    }

    fireProjectile(direction) {
        if (this.scene && typeof this.scene.createProjectile === 'function') {
             this.scene.createProjectile(
                this.x, this.y,
                direction,
                this.projectileSpeed,
                this.attackPower,
                this.id, // Owner ID
                'enemy_projectile' // Type
            );
        } else {
            console.warn(`TurretEnemy ${this.id}: Cannot fire projectile. Scene or createProjectile method not found.`);
            console.warn(`DEBUG: Value of this.scene:`, this.scene);
             if(this.scene) {
                  console.warn(`DEBUG: Value of typeof this.scene.createProjectile:`, typeof this.scene.createProjectile);
             }
        }
    }

    // Override takeDamage to make the turret invincible
    takeDamage(amount) {
        // Do nothing. Turret is invincible.
        // console.log(`Turret ${this.id} ignored ${amount} damage.`); // Optional debug log
    }

    // Override stun - maybe turrets can't be stunned? Or maybe they can?
    // For now, let's allow stunning via the base Entity logic, but it won't move anyway.
    // stun(duration) {
    //     super.stun(duration);
    // }

    // Override onDeath - should never be called if invincible
    onDeath() {
        // console.warn(`TurretEnemy ${this.id} died.`); // Changed from warn as it's now expected
        super.onDeath(); // Sets state to 'dead'
        this.hideDestructionIndicator(); // Clean up indicator graphics
        // TODO: Add specific death visual effect (explosion, etc.) before destroying
        // The actual removal should be handled by the scene/manager checking the 'dead' state.
    }

    // Remove methods related to movement and complex AI inherited from Enemy
    pursuePlayer(deltaTime) { /* No-op */ }
    wander(deltaTime) { /* No-op */ }
    startWandering() { /* No-op */ }
    idle(deltaTime) { /* No-op - handled in update */ }
    startIdle() { /* No-op - handled in update/makeDecision */ }

    // Override handleCollision to prevent contact damage
    handleCollision(otherEntity) {
        // Only call Entity's handleCollision for basic physics, skip Enemy's contact damage logic
         Entity.prototype.handleCollision.call(this, otherEntity);
    }

    // Override setState to prevent entering movement states
    setState(newState) {
        if (newState === 'pursuing' || newState === 'wandering') {
            newState = 'idle'; // Force back to idle if trying to move
        }
        super.setState(newState);
    }

    // --- NEW: Method called by Player to destroy the turret ---
    destroyTurret() {
        console.log(`Turret ${this.id} is being destroyed by player interaction.`);
        // Call the standard onDeath method to handle state change and potential cleanup/effects
        this.onDeath(); // This will now also hide the indicator
        // Visual effect TODO moved to onDeath
    }

    // --- NEW: Indicator Methods ---
    createIndicatorGraphics() {
        if (!this.scene || this.indicatorBgGraphics) return; // Don't recreate

        // Background bar
        this.indicatorBgGraphics = this.scene.add.graphics();
        this.indicatorBgGraphics.fillStyle(0x000000, 0.5); // Dark semi-transparent background
        this.indicatorBgGraphics.fillRect(0, 0, this.indicatorWidth, this.indicatorHeight);
        this.indicatorBgGraphics.setVisible(false); // Start hidden
        this.indicatorBgGraphics.setDepth(10); // Ensure it's above the turret sprite

        // Progress bar
        this.indicatorProgressGraphics = this.scene.add.graphics();
        this.indicatorProgressGraphics.fillStyle(0xffcc00, 1); // Yellow progress
        this.indicatorProgressGraphics.fillRect(0, 0, 0, this.indicatorHeight); // Start with 0 width
        this.indicatorProgressGraphics.setVisible(false); // Start hidden
        this.indicatorProgressGraphics.setDepth(11); // Above the background

        this.updateIndicatorPosition(); // Set initial position
    }

    updateIndicatorPosition() {
        if (this.indicatorBgGraphics) {
            const indicatorX = this.x - this.indicatorWidth / 2;
            const indicatorY = this.y + this.indicatorOffsetY;
            this.indicatorBgGraphics.setPosition(indicatorX, indicatorY);
            this.indicatorProgressGraphics.setPosition(indicatorX, indicatorY);
        }
    }

    showDestructionIndicator() {
        // Ensure graphics are created if scene wasn't available initially
        if (!this.indicatorBgGraphics && this.scene) {
            this.createIndicatorGraphics();
        }

        if (this.indicatorBgGraphics && !this.isIndicatorVisible) {
            this.indicatorBgGraphics.setVisible(true);
            this.indicatorProgressGraphics.setVisible(true);
            this.updateDestructionIndicator(0); // Reset progress visually
            this.isIndicatorVisible = true;
        }
    }

    updateDestructionIndicator(progress) { // progress is 0.0 to 1.0
        if (this.indicatorProgressGraphics && this.isIndicatorVisible) {
            const currentWidth = this.indicatorWidth * progress;
            this.indicatorProgressGraphics.clear();
            this.indicatorProgressGraphics.fillStyle(0xffcc00, 1);
            this.indicatorProgressGraphics.fillRect(0, 0, currentWidth, this.indicatorHeight);
        }
    }

    hideDestructionIndicator() {
        if (this.isIndicatorVisible) {
            if (this.indicatorBgGraphics) {
                this.indicatorBgGraphics.destroy();
                this.indicatorBgGraphics = null;
            }
            if (this.indicatorProgressGraphics) {
                this.indicatorProgressGraphics.destroy();
                this.indicatorProgressGraphics = null;
            }
            this.isIndicatorVisible = false;
        }
    }
}
