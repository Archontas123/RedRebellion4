// src/entities/Player.js
import { Entity } from './Entity.js';
import PowerupManager from './PowerupManager.js'; // Import PowerupManager
// import Powerup from './Powerup.js'; // No longer needed here, type is passed directly
export class Player extends Entity {
    // Add worldManager to the constructor parameters
    constructor(x, y, inputHandler, worldManager, options = {}) {
        // Default player options
        const playerOptions = {
            type: 'player',
            maxHealth: options.maxHealth || 100,
            friction: options.friction || 0.85, // Slightly higher friction for more responsive controls
            ...options,
        };

        super(x, y, playerOptions);

        // Store scene reference if provided
        this.scene = options.scene || null;

        // Store WorldManager reference
        this.worldManager = worldManager; // Added
        if (!this.worldManager) {
            console.error("Player created without a WorldManager reference!");
        }

        // --- NEW: Weapon Properties ---
        this.currentWeapon = 'melee'; // 'melee' or 'railgun'
        this.weapons = ['melee', 'railgun'];
        this.currentWeaponIndex = 0;

        // --- Railgun Properties ---
        this.railgunChargeTime = 1.5; // seconds to full charge
        this.railgunCooldown = 1.0; // seconds cooldown after firing
        this.railgunMinDamage = 15; // <-- NEW: Minimum damage
        this.railgunMaxDamage = 150; // Renamed for clarity
        this.railgunProjectileSpeed = 1200;
        this.isChargingRailgun = false;
        this.railgunChargeTimer = 0;
        this.railgunCooldownTimer = 0;
        this.isRailgunMaxCharged = false; // <-- NEW: Track max charge state

        // Input handling
        this.inputHandler = inputHandler;

        // Movement properties
        this.baseMoveSpeed = options.moveSpeed || 200; // Store the base speed
        this.moveSpeed = this.baseMoveSpeed; // Current speed, updated by powerups
        // speedPowerupMultiplier removed
        this.isMoving = false;
        this.direction = { x: 0, y: 1 }; // Default facing down
        this.lastMoveDirection = { x: 0, y: 1 }; // Track last movement direction for dash

        // Dash properties
        this.dashSpeed = this.moveSpeed * 6; // Based on current move speed
        this.dashDistance = 10 * (options.tileSize || 50); // 10 tiles (increased from 6)
        this.dashDuration = 0.3; // in seconds (slightly increased)
        this.dashCooldown = 1.5; // in seconds (increased cooldown to balance the stronger dash)
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.isDashing = false;
        this.dashDirection = { x: 0, y: 0 };
        this.dashDistanceTraveled = 0;

        // Attack properties
        this.baseAttackPower = options.attackPower || 25; // Base damage per hit
        this.attackPower = this.baseAttackPower; // Current attack power (might not be needed if damage is handled per hit)
        // damagePowerupDoubleHitChance removed
        this.lungeSpeed = this.moveSpeed * 3; // Based on current move speed
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
        // Mouse position tracking removed (handled by scene input)

        // Add properties for current tile coordinates
        this.currentTileX = 0; // Added
        this.currentTileY = 0; // Added
        this.updateCurrentTileCoords(); // Initialize based on starting position

        // Item collection
        this.plasmaCount = 0;

        // Powerup Manager
        this.powerupManager = new PowerupManager(this.scene, this); // Pass scene and player instance
         this.speedBoostStacks = 0; // Track speed boost stacks
         // this.damageBoostStacks = 0; // Track damage boost stacks // Removed
         // this.doubleHitChanceStacks = 0; // Track double hit chance stacks // Removed
         // this.bleedingStacks = 0; // Removed Bleeding Stacks
         // this.fireRateBoostStacks = 0; // Track fire rate boost stacks // Removed
         this.healthIncreaseStacks = 0; // Track health increase stacks

        // Base stats for powerups
        this.baseMaxHealth = this.maxHealth; // Store initial max health
        // this.baseProjectileDamage = options.projectileDamage || 10; // Base damage for projectiles // Removed
        // this.currentProjectileDamage = this.baseProjectileDamage; // Current damage, modified by powerups // Removed
        // this.baseFireRateDelay = options.fireRateDelay || 0.25; // Base delay between shots (seconds) // Removed
        // this.currentFireRateDelay = this.baseFireRateDelay; // Current delay, modified by powerups // Removed
     // // Recoil state properties (Removed)
     // this.baseFriction = this.friction; // Store original friction
     // this.isRecoiling = false;
     // this.recoilTimer = 0;
     // this.recoilDuration = 0.25; // Duration of reduced friction (seconds)
     // this.recoilFriction = 0.98; // Lower friction during recoil

        // Turret Destruction properties
        this.turretDestroyRange = (options.tileSize || 50) * 1.5; // 1.5 tiles range
        this.turretDestroyHoldTime = 1.0; // seconds to hold B (Reduced from 2.0)
        this.turretDestroyTimer = 0;
        this.nearbyTurret = null; // Track the turret being destroyed
 }

    // onMouseMove, onMouseDown, onMouseUp removed - Handled by InputHandler via scene

    // Calculate direction to mouse cursor (in screen space)
    updateAimDirection() { // No longer needs scene passed explicitly if this.scene is set
        if (!this.scene || !this.scene.input || !this.scene.input.activePointer) return;

        // Get the active pointer from the scene's input manager
        const pointer = this.scene.input.activePointer;

        // Get direction from player's world position to pointer's world position
        const dx = pointer.worldX - this.x;
        const dy = pointer.worldY - this.y;
        
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
        // Only update scene reference if it's not already set
        if (!this.scene && scene) {
            this.scene = scene;
        }
        if (this.state === 'dead') return;

        // // Handle recoil state timer (Removed)
        // if (this.isRecoiling) {
        //     this.recoilTimer -= deltaTime;
        //     if (this.recoilTimer <= 0) {
        //         this.isRecoiling = false;
        //         console.log("Recoil state ended.");
        //     }
        // }

        // Reset velocity before processing inputs and states
        this.velocityX = 0;
        this.velocityY = 0;

        // Update aim direction based on mouse position
        this.updateAimDirection(); // Use internal scene reference

        // Handle cooldown timers
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }
        
        if (this.attackCooldownTimer > 0) { // Melee cooldown
            this.attackCooldownTimer -= deltaTime;
        }
        // --- NEW: Railgun Cooldown Timer ---
        if (this.railgunCooldownTimer > 0) {
            this.railgunCooldownTimer -= deltaTime;
        }

        // Process dashing state
        if (this.isDashing) {
            this.updateDash(deltaTime);
        } 
        // Process attacking state
        else if (this.isAttacking) {
            this.updateAttack(deltaTime);
        }
        // --- NEW: Process Railgun Charging State ---
        else if (this.isChargingRailgun) {
            this.updateRailgunCharge(deltaTime);
            this.processInput(); // Still allow movement/dash input while charging
        }
        // Process normal movement/other inputs
        else {
            this.processInput();
        }

        // // Temporarily adjust friction before parent update (Removed)
        // if (this.isRecoiling) {
        //     this.friction = this.recoilFriction;
        // } else {
        //     // Ensure friction is always the base value if recoil is removed
        //     this.friction = this.baseFriction || 0.85; // Use stored base or default
        // }
        // Ensure friction is set correctly (might have been missed if baseFriction wasn't initialized)
        this.friction = this.baseFriction || 0.85;

        // Call parent update for physics (updates this.x, this.y)
        super.update(deltaTime);

        // --- Update current tile coordinates AFTER position is updated ---
        this.updateCurrentTileCoords(); // Added call

        // Optional: Log current tile coordinates for debugging
        // console.log(`Player at Tile: ${this.currentTileX}, ${this.currentTileY}`);

// --- Speed Trail Effect ---
if (this.isMoving && this.speedBoostStacks > 0 && this.scene && typeof this.scene.createSpeedTrailEffect === 'function') {
    this.scene.createSpeedTrailEffect(this.x, this.y, this.speedBoostStacks, this.velocityX, this.velocityY);
}
        // Speed trail effect removed

        // --- NEW: Update Turret Destruction Logic ---
        this.updateTurretDestruction(deltaTime);

        // --- NEW: Update Turret Destruction Logic ---
        this.updateTurretDestruction(deltaTime);
    }

    processInput() {
        // Only process movement input if not dashing or doing melee attack
        // Allow movement while charging railgun
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

        // Apply movement speed (unless charging, maybe slow down?)
        // For now, allow full speed while charging
        this.velocityX = moveX * this.moveSpeed;
        this.velocityY = moveY * this.moveSpeed;

        // Update movement state
        this.isMoving = moveX !== 0 || moveY !== 0;

        // Track last movement direction for dash
        if (this.isMoving) {
            this.lastMoveDirection = { x: moveX, y: moveY };
            // Don't set state to 'moving' if charging, maybe a 'charging_moving' state?
            if (!this.isChargingRailgun) {
                 this.setState('moving');
            }
        } else {
             if (!this.isChargingRailgun) {
                this.setState('idle');
             }
        }

        // Dash with Space
        if (this.inputHandler.wasPressed('Space') && this.dashCooldownTimer <= 0) {
            // If charging, cancel charge? Or allow dash? Let's allow dash and cancel charge.
            if (this.isChargingRailgun) {
                this.cancelRailgunCharge();
            }
            this.startDash();
            return; // Don't process other actions if dashing
        }

        // --- NEW: Weapon Swap with E ---
        if (this.inputHandler.wasPressed('KeyE')) {
            this.swapWeapon();
        }

        // --- Action based on current weapon ---
        if (this.currentWeapon === 'melee') {
            // Melee Attack with Left Click
            if (this.inputHandler.wasLeftPointerPressed() && this.attackCooldownTimer <= 0 && !this.isAttacking) {
                 // Cannot attack if charging railgun (shouldn't happen if logic is right, but safety check)
                if (!this.isChargingRailgun) {
                    this.startAttack();
                }
            }
        } else if (this.currentWeapon === 'railgun') {
            // Railgun Charge/Fire with R
            if (this.inputHandler.isDown('KeyR') && this.railgunCooldownTimer <= 0 && !this.isChargingRailgun && !this.isDashing && !this.isAttacking) {
                // Start charging ONLY if not already charging and cooldown is ready
                this.startChargingRailgun();
            } else if (!this.inputHandler.isDown('KeyR') && this.isChargingRailgun) {
                // Fire when R key is released
                this.fireRailgun(); // fireRailgun will check charge level
            }
        }

        // Turret Destruction Input (handled in updateTurretDestruction)
        // We check input there to avoid interfering with other actions like dash/attack
    }

    // Turret Destruction Input (handled in updateTurretDestruction)
    // We check input there to avoid interfering with other actions like dash/attack

    // --- NEW: Weapon Swap Method ---
    swapWeapon() {
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
        this.currentWeapon = this.weapons[this.currentWeaponIndex];
        console.log(`Swapped weapon to: ${this.currentWeapon}`);
        // Cancel charge if swapping away from railgun while charging
        if (this.currentWeapon !== 'railgun' && this.isChargingRailgun) {
            this.cancelRailgunCharge();
        }
        // TODO: Update UI to show current weapon
    }

    // --- NEW: Railgun Methods ---
    startChargingRailgun() {
        if (this.railgunCooldownTimer <= 0) {
            this.isChargingRailgun = true;
            this.railgunChargeTimer = 0;
            this.setState('charging'); // Add a new state for visual feedback
            console.log("Charging railgun...");
            // Maybe slow down player while charging?
            // this.velocityX *= 0.5;
            // this.velocityY *= 0.5;
        }
    }

    updateRailgunCharge(deltaTime) {
        if (!this.isChargingRailgun) return;

        this.railgunChargeTimer += deltaTime;
        const wasMaxCharged = this.isRailgunMaxCharged; // Store previous state
        this.isRailgunMaxCharged = this.railgunChargeTimer >= this.railgunChargeTime;

        // --- NEW: Screen Shake at Max Charge ---
        if (this.isRailgunMaxCharged && !wasMaxCharged) {
            // Just reached max charge, start shaking
            if (this.scene && typeof this.scene.startContinuousShake === 'function') {
                // --- REDUCED SHAKE INTENSITY ---
                this.scene.startContinuousShake(0.003); // Reduced intensity from 0.005
            }
        } else if (!this.isRailgunMaxCharged && wasMaxCharged) {
             // No longer max charged (shouldn't happen normally while holding, but safety)
             if (this.scene && typeof this.scene.stopContinuousShake === 'function') {
                this.scene.stopContinuousShake();
            }
        }
        // --- End Screen Shake Logic ---

        // This block was duplicated, removing the second instance.
        // The first instance starting around line 300 handles this logic correctly.

        // Optional: Add visual feedback for charge level
        // console.log(`Charging: ${((this.railgunChargeTimer / this.railgunChargeTime) * 100).toFixed(0)}%`);

        // Prevent movement input from overriding charge state visually
        if (this.isMoving) {
             this.setState('charging_moving'); // Or similar state
        } else {
             this.setState('charging');
        }

        // Prevent velocity from being reset if moving while charging
        // The velocity calculation is now inside processInput, which is called even during charge
    }

    fireRailgun() {
        if (!this.isChargingRailgun) return; // Should not happen, but safety check

        const chargeRatio = Math.min(this.railgunChargeTimer / this.railgunChargeTime, 1.0);
        const minChargeToFire = 0.1; // Lower minimum charge threshold (was 0.2)

        console.log(`Attempting to fire railgun. Charge ratio: ${chargeRatio.toFixed(2)}`);

        // --- Stop Screen Shake ---
        if (this.isRailgunMaxCharged) {
             if (this.scene && typeof this.scene.stopContinuousShake === 'function') {
                this.scene.stopContinuousShake();
            }
        }
        // --- End Stop Screen Shake ---


        if (chargeRatio >= minChargeToFire) {
            // --- Calculate Damage Based on Charge ---
            const damage = this.railgunMinDamage + (this.railgunMaxDamage - this.railgunMinDamage) * chargeRatio;
            console.log(`Firing railgun! (Charge: ${(chargeRatio * 100).toFixed(0)}%, Damage: ${damage.toFixed(0)})`);
            // --- End Damage Calculation ---

            this.railgunCooldownTimer = this.railgunCooldown; // Set cooldown

            // Create and launch projectile
            if (this.scene && typeof this.scene.createRailgunProjectile === 'function') {
                this.scene.createRailgunProjectile(
                    this.x,
                    this.y,
                    this.direction.x, // Use aim direction
                    this.direction.y,
                    damage, // Pass calculated damage
                    this.railgunProjectileSpeed,
                    chargeRatio // Pass charge ratio for potential effects (e.g., beam width/intensity)
                );

                // --- Recoil Removed ---
                // const recoilForceBase = 4000;
                // const recoilForce = recoilForceBase * (0.1 + chargeRatio * 2.0);
                // const recoilDirectionX = -this.direction.x;
                // const recoilDirectionY = -this.direction.y;
                // this.velocityX += recoilDirectionX * recoilForce;
                // this.velocityY += recoilDirectionY * recoilForce;
                // this.isRecoiling = true;
                // this.recoilTimer = this.recoilDuration;
                // console.log(`Applied recoil with force: ${recoilForce.toFixed(0)}, starting recoil state.`);
                // --- End Recoil ---

            } else {
                console.error("Scene or createRailgunProjectile method not found!");
            }

            // TODO: Add firing sound effect
            // TODO: Add visual effect (muzzle flash, recoil?)

        } else {
            console.log("Railgun fizzled - not enough charge.");
            // Optional: Play a fizzle sound
        }

        // Reset charging state regardless of firing success
        this.cancelRailgunCharge();
    }

     cancelRailgunCharge() {
         if (!this.isChargingRailgun) return;

         // --- Stop Screen Shake if cancelling ---
         if (this.isRailgunMaxCharged) {
             if (this.scene && typeof this.scene.stopContinuousShake === 'function') {
                this.scene.stopContinuousShake();
            }
         }
         // --- End Stop Screen Shake ---

         this.isChargingRailgun = false;
         this.railgunChargeTimer = 0;
         this.isRailgunMaxCharged = false; // Reset max charge flag
         this.setState(this.isMoving ? 'moving' : 'idle'); // Revert to appropriate state
         console.log("Railgun charge cancelled.");
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
    
    // Create a visual dash trail effect
    createDashTrail() {
        // Placeholder - could use a different particle effect than the speed trail
        if (this.scene && this.scene.createDashTrailEffect) {
            this.scene.createDashTrailEffect(this.x, this.y);
        }
    }

    // Speed trail logic removed

    // Modify startAttack to only work for melee
    startAttack() {
        if (this.currentWeapon !== 'melee') return; // Only melee weapon uses this

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

    // --- Plasma Collection ---
    if (otherEntity?.type === 'plasma') {
        console.log(`Player collided with Plasma ${otherEntity.id}`);
        // Call the plasma's collect method
        otherEntity.collect(this);
        // The plasma's collect method will handle updating the player's plasmaCount
        return; // Stop further collision handling for this item
    }

    // Powerup collection logic removed

    // --- Lunge Attack Collision ---
    if (this.isAttacking) {
        console.log(`Player attacking, collided with: ${otherEntity?.id} (Type: ${otherEntity?.type})`);
        // Check if the other entity is any type of enemy
        if (otherEntity?.type === 'enemy' || otherEntity?.type === 'ranged_enemy' || otherEntity?.type === 'engineer' || otherEntity?.type === 'drone_enemy') { // Added 'drone_enemy'
             console.log(`>>> Enemy collision detected during attack! Applying effects to ${otherEntity.id}`);
             // Ensure enemy is not already dead AND hasn't been hit by this attack yet
             if (otherEntity.state !== 'dead' && !this.enemiesHitThisAttack.has(otherEntity.id)) {
                // --- Apply First Hit ---
                otherEntity.takeDamage(this.baseAttackPower);
                this.enemiesHitThisAttack.add(otherEntity.id); // Mark as hit for this lunge

                // Apply knockback
                const knockbackForce = 800;
                const knockbackDirectionX = otherEntity.x - this.x;
                const knockbackDirectionY = otherEntity.y - this.y;
                if (this.scene) {
                    this.scene.applyEnhancedKnockback(otherEntity, knockbackDirectionX, knockbackDirectionY, knockbackForce);
                }

                // Apply stun
                const stunDuration = 0.8;
                otherEntity.stun(stunDuration);

                // Create standard impact effect
                if (this.scene && this.scene.createImpactEffect) {
                    this.scene.createImpactEffect(otherEntity.x, otherEntity.y, 1);
                }

                // Trigger camera shake
                if (this.scene && this.scene.cameras && this.scene.cameras.main) {
                    this.scene.cameras.main.shake(100, 0.01);
                }

                // Apply standard hit-stop
                if (this.scene && this.scene.applyHitStop) {
                    this.scene.applyHitStop(this, otherEntity, this.baseAttackPower, 1);
                } else {
                    // Fallback hit-stop
                    if (this.scene) {
                        const playerVelX = this.velocityX;
                        const playerVelY = this.velocityY;
                        this.velocityX = 0; this.velocityY = 0;
                        otherEntity.velocityX = 0; otherEntity.velocityY = 0;
                        this.scene.time.delayedCall(80, () => {
                            this.velocityX = playerVelX * 0.7; this.velocityY = playerVelY * 0.7;
                        });
                    }
                }

                // // --- Apply Bleeding --- (Removed)
                // const bleedStacks = this.bleedingStacks || 0;
                // if (bleedStacks > 0 && typeof otherEntity.applyBleed === 'function') {
                //     const baseBleedDPS = 5;
                //     const bleedDPSPerStack = 2;
                //     const maxStacks = 5;
                //     const actualStacks = Math.min(bleedStacks, maxStacks);
                //     const totalBleedDPS = baseBleedDPS + (actualStacks * bleedDPSPerStack);
                //     const bleedDuration = 3; // seconds
                //
                //     console.log(`Applying Bleed: ${totalBleedDPS.toFixed(1)} DPS for ${bleedDuration}s (Stacks: ${actualStacks})`);
                //     otherEntity.applyBleed(totalBleedDPS, bleedDuration);
                // }
             }
        }
    }
}

// --- New method to update tile coordinates ---
updateCurrentTileCoords() {
    if (this.worldManager) {
        const { tileX, tileY } = this.worldManager.worldToTileCoords(this.x, this.y);
        // Check if tile coordinates actually changed to avoid unnecessary updates
        if (tileX !== this.currentTileX || tileY !== this.currentTileY) {
             this.currentTileX = tileX;
             this.currentTileY = tileY;
             // console.log(`Player entered Tile: ${this.currentTileX}, ${this.currentTileY}`); // Debug log
             // You could potentially trigger events here if the player enters a new tile
        }
    }
}

    /**
     * Updates the player's movement speed based on the number of active speed boost stacks.
     * Also recalculates dependent speeds like dash and lunge.
     * @param {number} stacks - The number of active speed boost stacks.
     */
    updateSpeed(stacks) {
        const speedBoostPerStack = 0.05; // 5% increase per stack
        const maxStacks = 15; // Maximum number of stacks allowed
        const actualStacks = Math.min(stacks, maxStacks); // Clamp stacks to the maximum
        this.speedBoostStacks = actualStacks; // Store the actual stacks for visual effects

        const speedMultiplier = 1 + (actualStacks * speedBoostPerStack);
        this.moveSpeed = this.baseMoveSpeed * speedMultiplier;

        // Recalculate dependent speeds
        this.dashSpeed = this.moveSpeed * 6;
        this.lungeSpeed = this.moveSpeed * 3;

        // console.log(`Updated speed. Stacks: ${this.speedBoostStacks}, Multiplier: ${speedMultiplier.toFixed(2)}, MoveSpeed: ${this.moveSpeed.toFixed(2)}`); // Debug log
    }
 
    // /** // Removed updateDamage method
    //  * Updates the player's projectile damage based on damage boost stacks.
    //  * @param {number} stacks - The number of active damage boost stacks.
    //  */
    // updateDamage(stacks) {
    //     const damageBoostPerStack = 0.10; // 10% increase per stack
    //     const maxStacks = 5; // Maximum number of stacks allowed
    //     const actualStacks = Math.min(stacks, maxStacks); // Clamp stacks to the maximum
    //     this.damageBoostStacks = actualStacks; // Store the stack count
 
    //     const damageMultiplier = 1 + (actualStacks * damageBoostPerStack);
    //     this.currentProjectileDamage = this.baseProjectileDamage * damageMultiplier;
 
    //     // console.log(`Updated damage. Stacks: ${actualStacks}, Multiplier: ${damageMultiplier.toFixed(2)}, Damage: ${this.currentProjectileDamage.toFixed(2)}`); // Debug log
    // }
 
    // /** // Removed updateFireRate method
    //  * Updates the player's fire rate (delay between shots) based on fire rate boost stacks.
    //  * @param {number} stacks - The number of active fire rate boost stacks.
    //  */
    // updateFireRate(stacks) {
    //     const fireRateIncreasePerStack = 0.08; // 8% increase in rate per stack (means lower delay)
    //     const maxStacks = 5; // Maximum number of stacks allowed
    //     const actualStacks = Math.min(stacks, maxStacks); // Clamp stacks to the maximum
    //     this.fireRateBoostStacks = actualStacks; // Store the stack count
 
    //     // Calculate the multiplier for the delay (inverse of rate increase)
    //     const delayMultiplier = 1 / (1 + (actualStacks * fireRateIncreasePerStack));
    //     this.currentFireRateDelay = this.baseFireRateDelay * delayMultiplier;
 
    //     // console.log(`Updated fire rate. Stacks: ${actualStacks}, Delay Multiplier: ${delayMultiplier.toFixed(3)}, Delay: ${this.currentFireRateDelay.toFixed(3)}s`); // Debug log
    // }
 
    /**
     * Updates the player's maximum health based on health increase stacks.
     * Also increases current health proportionally.
     * @param {number} stacks - The number of active health increase stacks.
     */
    updateMaxHealth(stacks) {
        const healthIncreasePerStack = 20;
        const maxStacks = 5; // Maximum number of stacks allowed
        const actualStacks = Math.min(stacks, maxStacks); // Clamp stacks to the maximum
        this.healthIncreaseStacks = actualStacks; // Store the stack count
 
        const healthIncrease = actualStacks * healthIncreasePerStack;
        const newMaxHealth = this.baseMaxHealth + healthIncrease;
 
        // Calculate how much the max health actually changed in this update
        const maxHealthDifference = newMaxHealth - this.maxHealth;
 
        this.maxHealth = newMaxHealth;
 
        // Increase current health by the same amount the max health increased,
        // but don't exceed the new max health.
        if (maxHealthDifference > 0) {
            this.health = Math.min(this.health + maxHealthDifference, this.maxHealth);
        }
 
        // console.log(`Updated max health. Stacks: ${actualStacks}, Increase: ${healthIncrease}, MaxHealth: ${this.maxHealth}, CurrentHealth: ${this.health}`); // Debug log
 
        // Notify the UI to update the health bar display
        if (this.scene && this.scene.uiManager && typeof this.scene.uiManager.updateHealthBar === 'function') {
            this.scene.uiManager.updateHealthBar(this.health, this.maxHealth);
        } else {
            // console.warn("Could not update UI health bar - scene.uiManager.updateHealthBar not found.");
        }
    }

// Powerup management methods (addPowerup, calculateCurrentStats) removed.
// Player now uses base stats directly, updated via methods like updateSpeed.
// Dependent speeds (dashSpeed, lungeSpeed) are initialized in the constructor based on baseMoveSpeed.

// Visual effect for double hit (damage powerup) removed

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
        super.onDeath(); // Sets state to 'dead'
        console.log("Player has died!");

        // Stop all movement and actions
        this.velocityX = 0;
        this.velocityY = 0;
        this.isDashing = false;
        this.isAttacking = false;
        this.isMoving = false; // Ensure movement state is also reset

        // Disable further updates/input processing within the player itself
        // The 'dead' state check in update() already handles this partially

        // TODO: Play death animation if available
        // this.playAnimation('death'); // Example

        // Notify the scene about the player's death
        if (this.scene && typeof this.scene.handlePlayerDeath === 'function') {
            // Notify the scene immediately
            this.scene.handlePlayerDeath();
        } else {
            console.warn("Player died, but scene or handlePlayerDeath method not found.");
        }

        // Note: Respawn logic will be handled by the GameScreen scene
    }

    // Clean up when player is destroyed
    destroy() {
        // Removed window event listeners - they are no longer added
        // Trail particle cleanup removed

        // Destroy the powerup manager
        if (this.powerupManager) {
            this.powerupManager.destroy();
            this.powerupManager = null;
        }

        super.destroy();
    }

    // --- NEW: Turret Destruction Logic ---
    updateTurretDestruction(deltaTime) {
        // Don't process if dashing, attacking, or dead
        if (this.isDashing || this.isAttacking || this.state === 'dead') {
            this.resetTurretDestruction();
            return;
        }

        // Check if 'B' key is held down
        if (this.inputHandler.isDown('KeyB')) {
            // Find the closest turret within range
            let closestTurret = null;
            let minDistanceSq = this.turretDestroyRange * this.turretDestroyRange;

            if (this.scene && this.scene.enemies) {
                for (const enemy of this.scene.enemies) {
                    // Check if it's a TurretEnemy and alive
                    if (enemy.constructor.name === 'TurretEnemy' && enemy.state !== 'dead') {
                        const dx = enemy.x - this.x;
                        const dy = enemy.y - this.y;
                        const distanceSq = dx * dx + dy * dy;

                        if (distanceSq < minDistanceSq) {
                            minDistanceSq = distanceSq;
                            closestTurret = enemy;
                        }
                    }
                }
            }

            // If a turret is in range
            if (closestTurret) {
                // If it's a different turret than before, reset timer
                if (this.nearbyTurret !== closestTurret) {
                    this.resetTurretDestruction();
                    this.nearbyTurret = closestTurret;
                    console.log(`Player started interacting with Turret ${this.nearbyTurret.id}`);
                    // --- NEW: Show visual indicator ---
                    if (typeof this.nearbyTurret.showDestructionIndicator === 'function') {
                        this.nearbyTurret.showDestructionIndicator();
                    }
                }

                // Increment timer
                this.turretDestroyTimer += deltaTime;
                // --- NEW: Update visual indicator ---
                if (typeof this.nearbyTurret.updateDestructionIndicator === 'function') {
                    const progress = Math.min(this.turretDestroyTimer / this.turretDestroyHoldTime, 1.0);
                    this.nearbyTurret.updateDestructionIndicator(progress);
                }

                // Check if hold time is reached
                if (this.turretDestroyTimer >= this.turretDestroyHoldTime) {
                    console.log(`Player destroyed Turret ${this.nearbyTurret.id}`);
                    if (typeof this.nearbyTurret.destroyTurret === 'function') {
                        this.nearbyTurret.destroyTurret(); // Call the turret's destruction method
                    } else {
                        // Fallback: Call generic destroy or onDeath if specific method doesn't exist
                        if (typeof this.nearbyTurret.destroy === 'function') {
                            this.nearbyTurret.destroy();
                        } else if (typeof this.nearbyTurret.onDeath === 'function') {
                            this.nearbyTurret.onDeath();
                        }
                    }
                    this.resetTurretDestruction(); // Reset after destruction
                    // TODO: Add visual effect for destruction completion
                }
            } else {
                // No turret in range, reset
                this.resetTurretDestruction();
            }
        } else {
            // 'B' key not held, reset
            this.resetTurretDestruction();
        }
    }

    resetTurretDestruction() {
        if (this.nearbyTurret) {
            console.log(`Player stopped interacting with Turret ${this.nearbyTurret.id}`);
            // --- NEW: Hide visual indicator ---
            if (typeof this.nearbyTurret.hideDestructionIndicator === 'function') {
                this.nearbyTurret.hideDestructionIndicator();
            }
        }
        this.turretDestroyTimer = 0;
        this.nearbyTurret = null;
    }
}