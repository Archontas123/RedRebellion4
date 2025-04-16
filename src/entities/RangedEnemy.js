// src/entities/RangedEnemy.js
import { Enemy } from './Enemy.js';
import { Entity } from './Entity.js'; // Import the base Entity class

export class RangedEnemy extends Enemy {
    constructor(x, y, options = {}) {
        // Default ranged enemy options, extending base enemy options
        const rangedOptions = {
            maxHealth: options.maxHealth || 75, // Ranged enemies might be less tanky
            moveSpeed: options.moveSpeed || 60, // Slightly slower maybe
            detectionRange: options.detectionRange || 600, // Increased detection range
            attackRange: options.attackRange || 700, // Increased attack range (now 700px)
            attackCooldown: options.attackCooldown || 2.0, // Time between shots (seconds)
            attackPower: options.attackPower || 10, // Damage per shot
            projectileSpeed: options.projectileSpeed || 300, // Speed of the projectile
            retreatDistance: options.retreatDistance || 300, // Increased retreat distance
            ...options, // Allow overriding defaults
            type: 'ranged_enemy', // Specific type identifier
        };

        super(x, y, rangedOptions);

        // Ranged specific properties
        this.attackRange = rangedOptions.attackRange;
        this.attackCooldown = rangedOptions.attackCooldown;
        this.attackPower = rangedOptions.attackPower;
        this.projectileSpeed = rangedOptions.projectileSpeed;
        this.retreatDistance = rangedOptions.retreatDistance; // Minimum distance to stay away normally
        this.smokeBombRange = rangedOptions.smokeBombRange || 150; // Closer distance to trigger smoke bomb
        this.smokeBombCooldown = rangedOptions.smokeBombCooldown || 10.0; // Cooldown in seconds
        this.smokeBombTeleportDist = rangedOptions.smokeBombTeleportDist || 250; // How far to teleport

        this.attackTimer = 0; // Timer for attack cooldown
        this.isAttacking = false; // Flag if currently performing attack animation/action
        this.attackDuration = 0.3; // How long the attack animation/pause takes
        this.attackActionTimer = 0; // Timer for the attack action itself
        this.smokeBombTimer = 0; // Timer for smoke bomb cooldown
    }

    update(deltaTime, worldContext) {
        if (this.state === 'dead') return;

        // Scene reference is now set in the base Enemy constructor
        // No need to assign it here anymore

        // Update attack cooldown timer
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }
        // Update smoke bomb cooldown timer
        if (this.smokeBombTimer > 0) {
            this.smokeBombTimer -= deltaTime;
        }

        // Update attack action timer
        if (this.isAttacking) {
            this.attackActionTimer += deltaTime;
            if (this.attackActionTimer >= this.attackDuration) {
                this.isAttacking = false; // Finish the attack action
                // Don't immediately set state, let makeDecision handle it next frame
            }
            // Prevent movement during the attack action itself
            this.velocityX = 0;
            this.velocityY = 0;
            // Update parent for physics, stun checks, hit effects etc.
            // Need to call the *Entity* update directly to bypass Enemy's AI logic during attack animation
             Entity.prototype.update.call(this, deltaTime); 
            return; // Skip AI logic below while attacking
        }

        // Base enemy update handles stun checks, target acquisition, hit effects, decision timer
        // Base enemy update handles stun checks, target acquisition, hit effects, decision timer
        // It might call makeDecision -> startAttack -> fireProjectile, so scene must be set *before* this
        super.update(deltaTime, worldContext);

        // Ranged enemy specific AI logic (only if not stunned and not in attack action)
        // AI logic is handled within makeDecision and the state methods (pursuePlayer, wander, etc.)
        // The decision timer check and call to makeDecision happens in the parent Enemy.update()
    }

    makeDecision() {
        // Don't make decisions if stunned, dead, or currently attacking
        if (this.isStunned || this.state === 'dead' || this.isAttacking) return;

        if (this.targetPlayer && this.targetPlayer.state !== 'dead') {
            const dx = this.targetPlayer.x - this.x;
            const dy = this.targetPlayer.y - this.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

            // 1. Smoke Bomb Check: If player is too close and ability ready
            if (distanceToPlayer < this.smokeBombRange && this.smokeBombTimer <= 0) {
                this.useSmokeBomb(dx / distanceToPlayer, dy / distanceToPlayer); // Pass direction *away* from player
                return; // Prioritize smoke bomb
            }

            // 2. Attack Check: If in range (but not too close for smoke bomb) and cooldown ready
            if (distanceToPlayer <= this.attackRange && distanceToPlayer >= this.retreatDistance && this.attackTimer <= 0) {
                this.startAttack();
                return; // Prioritize attacking
            }

            // 3. Pursue/Reposition Check: If player is detected (and not using smoke bomb or attacking)
            if (distanceToPlayer <= this.detectionRange) {
                 // Set state to pursuing; pursuePlayer handles moving towards/away/stopping
                 this.setState('pursuing');
                 return;
            }
        }

        // 3. Default to Wander/Idle if player not detected or other conditions not met
        // Let the base Enemy class handle the random wander/idle decision
        if (this.state !== 'wandering' && this.state !== 'idle') {
             if (Math.random() < 0.7) { // 70% chance to wander
                 this.startWandering();
             } else {
                 this.startIdle();
             }
        }
    }

    startAttack() {
        // Double check conditions just in case
        if (this.attackTimer <= 0 && this.targetPlayer && this.targetPlayer.state !== 'dead' && !this.isAttacking && !this.isStunned) {
            this.setState('attacking');
            this.isAttacking = true;
            this.attackActionTimer = 0; // Reset attack action timer
            this.attackTimer = this.attackCooldown; // Start cooldown

            // Stop movement briefly for the attack animation/action
            this.velocityX = 0;
            this.velocityY = 0;

            // Calculate direction towards the player *at the moment of firing*
            const dx = this.targetPlayer.x - this.x;
            const dy = this.targetPlayer.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            let fireDirection = { x: 0, y: 1 }; // Default direction if distance is 0
            if (distance > 0) {
                fireDirection = { x: dx / distance, y: dy / distance };
            }

            // Trigger projectile firing (needs implementation in GameScreen or similar)
            this.fireProjectile(fireDirection);

            // console.log(`RangedEnemy ${this.id} attacking player.`); // Optional debug log
        }
    }

    // This method signals that a projectile should be created.
    // The actual creation logic will likely live in GameScreen or a ProjectileManager.
    fireProjectile(direction) {
        // DEBUG: Log the scene object right before attempting to use it
        console.log(`DEBUG: RangedEnemy ${this.id} attempting fire. this.scene:`, this.scene);

        // Check explicitly if this.scene exists and has the createProjectile method as a function
        if (this.scene && typeof this.scene.createProjectile === 'function') {
             this.scene.createProjectile(
                this.x, // Start position x
                this.y, // Start position y
                direction, // Normalized direction vector {x, y}
                this.projectileSpeed, // Speed
                this.attackPower, // Damage
                this.id, // ID of the enemy firing (to prevent self-collision)
                'enemy_projectile' // Type identifier for the projectile
            );
        } else {
            // More detailed warning if the check fails
            console.warn(`RangedEnemy ${this.id}: Cannot fire projectile. Condition failed: (this.scene && typeof this.scene.createProjectile === 'function')`);
            console.warn(`DEBUG: Value of this.scene:`, this.scene);
            if(this.scene) {
                 console.warn(`DEBUG: Value of typeof this.scene.createProjectile:`, typeof this.scene.createProjectile);
            }
        }
    }

    pursuePlayer(deltaTime) {
        // This state is now responsible for maintaining position relative to the player
        if (!this.targetPlayer || this.targetPlayer.state === 'dead') {
            this.startWandering(); // Target lost or dead
            return;
        }

        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If player moved out of detection range, stop pursuing
        if (distance > this.detectionRange * 1.1) { // Add buffer
            this.startWandering();
            return;
        }

        let targetX = 0;
        let targetY = 0;
        let speed = this.moveSpeed;

        // Behavior: Try to maintain attack range, retreat if too close
        if (distance < this.retreatDistance) {
            // Too close, move away from the player
            targetX = -dx / distance;
            targetY = -dy / distance;
            speed = this.moveSpeed * 1.2; // Retreat slightly faster
            // console.log(`RangedEnemy ${this.id} retreating.`); // Optional debug log
        } else if (distance > this.attackRange) {
            // Too far, move towards the player
            targetX = dx / distance;
            targetY = dy / distance;
             // console.log(`RangedEnemy ${this.id} advancing.`); // Optional debug log
        } else {
            // Within desired range [retreatDistance, attackRange], stop moving.
            // Attack decision is handled separately in makeDecision.
            targetX = 0;
            targetY = 0;
             // console.log(`RangedEnemy ${this.id} holding position.`); // Optional debug log
        }

        // Apply velocity
        this.velocityX = targetX * speed;
        this.velocityY = targetY * speed;
    }

    // Override takeDamage to potentially interrupt attacks or add specific reactions
    takeDamage(amount) {
        super.takeDamage(amount);
        // Optional: Interrupt attack if hit?
        // if (this.isAttacking) {
        //     this.isAttacking = false; // Stop the attack animation/action
        //     this.attackActionTimer = 0;
        //     // Maybe add a brief stun or hesitation?
        //     this.setState('pursuing'); // Re-evaluate state
        // }
    }

     // Override onDeath for specific cleanup if needed
     onDeath() {
        super.onDeath();
        // console.log(`RangedEnemy ${this.id} died!`); // Optional debug log
        // Cleanup specific to ranged enemies if any
    }

    useSmokeBomb(dirX, dirY) {
        // dirX, dirY should be the normalized direction *away* from the player
        console.log(`RangedEnemy ${this.id} used Smoke Bomb!`);

        // Trigger the visual effect in the scene
        if (this.scene && typeof this.scene.createSmokeBombEffect === 'function') {
            this.scene.createSmokeBombEffect(this.x, this.y);
        } else {
            console.warn(`RangedEnemy ${this.id}: Scene or createSmokeBombEffect method not found!`);
        }

        // Calculate target teleport position
        const targetX = this.x + dirX * this.smokeBombTeleportDist;
        const targetY = this.y + dirY * this.smokeBombTeleportDist;

        // TODO: Add collision check here with worldContext.worldManager.isSolid(targetX, targetY)
        //       or find a nearby valid spot if the target is invalid.
        //       For now, just teleport directly.

        this.x = targetX;
        this.y = targetY;

        // Trigger cooldown
        this.smokeBombTimer = this.smokeBombCooldown;

        // Briefly stop movement or change state after teleporting?
        this.velocityX = 0;
        this.velocityY = 0;
        this.setState('idle'); // Go idle briefly after teleporting
        this.idleTimer = 0.5; // Idle for half a second
    }
}