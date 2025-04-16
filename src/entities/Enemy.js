import { Entity } from './Entity.js';

export class Enemy extends Entity {
    constructor(x, y, options = {}) {
        // Default enemy options
        const enemyOptions = {
            type: 'enemy',
            maxHealth: options.maxHealth || 50,
            friction: options.friction || 0.9, // Moderate friction
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 40, height: 40 }, // Slightly smaller than player
            ...options,
        };

        super(x, y, enemyOptions);

        // Enemy specific properties
        this.targetPlayer = null; // Reference to player entity
        this.scene = options.scene || null; // Store scene reference if provided
        this.detectionRange = options.detectionRange || 600; // How far it can *visually* detect the player (kept for potential future use)
        this.agroRange = 80 * 50; // 80 tiles * 50 pixels/tile = 4000 pixels
        this.moveSpeed = options.moveSpeed || 80; // Slower than player
        this.aggressiveness = options.aggressiveness || 0.7; // How likely to pursue player (0-1)
        this.wanderSpeed = this.moveSpeed * 0.5; // Speed while wandering
        this.damageAmount = options.damageAmount || 10; // Damage dealt on contact
        this.damageCooldown = options.damageCooldown || 0.5; // Seconds between contact damage ticks (reduced from 1.0)
        this.damageCooldownTimer = 0; // Timer for contact damage

        // AI behavior timing
        this.decisionTimer = 0;
        this.decisionInterval = 0.5; // Make decisions every 0.5 seconds
        this.wanderDirection = { x: 0, y: 0 };
        this.wanderDuration = 0;
        this.wanderTimer = 0;
        this.idleTimer = 0;
        this.idleDuration = 0;

        // Separation behavior
        this.separationRadius = 50; // How close enemies need to be to push each other
        this.separationForce = 100; // Strength of the separation push

        // Visual effects
        this.isFlashing = false; // Track if currently in hit flash state
        this.hitEffectTimer = 0;
        this.hitEffectDuration = 0.15; // Duration for hit visual effects

        // Stunned visual effect enhancements
        this.stunEffectIntensity = 1.0; // Full intensity effect when first stunned
        this.stunEffectDecayRate = 0.8; // How quickly effect fades

        // Friendly Fire Avoidance
        this.avoidanceRadius = 100; // How close a projectile needs to be to trigger avoidance
        this.avoidancePredictionTime = 0.2; // How far ahead to predict collision (seconds)
        this.avoidanceForce = 150; // Strength of the dodging push
        this.avoidanceCooldown = 0.1; // Short cooldown after dodging
        this.avoidanceTimer = 0;

        // Flanking behavior
        this.flankDirection = (Math.random() < 0.5) ? -1 : 1; // -1 for left, 1 for right relative to player
        this.flankOffsetDistance = 150; // Pixels to offset for flanking
        this.flankUpdateTimer = 0;
        this.flankUpdateInterval = 1.0 + Math.random(); // Re-evaluate flank side every 1-2 seconds

        // Bleeding effect properties
        // Bleed Properties Removed
        // this.isBleeding = false;
        // this.bleedDPS = 0;
        // this.bleedDurationTimer = 0;
        // this.bleedTickTimer = 0;
        // this.bleedTickInterval = 0.25;
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
                this.isFlashing = false; // Clear flashing state when timer expires
            }
        }

        // Update damage cooldown timer
        if (this.damageCooldownTimer > 0) {
            this.damageCooldownTimer -= deltaTime;
            if (this.damageCooldownTimer < 0) {
                this.damageCooldownTimer = 0;
            }
        }

        // Update avoidance cooldown timer
        if (this.avoidanceTimer > 0) {
            this.avoidanceTimer -= deltaTime;
            if (this.avoidanceTimer < 0) {
                this.avoidanceTimer = 0;
            }
        }

        // If stunned, just update stun-related effects and parent state
        if (this.isStunned) {
            // Decay stun effect intensity for visual fade-out
            if (this.stunEffectIntensity > 0) {
                this.stunEffectIntensity *= Math.pow(this.stunEffectDecayRate, deltaTime * 10);
            }

            // // Bleed update call removed from stun logic
            // this.updateBleed(deltaTime);
            super.update(deltaTime);
            return;
        }

        // Decision making & Flank Update - only if not stunned
        this.decisionTimer += deltaTime;
        this.flankUpdateTimer += deltaTime;

        if (this.decisionTimer >= this.decisionInterval) {
            this.decisionTimer = 0;
            this.makeDecision();
        }

        // Periodically update flank direction preference
        if (this.flankUpdateTimer >= this.flankUpdateInterval) {
            this.flankUpdateTimer = 0;
            this.flankDirection = (Math.random() < 0.5) ? -1 : 1; // Re-roll flank side
            this.flankUpdateInterval = 1.0 + Math.random(); // Reset interval
        }

        // Execute current behavior
        if (this.state === 'pursuing' && this.targetPlayer) {
            this.pursuePlayer(deltaTime);
        } else if (this.state === 'wandering') {
            this.wander(deltaTime);
        } else if (this.state === 'idle') {
            this.idle(deltaTime);
        }
// --- Separation Calculation ---
let separationX = 0;
let separationY = 0;
if (worldContext && worldContext.enemies && this.state !== 'wandering' && this.state !== 'idle') { // Don't separate when wandering/idle
    worldContext.enemies.forEach(otherEnemy => {
        if (otherEnemy !== this && otherEnemy.state !== 'dead') {
            const dx = this.x - otherEnemy.x;
            const dy = this.y - otherEnemy.y;
            const distanceSq = dx * dx + dy * dy; // Use squared distance for efficiency

            if (distanceSq > 0 && distanceSq < this.separationRadius * this.separationRadius) {
                const distance = Math.sqrt(distanceSq);
                const forceMagnitude = (this.separationRadius - distance) / this.separationRadius; // Stronger push when closer

                // Direct separation force
                const directForceX = (dx / distance) * forceMagnitude;
                const directForceY = (dy / distance) * forceMagnitude;
                separationX += directForceX;
                separationY += directForceY;

                // Tangential separation force (spreading) - perpendicular to direct force
                const tangentialForceMagnitude = forceMagnitude * 0.3; // Adjust multiplier for desired spread strength
                const tangentialForceX = -directForceY * tangentialForceMagnitude; // Use perpendicular vector (-y, x)
                const tangentialForceY = directForceX * tangentialForceMagnitude;
                separationX += tangentialForceX;
                separationY += tangentialForceY;
            }
        }
    });
}

// Normalize separation vector if needed (optional, depends on desired strength)
const separationLength = Math.sqrt(separationX * separationX + separationY * separationY);
if (separationLength > 0) {
     // Apply separation force directly to velocity (can be adjusted)
     // We add it here so it combines with pursue/wander velocity before the parent update applies physics
     this.velocityX += (separationX / separationLength) * this.separationForce * deltaTime;
     this.velocityY += (separationY / separationLength) * this.separationForce * deltaTime;
     // console.log(`Enemy ${this.id} applying separation: (${(separationX / separationLength).toFixed(2)}, ${(separationY / separationLength).toFixed(2)})`);
}
// --- End Separation ---

// --- Friendly Fire Avoidance ---
let avoidanceX = 0;
let avoidanceY = 0;
if (worldContext && worldContext.projectiles && this.avoidanceTimer <= 0 && this.state !== 'stunned' && this.state !== 'dead') {
    worldContext.projectiles.forEach(proj => {
        // Check if it's an enemy projectile, not owned by self, and still active
        if (proj.type === 'enemy_projectile' && proj.ownerId !== this.id && proj.state !== 'dead') {
            const dx = proj.x - this.x;
            const dy = proj.y - this.y;
            const distanceSq = dx * dx + dy * dy;

            // Check if projectile is within avoidance radius
            if (distanceSq < this.avoidanceRadius * this.avoidanceRadius) {
                // Predict future positions
                const predictTime = this.avoidancePredictionTime;
                const futureProjX = proj.x + proj.velocityX * predictTime;
                const futureProjY = proj.y + proj.velocityY * predictTime;
                const futureEnemyX = this.x + this.velocityX * predictTime; // Use current velocity for prediction
                const futureEnemyY = this.y + this.velocityY * predictTime;

                // Simple future collision check (using enemy bounds)
                const enemyBounds = this.getAbsoluteBounds(); // Get current bounds
                const futureEnemyLeft = futureEnemyX - enemyBounds.width / 2;
                const futureEnemyRight = futureEnemyX + enemyBounds.width / 2;
                const futureEnemyTop = futureEnemyY - enemyBounds.height / 2;
                const futureEnemyBottom = futureEnemyY + enemyBounds.height / 2;

                // Check if predicted projectile position is within predicted enemy bounds
                if (futureProjX > futureEnemyLeft && futureProjX < futureEnemyRight &&
                    futureProjY > futureEnemyTop && futureProjY < futureEnemyBottom)
                {
                    // Collision predicted! Calculate avoidance direction (perpendicular to projectile velocity)
                    const projVelLen = Math.sqrt(proj.velocityX * proj.velocityX + proj.velocityY * proj.velocityY);
                    if (projVelLen > 0) {
                        // Perpendicular vectors: (-vy, vx) and (vy, -vx)
                        // Choose the one that pushes away from the projectile's current position relative to the enemy
                        const perp1X = -proj.velocityY / projVelLen;
                        const perp1Y = proj.velocityX / projVelLen;
                        const perp2X = proj.velocityY / projVelLen;
                        const perp2Y = -proj.velocityX / projVelLen;

                        // Dot product to check which perpendicular is further from the projectile direction (dx, dy)
                        const dot1 = perp1X * dx + perp1Y * dy;
                        const dot2 = perp2X * dx + perp2Y * dy;

                        if (dot1 > dot2) { // Push in direction of perp1
                            avoidanceX += perp1X;
                            avoidanceY += perp1Y;
                        } else { // Push in direction of perp2
                            avoidanceX += perp2X;
                            avoidanceY += perp2Y;
                        }
                        this.avoidanceTimer = this.avoidanceCooldown; // Start cooldown
                        // console.log(`Enemy ${this.id} avoiding projectile ${proj.id}`); // Debug
                    }
                }
            }
        }
    });

    // Apply avoidance force if needed
    const avoidanceLength = Math.sqrt(avoidanceX * avoidanceX + avoidanceY * avoidanceY);
    if (avoidanceLength > 0) {
        // Add avoidance velocity directly (will be applied by super.update)
        this.velocityX += (avoidanceX / avoidanceLength) * this.avoidanceForce * deltaTime;
        this.velocityY += (avoidanceY / avoidanceLength) * this.avoidanceForce * deltaTime;
    }
}
// --- End Friendly Fire Avoidance ---

// Update Bleed Effect
// this.updateBleed(deltaTime); // Removed Bleed Update Call

// Call parent update for physics, animation, etc. (applies velocity including separation and avoidance)
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
            // Agro check: If player is within the agro range
            if (distanceToPlayer <= this.agroRange) {
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
        // Stop pursuing if player moves significantly outside the agro range
        if (distance > this.agroRange * 1.1) { // Add 10% buffer to avoid oscillation
            this.startWandering();
            return;
        }

        // Define minimum distance based on approximate collision sizes
        // Assuming both player and enemy are roughly 40 units wide/tall
        const minDistance = 40; // Stop when centers are this close

        // --- Flanking and Movement Logic ---
        if (distance > minDistance) { // Only move if not too close
            const normalizedX = dx / distance; // Direction directly TO player
            const normalizedY = dy / distance;

            // Calculate perpendicular direction for flanking
            const perpX = -normalizedY;
            const perpY = normalizedX;

            // Calculate the target flanking position
            const flankTargetX = this.targetPlayer.x + perpX * this.flankDirection * this.flankOffsetDistance;
            const flankTargetY = this.targetPlayer.y + perpY * this.flankDirection * this.flankOffsetDistance;

            // Calculate direction vector from enemy to the flank target position
            const flankDx = flankTargetX - this.x;
            const flankDy = flankTargetY - this.y;
            const flankDist = Math.sqrt(flankDx * flankDx + flankDy * flankDy);

            // Normalize the direction vector towards the flank target
            let finalMoveX = normalizedX; // Default to direct pursuit if already at flank point or very close
            let finalMoveY = normalizedY;
            if (flankDist > 10) { // Only use flank direction if not already there (add tolerance)
                 finalMoveX = flankDx / flankDist;
                 finalMoveY = flankDy / flankDist;
            }

            // Combine direct pursuit tendency with flanking tendency (e.g., 70% flank, 30% direct)
            const flankWeight = 0.7;
            const combinedMoveX = finalMoveX * flankWeight + normalizedX * (1 - flankWeight);
            const combinedMoveY = finalMoveY * flankWeight + normalizedY * (1 - flankWeight);

            // Normalize the combined direction
            const combinedLength = Math.sqrt(combinedMoveX * combinedMoveX + combinedMoveY * combinedMoveY);
            const finalCombinedX = (combinedLength > 0) ? combinedMoveX / combinedLength : normalizedX;
            const finalCombinedY = (combinedLength > 0) ? combinedMoveY / combinedLength : normalizedY;


            // Set base velocity towards the calculated flanking direction
            // Separation and avoidance forces will modify this later in the update loop
            this.velocityX = finalCombinedX * this.moveSpeed;
            this.velocityY = finalCombinedY * this.moveSpeed;

        } else {
            // If too close, stop base movement.
            // Separation/Avoidance forces might still apply.
            this.velocityX = 0;
            this.velocityY = 0;
        }
        // --- End Flanking and Movement Logic ---
    }

    // Override takeDamage to add hit effects
    takeDamage(amount) {
        const oldHealth = this.health;
        super.takeDamage(amount);
        console.log(`Enemy ${this.id} took ${amount} damage. Health: ${oldHealth} -> ${this.health}`);

        // Always trigger flash effect when taking damage
        this.hitEffectTimer = this.hitEffectDuration;
        this.isFlashing = true; // Set flashing state to true

        // Reset stun effect intensity when taking damage
        this.stunEffectIntensity = 1.0;
    }

    // Handle collision with player attacks
    handleCollision(otherEntity) {
        super.handleCollision(otherEntity);

        // If colliding with the player
        if (otherEntity.type === 'player') {
            console.log(`Enemy ${this.id} collided with player ${otherEntity.id}. Cooldown: ${this.damageCooldownTimer.toFixed(2)}`);

            // Check if the enemy can deal damage (cooldown ready and not stunned/dead)
            if (this.damageCooldownTimer <= 0 && this.state !== 'dead' && !this.isStunned) {
                console.log(`>>> Enemy ${this.id} applying ${this.damageAmount} damage to player ${otherEntity.id}`);
                otherEntity.takeDamage(this.damageAmount); // Apply damage to the player
                // Trigger visual effect on successful hit
                if (this.scene && typeof this.scene.createMeleeHitEffect === 'function') {
                    this.scene.createMeleeHitEffect(this.x, this.y); // Use enemy position for effect origin
                } else {
                     console.warn(`Enemy ${this.id}: Scene or createMeleeHitEffect method not found!`);
                }
                this.damageCooldownTimer = this.damageCooldown; // Reset cooldown
            }
            // Note: Player's attack collision logic is handled in Player.js handleCollision
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

        // Instantly remove stun effect on death
        this.isStunned = false;
        this.stunEffectIntensity = 0;

        // --- Powerup Drop Logic ---
        const dropChance = 0.10; // 10% chance to drop a powerup
        if (Math.random() < dropChance) {
            if (this.scene && this.scene.powerupManager) {
                console.log(`Enemy ${this.id} dropping powerup at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
                this.scene.powerupManager.spawnPowerup(this.x, this.y);
            } else {
                console.warn(`Enemy ${this.id}: Cannot drop powerup - scene or powerupManager not found.`);
            }
        }
        // --- End Powerup Drop Logic ---

        // Could add particle effects, etc.
    }

    // --- applyBleed Method Removed ---
    // applyBleed(dps, duration) { ... }

    // --- updateBleed Method Removed ---
    // updateBleed(deltaTime) {
    //     if (!this.isBleeding || this.state === 'dead') {
    //         return;
    //     }
    //
    //     if (this.bleedDurationTimer > 0) {
    //         this.bleedDurationTimer -= deltaTime;
    //
    //         // Apply damage proportionally to deltaTime
    //         const damageThisFrame = this.bleedDPS * deltaTime;
    //         super.takeDamage(damageThisFrame);
    //
    //         // Visual tick timer
    //         this.bleedTickTimer -= deltaTime;
    //         if (this.bleedTickTimer <= 0) {
    //             this.bleedTickTimer = this.bleedTickInterval;
    //             // Trigger visual damage indicator in GameScreen
    //             if (this.scene && typeof this.scene.createBleedDamageIndicator === 'function') {
    //                 // Also trigger dripping particle effect
    //                 if (typeof this.scene.createBleedParticleEffect === 'function') {
    //                     // this.scene.createBleedParticleEffect(this.x, this.y); // Removed
    //                 }
    //                 // this.scene.createBleedDamageIndicator(this.x, this.y, Math.ceil(this.bleedDPS * this.bleedTickInterval)); // Removed
    //             }
    //         }
    //
    //
    //         if (this.bleedDurationTimer <= 0) {
    //             console.log(`Enemy ${this.id} bleed ended.`);
    //             this.isBleeding = false;
    //             this.bleedDPS = 0;
    //             this.bleedDurationTimer = 0;
    //         }
    //     } else {
    //          // Safety cleanup if timer is somehow <= 0 but flag is true
    //          this.isBleeding = false;
    //          this.bleedDPS = 0;
    //     }
    // }
}