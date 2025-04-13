// src/entities/Player.js
import { Entity } from './Entity.js';

export class Player extends Entity {
    constructor(x, y, inputHandler, options = {}) {
        // Default player options
        const playerOptions = {
            type: 'player',
            maxHealth: options.maxHealth || 100,
            friction: options.friction || 0.85, // Slightly higher friction for more responsive controls
            ...options,
        };

        super(x, y, playerOptions);

        // Input handling
        this.inputHandler = inputHandler;

        // Movement properties
        this.moveSpeed = options.moveSpeed || 200;
        this.isMoving = false;
        this.direction = { x: 0, y: 1 }; // Default facing down
        this.lastMoveDirection = { x: 0, y: 1 }; // Track last movement direction for dash

        // Dash properties
        this.dashSpeed = this.moveSpeed * 6; // Much faster than normal movement (increased from 4x)
        this.dashDistance = 10 * (options.tileSize || 50); // 10 tiles (increased from 6)
        this.dashDuration = 0.3; // in seconds (slightly increased)
        this.dashCooldown = 1.5; // in seconds (increased cooldown to balance the stronger dash)
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.isDashing = false;
        this.dashDirection = { x: 0, y: 0 };
        this.dashDistanceTraveled = 0;

        // Attack properties
        this.attackPower = options.attackPower || 12; // Updated damage
        this.lungeSpeed = this.moveSpeed * 3; // Slightly slower than dash
        this.lungeDistance = 3 * (options.tileSize || 50); // 3 tiles
        this.lungeDuration = 0.2; // in seconds
        this.attackCooldown = 0.5; // in seconds
        this.lungeTimer = 0;
        this.attackCooldownTimer = 0;
        this.isAttacking = false;
        this.lungeDirection = { x: 0, y: 0 };
        this.enemiesHitThisAttack = new Set(); // Keep track of enemies hit during the current attack
        this.lungeDistanceTraveled = 0;

        // Mouse position for aiming
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false; // Track mouse button state
        
        // Setup mouse tracking
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    onMouseMove(event) {
        // Update mouse position for aiming
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }
    
    onMouseDown(event) {
        // Check if it's the left mouse button (button 0)
        if (event.button === 0) {
            this.isMouseDown = true;
        }
    }
    
    onMouseUp(event) {
        // Check if it's the left mouse button (button 0)
        if (event.button === 0) {
            this.isMouseDown = false;
        }
    }

    onMouseMove(event) {
        // Update mouse position for aiming
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    // Calculate direction to mouse cursor (in screen space)
    updateAimDirection(scene) {
        if (!scene || !scene.cameras || !scene.cameras.main) return;

        // Get camera object
        const camera = scene.cameras.main;
        
        // Manual calculation of world to screen conversion using Phaser's camera properties
        // This is how Phaser internally converts world coordinates to screen coordinates
        const screenX = (this.x - camera.scrollX) * camera.zoom;
        const screenY = (this.y - camera.scrollY) * camera.zoom;
        
        // Get direction from player to mouse
        const dx = this.mouseX - screenX;
        const dy = this.mouseY - screenY;
        
        // Normalize direction vector
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
            this.direction = {
                x: dx / length,
                y: dy / length
            };
        }
    }

    update(deltaTime, scene) {
        this.scene = scene; // Store the scene reference
        if (this.state === 'dead') return;

        // Reset velocity before processing inputs and states
        this.velocityX = 0;
        this.velocityY = 0;

        // Update aim direction based on mouse position
        this.updateAimDirection(scene);

        // Handle cooldown timers
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }
        
        if (this.attackCooldownTimer > 0) {
            this.attackCooldownTimer -= deltaTime;
        }

        // Process dashing state
        if (this.isDashing) {
            this.updateDash(deltaTime);
        } 
        // Process attacking state
        else if (this.isAttacking) {
            this.updateAttack(deltaTime);
        } 
        // Process normal movement
        else {
            this.processInput();
        }

        // Call parent update for physics, animation updates, etc.
        super.update(deltaTime);
    }

    processInput() {
        // Only process movement input if not dashing or attacking
        if (this.isDashing || this.isAttacking) return;

        let moveX = 0;
        let moveY = 0;

        // WASD movement
        if (this.inputHandler.isDown('KeyW')) moveY -= 1;
        if (this.inputHandler.isDown('KeyS')) moveY += 1;
        if (this.inputHandler.isDown('KeyA')) moveX -= 1;
        if (this.inputHandler.isDown('KeyD')) moveX += 1;

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
        }

        // Apply movement speed
        this.velocityX = moveX * this.moveSpeed;
        this.velocityY = moveY * this.moveSpeed;

        // Update movement state
        this.isMoving = moveX !== 0 || moveY !== 0;
        
        // Track last movement direction for dash
        if (this.isMoving) {
            this.lastMoveDirection = {
                x: moveX,
                y: moveY
            };
            this.setState('moving');
        } else {
            this.setState('idle');
        }

        // Dash with Space
        if (this.inputHandler.wasPressed('Space') && this.dashCooldownTimer <= 0) {
            this.startDash();
        }

        // Check for mouse click attack
        if (this.isMouseDown && this.attackCooldownTimer <= 0 && !this.isAttacking) {
            this.startAttack();
            // Reset mouse down to prevent multiple attacks from a single click
            this.isMouseDown = false;
        }
    }

    startDash() {
        this.isDashing = true;
        this.dashTimer = 0;
        this.dashDistanceTraveled = 0;
        
        // Use the last movement direction for dash
        this.dashDirection = { ...this.lastMoveDirection };
        
        this.setState('dashing');
    }

    updateDash(deltaTime) {
        this.dashTimer += deltaTime;
        
        // Apply dash velocity
        this.velocityX = this.dashDirection.x * this.dashSpeed;
        this.velocityY = this.dashDirection.y * this.dashSpeed;
        
        // Track distance traveled
        const distanceThisFrame = Math.sqrt(
            (this.velocityX * deltaTime) ** 2 + 
            (this.velocityY * deltaTime) ** 2
        );
        this.dashDistanceTraveled += distanceThisFrame;
        
        // Create a trail effect during dash (optional visual enhancement)
        this.createDashTrail();
        
        // End dash when either timer expires or distance is reached
        if (this.dashTimer >= this.dashDuration || this.dashDistanceTraveled >= this.dashDistance) {
            this.isDashing = false;
            this.dashCooldownTimer = this.dashCooldown;
            this.setState('idle');
        }
    }
    
    // Create a visual dash trail effect (stub - implement in actual game scene)
    createDashTrail() {
        // This would be implemented with the game's rendering system
        // For example, in Phaser you might create particles or sprites
        // This is just a placeholder for the concept
        if (this.scene && this.scene.createDashTrailEffect) {
            this.scene.createDashTrailEffect(this.x, this.y);
        }
    }

    startAttack() {
        this.isAttacking = true;
        this.enemiesHitThisAttack.clear(); // Clear the set at the start of each attack
        this.lungeTimer = 0;
        this.lungeDistanceTraveled = 0;
        
        // Find nearest enemy and lunge toward it, or use last movement direction if no enemy is found
        const nearestEnemy = this.findNearestEnemy();
        
        if (nearestEnemy) {
            // Calculate direction to the nearest enemy
            const dx = nearestEnemy.x - this.x;
            const dy = nearestEnemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize the direction vector
            if (distance > 0) {
                this.lungeDirection = {
                    x: dx / distance,
                    y: dy / distance
                };
            } else {
                // In the unlikely case the enemy is exactly at our position, use last movement
                this.lungeDirection = { ...this.lastMoveDirection };
            }
        } else {
            // No enemy found, use last movement direction
            this.lungeDirection = { ...this.lastMoveDirection };
        }
        
        this.setState('attacking');
    }
    
    // Helper method to find the nearest enemy
    findNearestEnemy() {
        console.log("[findNearestEnemy] Searching for enemies..."); // DEBUG LOG
        if (!this.scene) {
            console.log("[findNearestEnemy] No scene reference found."); // DEBUG LOG
            return null;
        }
        
        // The maximum detection range for enemies
        const detectionRange = 300; // Adjust as needed
        let nearestEnemy = null;
        let nearestDistance = detectionRange;
        
        // Check if the scene has a list of enemies to search through
        if (this.scene.enemies && Array.isArray(this.scene.enemies)) {
            console.log(`[findNearestEnemy] Found ${this.scene.enemies.length} enemies in scene list.`); // DEBUG LOG
            for (const enemy of this.scene.enemies) {
                // Skip dead enemies
                if (enemy.state === 'dead') continue;
                
                // Calculate distance to this enemy
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // If this enemy is closer than the current nearest, update
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            }
        } else {
             console.log("[findNearestEnemy] Scene.enemies list not found or not an array."); // DEBUG LOG
        }
        
        if (nearestEnemy) {
            console.log(`[findNearestEnemy] Found nearest enemy: ${nearestEnemy.id} at distance ${nearestDistance.toFixed(2)}`); // DEBUG LOG
        } else {
            console.log("[findNearestEnemy] No suitable enemy found within range."); // DEBUG LOG
        }
        
        return nearestEnemy;
    }

    updateAttack(deltaTime) {
        // If we've already hit an enemy during this attack, stop the lunge immediately
        if (this.enemiesHitThisAttack.size > 0) {
            this.isAttacking = false;
            this.attackCooldownTimer = this.attackCooldown;
            this.setState('idle');
            this.velocityX = 0; // Stop residual movement
            this.velocityY = 0;
            return; // Exit the updateAttack logic early
        }

        this.lungeTimer += deltaTime;
        
        // Apply lunge velocity
        this.velocityX = this.lungeDirection.x * this.lungeSpeed;
        this.velocityY = this.lungeDirection.y * this.lungeSpeed;
        
        // Track distance traveled
        const distanceThisFrame = Math.sqrt(
            (this.velocityX * deltaTime) ** 2 + 
            (this.velocityY * deltaTime) ** 2
        );
        this.lungeDistanceTraveled += distanceThisFrame;
        
        // End attack when either timer expires or distance is reached
        if (this.lungeTimer >= this.lungeDuration || this.lungeDistanceTraveled >= this.lungeDistance) {
            this.isAttacking = false;
            this.attackCooldownTimer = this.attackCooldown;
            this.setState('idle');
        }
    }

// Handle collision with other entities
handleCollision(otherEntity) {
    super.handleCollision(otherEntity);

    // --- Lunge Attack Collision ---
    if (this.isAttacking) {
        console.log(`Player attacking, collided with: ${otherEntity?.id} (Type: ${otherEntity?.type})`);
        if (otherEntity?.type === 'enemy') {
             console.log(`>>> Enemy collision detected during attack! Applying effects to ${otherEntity.id}`);
             // Ensure enemy is not already dead AND hasn't been hit by this attack yet
             if (otherEntity.state !== 'dead' && !this.enemiesHitThisAttack.has(otherEntity.id)) {
                // 1. Apply Damage
                otherEntity.takeDamage(this.attackPower);
                this.enemiesHitThisAttack.add(otherEntity.id); // Mark this enemy as hit for this attack

                // 2. Apply Enhanced Knockback
                // 2. Apply Enhanced Knockback - use the new method
                if (this.scene && this.scene.applyEnhancedKnockback) {
                    const knockbackForce = 800; // Increased force significantly
                    const knockbackDirectionX = otherEntity.x - this.x;
                    const knockbackDirectionY = otherEntity.y - this.y;
                    this.scene.applyEnhancedKnockback(otherEntity, knockbackDirectionX, knockbackDirectionY, knockbackForce);
                } else {
                    // Fallback to entity's method if our enhanced version isn't available
                    const knockbackForce = 600;
                    const knockbackDirectionX = otherEntity.x - this.x;
                    const knockbackDirectionY = otherEntity.y - this.y;
                    otherEntity.applyKnockback(knockbackDirectionX, knockbackDirectionY, knockbackForce);
                }

                // 3. Apply longer stun
                const stunDuration = 0.8; // seconds - increased from 0.5
                otherEntity.stun(stunDuration);

                // 4. Apply hit flash effect
                if (this.scene && this.scene.applyHitFlash) {
                    this.scene.applyHitFlash(otherEntity);
                }

                // 5. Create impact effect at the hit location
                if (this.scene && this.scene.createImpactEffect) {
                    this.scene.createImpactEffect(otherEntity.x, otherEntity.y);
                }

                // 6. Trigger camera shake for feedback
                if (this.scene && this.scene.cameras && this.scene.cameras.main) {
                    this.scene.cameras.main.shake(100, 0.01); // Duration: 100ms, Intensity: 0.01
                }

                // 7. Enhanced hit-stop effect scaled by damage
                if (this.scene && this.scene.applyHitStop) {
                    this.scene.applyHitStop(this, otherEntity, this.attackPower);
                } else {
                    // Fallback to old hit-stop if enhanced version isn't available
                    if (this.scene) {
                        // Save current velocities
                        const playerVelX = this.velocityX;
                        const playerVelY = this.velocityY;
                        const enemyVelX = otherEntity.velocityX;
                        const enemyVelY = otherEntity.velocityY;
                        
                        // Stop all movement momentarily
                        this.velocityX = 0;
                        this.velocityY = 0;
                        otherEntity.velocityX = 0;
                        otherEntity.velocityY = 0;
                        
                        // Resume after brief pause with slightly reduced player velocity
                        this.scene.time.delayedCall(80, () => {
                            // Resume with some velocity reduction (to make hits feel impactful)
                            this.velocityX = playerVelX * 0.7;
                            this.velocityY = playerVelY * 0.7;
                            
                            // Enemy velocity is set by knockback, no need to restore
                        });
                    }
                }
             }
        }
    }
}

    // Override takeDamage to implement player-specific damage handling
    takeDamage(amount) {
        // Reduce damage if dashing (optional dodge mechanic)
        const actualDamage = this.isDashing ? amount * 0.5 : amount;
        
        super.takeDamage(actualDamage);
        console.log(`Player took ${actualDamage} damage, health: ${this.health}/${this.maxHealth}`);
        
        // Could add screen shake, flash, etc. here
    }

    // Override onDeath for player-specific death behavior
    onDeath() {
        super.onDeath();
        console.log("Player has died!");
        
        // Stop all movement
        this.velocityX = 0;
        this.velocityY = 0;
        this.isDashing = false;
        this.isAttacking = false;
        
        // Could trigger game over, respawn, etc. here
    }

    // Clean up when player is destroyed
    destroy() {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
        super.destroy();
    }
}