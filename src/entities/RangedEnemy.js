// src/entities/RangedEnemy.js
import { Enemy } from './Enemy.js';

export class RangedEnemy extends Enemy {
    constructor(x, y, options = {}) {
        // Default ranged enemy options, extending base enemy options
        const rangedOptions = {
            maxHealth: options.maxHealth || 35, // Ranged enemies might be less tanky
            moveSpeed: options.moveSpeed || 60, // Slightly slower maybe
            detectionRange: options.detectionRange || 400, // Can see further
            attackRange: options.attackRange || 250, // Preferred distance to shoot from
            attackCooldown: options.attackCooldown || 2.0, // Time between shots (seconds)
            attackPower: options.attackPower || 10, // Damage per shot
            projectileSpeed: options.projectileSpeed || 300, // Speed of the projectile
            retreatDistance: options.retreatDistance || 150, // Minimum distance to keep from player
            ...options, // Allow overriding defaults
            type: 'ranged_enemy', // Specific type identifier
        };

        super(x, y, rangedOptions);

        // Ranged specific properties
        this.attackRange = rangedOptions.attackRange;
        this.attackCooldown = rangedOptions.attackCooldown;
        this.attackPower = rangedOptions.attackPower;
        this.projectileSpeed = rangedOptions.projectileSpeed;
        this.retreatDistance = rangedOptions.retreatDistance; // Minimum distance

        this.attackTimer = 0; // Timer for attack cooldown
        this.isAttacking = false; // Flag if currently performing attack animation/action
        this.attackDuration = 0.3; // How long the attack animation/pause takes
        this.attackActionTimer = 0; // Timer for the attack action itself
    }

    update(deltaTime, worldContext) {
        if (this.state === 'dead') return;
        
        // Store scene reference if available (needed for firing projectiles)
        if (worldContext && worldContext.scene && !this.scene) {
            this.scene = worldContext.scene;
        }

        // Update attack cooldown timer
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
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

            // 1. Attack Check: If in range and cooldown ready
            if (distanceToPlayer <= this.attackRange && distanceToPlayer >= this.retreatDistance && this.attackTimer <= 0) {
                this.startAttack();
                return; // Prioritize attacking
            }

            // 2. Pursue/Reposition Check: If player is detected
            if (distanceToPlayer <= this.detectionRange) {
                 // Always set state to pursuing if player is detected and not attacking/stunned/dead
                 // The pursuePlayer method will handle moving towards/away/stopping
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
        // We need access to the scene or a projectile manager to actually create it
        if (this.scene && this.scene.createProjectile) {
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
            console.warn(`RangedEnemy ${this.id}: Cannot fire projectile - scene.createProjectile not found.`);
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
}