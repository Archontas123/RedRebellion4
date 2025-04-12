import { Entity } from './Entity.js';

class Enemy extends Entity {
    constructor(x, y, options = {}) {
        // Set default enemy options and merge with provided options
        const enemyOptions = {
            type: 'enemy',
            maxHealth: options.maxHealth || 50,
            speed: options.speed || 50,
            attackPower: options.attackPower || 10,
            attackRadius: options.attackRadius || 30, // When to initiate attack
            directChaseRadius: options.directChaseRadius || 150, // When to target player directly
            attackCooldown: options.attackCooldown || 1.5,
            staticPointOffset: options.staticPointOffset || 100, // Distance for static points from player (Reduced from 200)
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 50, height: 50 }, // Default to 50x50 like player
            ...options,
        };

        super(x, y, enemyOptions);

        // Enemy-specific properties
        this.attackPower = enemyOptions.attackPower;
        this.speed = enemyOptions.speed;
        this.directChaseRadius = enemyOptions.directChaseRadius;
        this.attackRadius = enemyOptions.attackRadius;
        this.attackCooldown = enemyOptions.attackCooldown;
        this.staticPointOffset = enemyOptions.staticPointOffset;
        this.attackTimer = 0;
// Pathfinding state
this.aiState = 'idle'; // 'idle', 'approaching_static_point', 'chasing_player', 'attacking'
this.target = null; // Reference to the player
this.pathfindingTarget = null; // {x, y} point the enemy is moving towards
this.currentTargetPointIndex = null; // Index (0-3) of the static point being targeted

// Status effect properties
this.isStunned = false;
this.stunTimer = 0;

        // Debug properties for visualization
        this.debugData = {
            directChaseRadius: this.directChaseRadius,
            attackRadius: this.attackRadius,
            staticPointOffset: this.staticPointOffset,
            calculatedStaticPoints: [], // Store the 4 calculated points for debug draw
            pathfindingTarget: null,
            aiState: this.aiState,
        };

        // Knockback properties (optional, can be handled directly in applyKnockback)
        // this.knockbackVelocityX = 0;
        // this.knockbackVelocityY = 0;
        // this.knockbackTimer = 0;
    }

    // Helper to calculate distance squared (more efficient than sqrt)
    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    // Helper to generate random points on a circle circumference
    generatePointOnCircle(centerX, centerY, radius) {
        const angle = Math.random() * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        return { x, y };
    }

    // Override update to implement new enemy AI and behavior
    update(deltaTime, world) { // Pass world context (scene, player, etc.)
        // Call base class update FIRST. This handles stun timer, flash timer,
        // applies friction (to knockback velocity too), gravity, and base position updates.
        super.update(deltaTime);

        if (this.state === 'dead') return;

        // Log velocity *after* super.update() and *before* AI logic
        if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1 || this.isStunned) { // Log if moving or stunned
             console.log(`[Enemy Update Start] ID: ${this.id}, Stunned: ${this.isStunned}, Vel Before AI: (${this.velocityX.toFixed(2)}, ${this.velocityY.toFixed(2)})`); // DEBUG LOG
        }

        // --- AI and Enemy-Specific Logic ---
        // Only run AI if NOT stunned. The base update already handles physics for stunned state.
        if (!this.isStunned) {
            // Update attack timer
        if (this.attackTimer > 0) {
            this.attackTimer -= deltaTime;
        }

        // --- Simplified AI Logic ---
        this.target = world.player; // Always target the player context

        if (!this.target || this.target.state === 'dead') {
            // No target or target is dead, go idle
            this.aiState = 'idle';
            this.velocityX = 0;
            this.velocityY = 0;
            this.pathfindingTarget = null;
            this.currentTargetPointIndex = null;
            if (this.state !== 'idle') this.setState('idle');
            this.debugData.aiState = this.aiState;
            this.debugData.pathfindingTarget = null;
            this.debugData.calculatedStaticPoints = [];
            return; // Stop processing AI
        }

        const playerX = this.target.x;
        const playerY = this.target.y;
        const distanceToPlayerSq = this.distanceSq(this.x, this.y, playerX, playerY);
        const directChaseRadiusSq = this.directChaseRadius * this.directChaseRadius;
        const attackRadiusSq = this.attackRadius * this.attackRadius;

        // Calculate the 4 static points relative to the player
        const offset = this.staticPointOffset;
        const staticPoints = [
            { x: playerX, y: playerY - offset }, // North
            { x: playerX + offset, y: playerY }, // East
            { x: playerX, y: playerY + offset }, // South
            { x: playerX - offset, y: playerY }  // West
        ];
        this.debugData.calculatedStaticPoints = staticPoints.map(p => ({...p})); // Update debug data

        // --- State Transitions ---

        // 1. Attacking State
        if (distanceToPlayerSq <= attackRadiusSq) {
            this.aiState = 'attacking';
            this.velocityX = 0;
            this.velocityY = 0;
            this.pathfindingTarget = null;
            this.currentTargetPointIndex = null; // No static point target when attacking
            this.setState('attacking'); // Or 'idle'

            if (this.attackTimer <= 0) {
                this.attack(this.target);
                this.attackTimer = this.attackCooldown;
            }

        // 2. Direct Chase State
        } else if (distanceToPlayerSq <= directChaseRadiusSq) {
            this.aiState = 'chasing_player';
            this.pathfindingTarget = { x: playerX, y: playerY };
            this.currentTargetPointIndex = null; // No static point target when chasing
            this.setState('moving');

        // 3. Approaching Static Point State
        } else {
            this.aiState = 'approaching_static_point';
            this.setState('moving');

            // Select a static point if none is currently targeted
            if (this.currentTargetPointIndex === null) {
                this.currentTargetPointIndex = Math.floor(Math.random() * 4);
                this.pathfindingTarget = { ...staticPoints[this.currentTargetPointIndex] };
            } else {
                 // Update the target position in case the player moved
                 this.pathfindingTarget = { ...staticPoints[this.currentTargetPointIndex] };
            }

            // Check if close enough to the current static point target
            if (this.pathfindingTarget) {
                const distToStaticTargetSq = this.distanceSq(this.x, this.y, this.pathfindingTarget.x, this.pathfindingTarget.y);
                const targetReachedThresholdSq = 20 * 20; // 20 pixels threshold

                if (distToStaticTargetSq < targetReachedThresholdSq) {
                    // Reached the point, select a *different* random point
                    let newIndex;
                    do {
                        newIndex = Math.floor(Math.random() * 4);
                    } while (newIndex === this.currentTargetPointIndex);
                    this.currentTargetPointIndex = newIndex;
                    this.pathfindingTarget = { ...staticPoints[this.currentTargetPointIndex] };
                }
            }
        }

        // --- Movement Logic ---
        if (this.aiState === 'approaching_static_point' || this.aiState === 'chasing_player') {
            if (this.pathfindingTarget) {
                const targetX = this.pathfindingTarget.x;
                const targetY = this.pathfindingTarget.y;
                const dx = targetX - this.x;
                const dy = targetY - this.y;

                // Avoid division by zero if already at target
                if (dx !== 0 || dy !== 0) {
                    const angle = Math.atan2(dy, dx);
                    const newVelX = Math.cos(angle) * this.speed;
                    const newVelY = Math.sin(angle) * this.speed;
                    if (this.velocityX !== newVelX || this.velocityY !== newVelY) { // Log only if AI changes velocity
                         console.log(`[Enemy AI Sets Vel] ID: ${this.id}, State: ${this.aiState}, New Vel: (${newVelX.toFixed(2)}, ${newVelY.toFixed(2)})`); // DEBUG LOG
                    }
                    this.velocityX = newVelX;
                    this.velocityY = newVelY;
                } else {
                    if (this.velocityX !== 0 || this.velocityY !== 0) { // Log only if AI changes velocity
                         console.log(`[Enemy AI Sets Vel] ID: ${this.id}, State: ${this.aiState}, At Target, Setting Vel to 0`); // DEBUG LOG
                    }
                    this.velocityX = 0;
                    this.velocityY = 0;
                }
                this.setState('moving');
            } else {
                // Should have a target in these states, but stop if not
                if (this.velocityX !== 0 || this.velocityY !== 0) { // Log only if AI changes velocity
                     console.log(`[Enemy AI Sets Vel] ID: ${this.id}, State: ${this.aiState}, No Target, Setting Vel to 0`); // DEBUG LOG
                }
                this.velocityX = 0;
                this.velocityY = 0;
            }
        }

        // Update debug data
        this.debugData.aiState = this.aiState;
        this.debugData.pathfindingTarget = this.pathfindingTarget ? { ...this.pathfindingTarget } : null;

        // --- End Simplified AI Logic ---
        } // End of if (!this.isStunned) block
    }

    // Override handleCollision for enemy-specific interactions
    handleCollision(otherEntity) {
        super.handleCollision(otherEntity); // Call base method if needed

        if (otherEntity.type === 'player') {
            // Example: Enemy bumps into player
            // console.log(`Enemy ${this.id} collided with Player ${otherEntity.id}`);
            // Maybe apply damage if attacking, or just push back
            if (this.aiState === 'attacking') {
                 // Apply damage periodically or on attack animation hit frame
            } else {
                // Simple push back (could be more sophisticated)
                // const pushForce = 5;
                // const dx = this.x - otherEntity.x;
                // const dy = this.y - otherEntity.y;
                // const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                // this.velocityX += (dx / dist) * pushForce;
                // this.velocityY += (dy / dist) * pushForce;
            }
        } else if (otherEntity.type === 'wall' || otherEntity.type === 'obstacle') {
            // Handle collision with environment
            // console.log(`Enemy ${this.id} collided with ${otherEntity.type}`);
            // Basic stop - physics engine might handle this better
            // this.x -= this.velocityX * deltaTime; // Revert position (crude)
            // this.y -= this.velocityY * deltaTime;
            // this.velocityX = 0;
            // this.velocityY = 0;
        }
        // Add more collision cases as needed (e.g., enemy vs enemy, enemy vs item)
    }

    // Override onDeath for specific enemy death behavior
    onDeath() {
        super.onDeath(); // Call base class death logic (e.g., set state)
        console.log(`Enemy ${this.id} has been vanquished!`);
        // Add specific enemy death effects:
        // - Drop loot
        // - Play death sound/animation
        // - Remove from game world (often handled by the scene/manager)
        this.setState('dead'); // Ensure state is set
        // Consider setting a flag or timer for removal instead of immediate disappearance
        // this.isRemovable = true;
    }

    // Example: Specific attack method
    attack(target) {
        // Ensure we are in the correct state and the target is valid
        if (this.state !== 'dead' && this.aiState === 'attacking' && target && target.takeDamage && target.state !== 'dead') {
            console.log(`Enemy ${this.id} attacks ${target.id} for ${this.attackPower} damage.`);
            target.takeDamage(this.attackPower);

            // TODO: Trigger specific attack animation here if available
            // this.setAnimation('attack'); // Example

            // Cooldown is reset in the update loop after calling attack
        }
    }

    // Method to apply knockback force
    applyKnockback(directionX, directionY, force) {
        if (this.state === 'dead') return;

        // Normalize the direction vector
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        let normalizedX = 0;
        let normalizedY = 0;

        if (length > 0) {
            normalizedX = directionX / length;
            normalizedY = directionY / length;
        } else {
            // If direction is zero (e.g., player exactly on top), apply a default knockback
            // Choose a random direction or a default like straight up
            normalizedX = 0;
            normalizedY = -1; // Knockback upwards
        }

        // Apply the force as an immediate velocity change
        // The base Entity's friction should handle slowing down
        this.velocityX += normalizedX * force;
        this.velocityY += normalizedY * force;

        // Optional: Could implement a knockback timer/state if friction isn't enough
        // console.log(`Applied knockback to ${this.id}. New velocity: (${this.velocityX.toFixed(2)}, ${this.velocityY.toFixed(2)})`);
    }

    // Method to apply stun effect
    stun(duration) {
        if (this.state === 'dead') return;

        this.isStunned = true;
        this.stunTimer = Math.max(this.stunTimer, duration); // Prevent overriding a longer stun
        this.velocityX = 0; // Stop movement when stunned
        this.velocityY = 0;
        this.aiState = 'idle'; // Reset AI state during stun
        this.setState('idle'); // Or a specific 'stunned' state if animation exists
        console.log(`Enemy ${this.id} stunned for ${duration} seconds.`);
    }

    // Method to draw debug visuals
    // Method to draw debug visuals
    drawDebug(graphics) {
        // Ensure graphics object is valid
        if (!graphics) {
            console.warn("drawDebug called without graphics object for Enemy:", this.id);
            return;
        }
        // Don't draw if dead
        if (this.state === 'dead') return;

        // Use the debugData object for consistency
        const debugInfo = this.debugData;
        const player = this.target; // Assumes target is the player

        // --- Draw Radii ---
        if (player && player.state !== 'dead') {
            const playerX = player.x;
            const playerY = player.y;

            // Draw Direct Chase Radius around Player
            graphics.lineStyle(1, 0xffff00, 0.5); // Yellow for direct chase radius
            graphics.strokeCircle(playerX, playerY, debugInfo.directChaseRadius);
        }

        // Draw Attack Radius around Enemy
        graphics.lineStyle(1, 0x00ff00, 0.5); // Green for attack radius
        graphics.strokeCircle(this.x, this.y, debugInfo.attackRadius);

        // --- Draw Calculated Static Points ---
        graphics.fillStyle(0x00aaff, 0.7); // Light blue for the 4 static points
        if (debugInfo.calculatedStaticPoints && debugInfo.calculatedStaticPoints.length > 0) {
            debugInfo.calculatedStaticPoints.forEach((point, index) => {
                if (point && typeof point.x === 'number' && typeof point.y === 'number') {
                    // Highlight the current target point
                    if (this.aiState === 'approaching_static_point' && index === this.currentTargetPointIndex) {
                         graphics.fillStyle(0xff00ff, 0.9); // Magenta if it's the current target
                         graphics.fillCircle(point.x, point.y, 5);
                         graphics.fillStyle(0x00aaff, 0.7); // Reset color for others
                    } else {
                         graphics.fillCircle(point.x, point.y, 4); // Small circles for points
                    }
                }
            });
        }

        // --- Draw Current Pathfinding Target Line ---
        if (!this.isStunned && this.pathfindingTarget && typeof this.pathfindingTarget.x === 'number' && typeof this.pathfindingTarget.y === 'number') {
            // Draw line from enemy to current target (either player or static point)
            graphics.lineStyle(1, 0xff00ff, 0.8); // Magenta line
            graphics.beginPath();
            graphics.moveTo(this.x, this.y);
            graphics.lineTo(this.pathfindingTarget.x, this.pathfindingTarget.y);
            graphics.strokePath();

            // Optionally draw the target point itself again on top
            graphics.fillStyle(0xff00ff, 1.0); // Magenta for the current target point
            graphics.fillCircle(this.pathfindingTarget.x, this.pathfindingTarget.y, 3);
        }

        // --- Draw Stun Indicator ---
        if (this.isStunned) {
            graphics.fillStyle(0xffff00, 0.8); // Yellow for stun
            graphics.fillCircle(this.x, this.y - this.height / 2 - 10, 5); // Draw a small circle above the enemy
        }
    }
}

// Export the class
export { Enemy };