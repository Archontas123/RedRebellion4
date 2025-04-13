import { Entity } from './Entity.js';

export class Enemy extends Entity {
    constructor(x, y, options = {}) {
        // Default enemy options
        const enemyOptions = {
            type: 'enemy',
            maxHealth: options.maxHealth || 500,
            friction: options.friction || 0.9, // Moderate friction
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 40, height: 40 }, // Slightly smaller than player
            ...options,
        };

        super(x, y, enemyOptions);

        // Enemy specific properties
        this.targetPlayer = null; // Reference to player entity
        this.detectionRange = options.detectionRange || 300; // How far it can see the player
        this.moveSpeed = options.moveSpeed || 80; // Slower than player
        this.aggressiveness = options.aggressiveness || 0.7; // How likely to pursue player (0-1)
        this.wanderSpeed = this.moveSpeed * 0.5; // Speed while wandering

        // AI behavior timing
        this.decisionTimer = 0;
        this.decisionInterval = 0.5; // Make decisions every 0.5 seconds
        this.wanderDirection = { x: 0, y: 0 };
        this.wanderDuration = 0;
        this.wanderTimer = 0;
        this.idleTimer = 0;
        this.idleDuration = 0;

        // Visual effects
        this.isFlashing = false; // Track if currently in hit flash state
        this.hitEffectTimer = 0;
        this.hitEffectDuration = 0.15; // Duration for hit visual effects

        // Stunned visual effect enhancements
        this.stunEffectIntensity = 1.0; // Full intensity effect when first stunned
        this.stunEffectDecayRate = 0.8; // How quickly effect fades
    }

    update(deltaTime, worldContext) {
        if (this.state === 'dead') return;

        // Store reference to player if provided
        if (worldContext && worldContext.player && !this.targetPlayer) {
            this.targetPlayer = worldContext.player;
        }

        // Update hit effect timer
        if (this.hitEffectTimer > 0) {
            this.hitEffectTimer -= deltaTime;
            if (this.hitEffectTimer <= 0) {
                this.hitEffectTimer = 0;
            }
        }

        // If stunned, just update stun-related effects and parent state
        if (this.isStunned) {
            // Decay stun effect intensity for visual fade-out
            if (this.stunEffectIntensity > 0) {
                this.stunEffectIntensity *= Math.pow(this.stunEffectDecayRate, deltaTime * 10);
            }

            super.update(deltaTime);
            return;
        }

        // Decision making - only if not stunned
        this.decisionTimer += deltaTime;
        if (this.decisionTimer >= this.decisionInterval) {
            this.decisionTimer = 0;
            this.makeDecision();
        }

        // Execute current behavior
        if (this.state === 'pursuing' && this.targetPlayer) {
            this.pursuePlayer(deltaTime);
        } else if (this.state === 'wandering') {
            this.wander(deltaTime);
        } else if (this.state === 'idle') {
            this.idle(deltaTime);
        }

        // Call parent update for physics, animation, etc.
        super.update(deltaTime);
    }

    makeDecision() {
        // Don't make decisions if stunned or dead
        if (this.isStunned || this.state === 'dead') return;

        if (this.targetPlayer) {
            // Calculate distance to player
            const dx = this.targetPlayer.x - this.x;
            const dy = this.targetPlayer.y - this.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

            // If player is in range, decide whether to pursue based on aggressiveness
            if (distanceToPlayer <= this.detectionRange) {
                if (Math.random() < this.aggressiveness) {
                    this.setState('pursuing');
                    return;
                }
            }
        }

        // If we didn't decide to pursue, randomly wander or idle
        if (Math.random() < 0.7) { // 70% chance to wander
            this.startWandering();
        } else {
            this.startIdle();
        }
    }

    startWandering() {
        this.setState('wandering');

        // Choose a random direction
        const angle = Math.random() * Math.PI * 2;
        this.wanderDirection = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };

        // Set a random duration for this wandering segment
        this.wanderDuration = 1 + Math.random() * 2; // 1-3 seconds
        this.wanderTimer = 0;
    }

    wander(deltaTime) {
        // Move in the current wander direction
        this.velocityX = this.wanderDirection.x * this.wanderSpeed;
        this.velocityY = this.wanderDirection.y * this.wanderSpeed;

        // Update wander timer
        this.wanderTimer += deltaTime;
        if (this.wanderTimer >= this.wanderDuration) {
            // Random chance to continue wandering or go idle
            if (Math.random() < 0.3) { // 30% chance to go idle
                this.startIdle();
            } else {
                this.startWandering(); // Choose a new direction and duration
            }
        }
    }

    startIdle() {
        this.setState('idle');
        this.velocityX = 0;
        this.velocityY = 0;

        // Set a random duration for idle state
        this.idleDuration = 0.5 + Math.random() * 1.5; // 0.5-2 seconds
        this.idleTimer = 0;
    }

    idle(deltaTime) {
        // Do nothing while idle except count time
        this.idleTimer += deltaTime;
        if (this.idleTimer >= this.idleDuration) {
            // After idle duration, make a new decision
            this.makeDecision();
        }
    }

    pursuePlayer(deltaTime) {
        if (!this.targetPlayer) return;

        // Calculate direction to player
        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If player moved out of range, stop pursuing
        if (distance > this.detectionRange * 1.2) { // Add 20% buffer to avoid oscillation
            this.startWandering();
            return;
        }

        // Normalize direction and apply velocity
        if (distance > 0) {
            const normalizedX = dx / distance;
            const normalizedY = dy / distance;

            this.velocityX = normalizedX * this.moveSpeed;
            this.velocityY = normalizedY * this.moveSpeed;
        }
    }

    // Override takeDamage to add hit effects
    takeDamage(amount) {
        super.takeDamage(amount);

        // Start hit effect
        this.hitEffectTimer = this.hitEffectDuration;

        // Reset stun effect intensity when taking damage
        this.stunEffectIntensity = 1.0;
    }

    // Handle collision with player attacks
    handleCollision(otherEntity) {
        super.handleCollision(otherEntity);

        // If hit by player
        if (otherEntity.type === 'player') {
            console.log(`Enemy ${this.id} collided with player ${otherEntity.id}`);

            // Player collision logic handled by Player class's handleCollision method
            // We don't need to do damage to player here since player.handleCollision
            // will handle that if appropriate
        }
    }

    // Override onStun to add visual enhancements
    stun(duration) {
        // Call parent stun method
        super.stun(duration);

        // Reset stun effect intensity
        this.stunEffectIntensity = 1.0;

        // Additional stun-specific behaviors
        this.setState('stunned');
    }

    onDeath() {
        super.onDeath();
        console.log(`Enemy ${this.id} died!`);

        // Stop all movement
        this.velocityX = 0;
        this.velocityY = 0;

        // Could add particle effects, drop items, etc.
    }
}