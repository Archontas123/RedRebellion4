import { Enemy } from './Enemy.js';
import { DroneEnemy } from './DroneEnemy.js'; // Import the DroneEnemy
import { TurretEnemy } from './TurretEnemy.js'; // Import the TurretEnemy
import { Projectile } from './Projectile.js'; // Import the Projectile class
export class EngineerEnemy extends Enemy {
    constructor(x, y, options = {}) {
        const engineerOptions = {
            type: 'engineer',
            maxHealth: 2000, // Increased from 500
            friction: 0.95,
            collisionBounds: { x: 0, y: 0, width: 80, height: 80 },
            moveSpeed: 60,
            damageAmount: 0,
            color: '#FFFF00',
            spritePath: 'assets/engineer.png', // Added sprite path
            // size: 80, // Size will be determined by sprite
            ...options,
            scene: options.scene,
        };

        super(x, y, engineerOptions);

        // Tunneling properties
        this.tunnelRange = 150;
        this.tunnelCooldown = 20.0; // Increased to 20s
        // Durations removed - disappear/reappear is instant
        this.tunnelDuration = 0.75; // Total time spent underground (invisible, non-collidable)
        this.tunnelMinDistance = 300;
        this.tunnelMaxDistance = 600;
        this.tunnelPlayerAvoidRadius = 200;

        this.tunnelCooldownTimer = 0;
        this.tunnelPhaseTimer = 0; // Timer for the current tunneling phase
        this.targetTunnelX = 0;
        this.targetTunnelY = 0;
        this.startX = 0; // Store starting position for trail
        this.startY = 0;
        this.tunnelTrailTimer = 0; // Timer for trail particle emission
        this.tunnelTrailInterval = 0.03; // Emit trail particle every 30ms (more frequent)

        // Visual effect properties
        // Removed scale, shake, rotation properties for tunneling effect

        // Ensure initial state is set correctly
        if (!this.state) {
            this.setState('idle');
        }
        this.collidable = true;

        // Turret spawning properties
        this.turretSpawnCooldown = 8.0; // Time between potential turret spawns (seconds) - Reduced
        this.turretSpawnCooldownTimer = Math.random() * this.turretSpawnCooldown; // Start with random cooldown
        this.turretSpawnChance = 0.75; // 75% chance to spawn a turret after tunneling - Increased
        this.visible = true;
        this.hasSpawnedDrones = false; // Flag to prevent multiple spawns

        // Machine Gun properties
        this.shootRange = 700; // Range of the machine guns
        this.fireRate = 5; // Shots per second (per gun, so 10 total)
        this.fireCooldown = 1.0 / this.fireRate; // Time between shots for one gun
        this.fireCooldownTimer = 0; // Timer for the next shot
        this.projectileSpeed = 500;
        this.projectileDamage = 2; // Reduced from 5
        this.gunOffset = 35; // Distance from center for each gun
        this.nextGun = 0; // 0 for left, 1 for right
        // Reload properties
        this.clipSize = 30;
        this.ammoCount = this.clipSize;
        this.reloadTime = 4.0; // seconds (Increased from 2.0)
        this.reloadTimer = 0;
        this.isReloading = false;

        console.log(`EngineerEnemy created at (${x}, ${y})`);
        // console.log(`Tunneling Params: Range=${this.tunnelRange}, Cooldown=${this.tunnelCooldown}, Down=${this.tunnelDownDuration}, Under=${this.tunnelDuration}, Up=${this.tunnelUpDuration}`); // Less verbose logging
    }

    update(deltaTime, worldContext) {
        // Update cooldown timer always
        if (this.tunnelCooldownTimer > 0) {
            this.tunnelCooldownTimer -= deltaTime;
            if (this.tunnelCooldownTimer < 0) this.tunnelCooldownTimer = 0;
        }

        // Update turret spawn cooldown timer always
        if (this.turretSpawnCooldownTimer > 0) {
            this.turretSpawnCooldownTimer -= deltaTime;
            if (this.turretSpawnCooldownTimer < 0) this.turretSpawnCooldownTimer = 0;
        }

        // Update fire cooldown timer
        if (this.fireCooldownTimer > 0) {
            this.fireCooldownTimer -= deltaTime;
            if (this.fireCooldownTimer < 0) this.fireCooldownTimer = 0;
        }

        // Update reload timer
        if (this.isReloading) {
            this.reloadTimer -= deltaTime;
            if (this.reloadTimer <= 0) {
                this.isReloading = false;
                this.ammoCount = this.clipSize;
                this.reloadTimer = 0;
                console.log(`Engineer ${this.id} finished reloading.`);
            }
        }

        // Removed shake reset

        // --- Handle Tunneling States ---
        // Removed tunneling_down state logic
        if (this.state === 'tunneling_underground') { // Changed else if to if
            this.tunnelPhaseTimer -= deltaTime;
            this.tunnelTrailTimer -= deltaTime;

            // Calculate progress (0 = start, 1 = end)
            const undergroundProgress = 1 - Math.max(0, this.tunnelPhaseTimer / this.tunnelDuration);

            // Emit trail particles periodically
            if (this.tunnelTrailTimer <= 0 && this.scene && typeof this.scene.createTunnelTrailParticle === 'function') {
                this.tunnelTrailTimer = this.tunnelTrailInterval;

                // Interpolate position along the path
                const trailX = this.startX + (this.targetTunnelX - this.startX) * undergroundProgress;
                const trailY = this.startY + (this.targetTunnelY - this.startY) * undergroundProgress;

                this.scene.createTunnelTrailParticle(trailX, trailY);
            }


            if (this.tunnelPhaseTimer <= 0) {
                // Reappear instantly at target
                this.x = this.targetTunnelX;
                this.y = this.targetTunnelY;
                this.visible = true;
                this.collidable = true;

                // Create explosion effect on reappear
                if (this.scene && typeof this.scene.createTunnelExplosion === 'function') {
                    this.scene.createTunnelExplosion(this.x, this.y);
                    if (typeof this.scene.createShockwaveEffect === 'function') {
                        this.scene.createShockwaveEffect(this.x, this.y);
                    }
                }

                // --- Attempt to Spawn Turret ---
                if (this.turretSpawnCooldownTimer <= 0 && Math.random() < this.turretSpawnChance) {
                    this.spawnTurrets(); // Call the plural version
                    this.turretSpawnCooldownTimer = this.turretSpawnCooldown; // Reset cooldown
                }
                this.setState('idle'); // Go directly to idle
                console.log(`Engineer ${this.id} reappeared at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
            } else {
                 return; // Skip parent update (still underground)
            }
            // If we reached here, the timer is <= 0 and we reappeared, so don't skip parent update
        }
        // --- End Tunneling States ---

        // If not tunneling, check for shooting opportunity (and not reloading)
        if (this.state !== 'tunneling_underground' && this.state !== 'stunned' && this.state !== 'dead' && this.targetPlayer && !this.isReloading) {
            const dx = this.targetPlayer.x - this.x;
            const dy = this.targetPlayer.y - this.y;
            const distanceSq = dx * dx + dy * dy;

            // Check range, cooldown, and ammo
            if (distanceSq <= this.shootRange * this.shootRange && this.fireCooldownTimer <= 0 && this.ammoCount > 0) {
                this.shoot(dx, dy, distanceSq); // Pass direction info
                this.fireCooldownTimer = this.fireCooldown; // Reset fire cooldown
            }
        }

        // Reset visual state if somehow exited tunneling abnormally
        if (this.state !== 'tunneling_underground') {
             this.visible = true;
             this.collidable = true;
        }


        // Run standard update logic (handles movement, separation, etc.)
        super.update(deltaTime, worldContext);
    }

    // PursuePlayer modified to prevent tunneling while reloading
    pursuePlayer(deltaTime) {
        const canTunnel = this.state !== 'stunned' && this.state !== 'dead' &&
                          this.state !== 'tunneling_underground' &&
                          !this.isReloading; // Cannot tunnel while reloading

        if (!this.targetPlayer || !canTunnel) {
             if (this.state === 'pursuing') {
                 super.pursuePlayer(deltaTime);
             }
            return;
        }

        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distanceSq = dx * dx + dy * dy;
        const tunnelRangeSq = this.tunnelRange * this.tunnelRange;

        if (canTunnel && distanceSq <= tunnelRangeSq && this.tunnelCooldownTimer <= 0) {
            this.startTunneling();
            return;
        }

        super.pursuePlayer(deltaTime);
    }

    startTunneling() {
        const dx = this.targetPlayer ? this.targetPlayer.x - this.x : 0;
        const dy = this.targetPlayer ? this.targetPlayer.y - this.y : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        console.log(`Engineer ${this.id} initiating tunnel. Player distance: ${dist.toFixed(0)}`);

        // --- Start Tunneling ---
        console.log(`Engineer ${this.id} starting tunnel from (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);

        // Create explosion effect on disappear
        if (this.scene && typeof this.scene.createTunnelExplosion === 'function') {
            this.scene.createTunnelExplosion(this.x, this.y);
            if (typeof this.scene.createShockwaveEffect === 'function') {
                this.scene.createShockwaveEffect(this.x, this.y);
            }
        }

        // Go underground
        this.setState('tunneling_underground');
        this.startX = this.x; // Store starting position for trail
        this.startY = this.y;
        this.tunnelTrailTimer = 0; // Reset trail timer
        this.tunnelPhaseTimer = this.tunnelDuration; // Set timer for underground phase
        this.tunnelCooldownTimer = this.tunnelCooldown;
        this.visible = false; // Become invisible *after* explosion starts
        this.collidable = false; // Instantly non-collidable
        this.velocityX = 0; // Stop movement
        this.velocityY = 0;

        // Find target position
        let targetPos = null;
        if (this.scene && this.scene.worldManager && typeof this.scene.worldManager.findRandomValidPositionNear === 'function') {
            targetPos = this.scene.worldManager.findRandomValidPositionNear(
                this.x, this.y,
                this.tunnelMinDistance, this.tunnelMaxDistance,
                this.targetPlayer.x, this.targetPlayer.y, this.tunnelPlayerAvoidRadius
            );
        }
        if (targetPos) {
            this.targetTunnelX = targetPos.x;
            this.targetTunnelY = targetPos.y;
            console.log(`Engineer ${this.id} target tunnel position: (${this.targetTunnelX.toFixed(0)}, ${this.targetTunnelY.toFixed(0)})`);
        } else {
            console.warn(`Engineer ${this.id}: Could not find valid tunnel position. Using fallback.`);
            const fallbackAngle = Math.random() * Math.PI * 2;
            this.targetTunnelX = this.x + Math.cos(fallbackAngle) * this.tunnelMinDistance;
            this.targetTunnelY = this.y + Math.sin(fallbackAngle) * this.tunnelMinDistance;
        }

        // Removed dust effect call here, using explosion effect instead
    }

    shoot(targetDx, targetDy, targetDistanceSq) {
        // Ensure scene, method, and ammo exist
        if (!this.targetPlayer || !this.scene || typeof this.scene.createProjectile !== 'function' || this.ammoCount <= 0 || this.isReloading) {
            console.warn(`Engineer ${this.id}: Cannot shoot - missing target/scene/method, out of ammo, or reloading.`);
            return;
        }

        // Calculate normalized direction vector
        const distance = Math.sqrt(targetDistanceSq);
        const dirX = distance > 0 ? targetDx / distance : 1; // Default to right if distance is 0
        const dirY = distance > 0 ? targetDy / distance : 0;
        const direction = { x: dirX, y: dirY }; // Pass direction as an object

        // Calculate perpendicular vector for gun offset
        const perpX = -dirY;
        const perpY = dirX;

        // Determine which gun offset to use
        const offsetX = perpX * this.gunOffset * (this.nextGun === 0 ? -1 : 1);
        const offsetY = perpY * this.gunOffset * (this.nextGun === 0 ? -1 : 1);

        // Calculate spawn position
        const spawnX = this.x + offsetX;
        const spawnY = this.y + offsetY;

        // Call the scene's method to create the projectile (handles logic and visual)
        this.scene.createProjectile(
            spawnX,
            spawnY,
            direction, // Pass direction object
            this.projectileSpeed,
            this.projectileDamage,
            this.id, // Owner ID
            'enemy_projectile' // Type
            // Note: GameScreen.createProjectile doesn't currently use color, size, piercing, duration from here
        );

        this.ammoCount--; // Decrement ammo

        // Switch to the other gun for the next shot
        this.nextGun = 1 - this.nextGun;

        // Check if out of ammo and start reload
        if (this.ammoCount <= 0) {
            this.isReloading = true;
            this.reloadTimer = this.reloadTime;
            console.log(`Engineer ${this.id} started reloading (${this.reloadTime}s).`);
        }
    }

    // HandleCollision remains the same
    handleCollision(otherEntity) {
        // Only process collisions if collidable
        if (!this.collidable) return;

        // Prevent the Engineer from dealing melee damage by NOT calling super if it's the player.
        // Let the parent handle other collisions (like projectiles).
        if (otherEntity.type !== 'player') {
            super.handleCollision(otherEntity);
        }
        // If otherEntity IS the player, do nothing here. The player's collision logic will handle hitting the enemy.
    }
// Override takeDamage to check for drone spawning condition
takeDamage(amount) {
   const oldHealth = this.health;
   super.takeDamage(amount); // Apply damage first

   // Check if health dropped below 50% and drones haven't spawned yet
   if (this.state !== 'dead' && !this.hasSpawnedDrones && this.health <= this.maxHealth / 2) {
       this.spawnDrones();
       this.hasSpawnedDrones = true; // Set flag to prevent respawning
   }
}

spawnDrones() {
   console.log(`Engineer ${this.id} health below 50% (${this.health}/${this.maxHealth}), spawning drones!`);
   const numberOfDrones = 4 + Math.floor(Math.random() * 3); // Spawn 4-6 drones

   // Check if the scene and the enemies array exist
   if (!this.scene || !Array.isArray(this.scene.enemies)) {
       console.error(`Engineer ${this.id}: Cannot spawn drones - scene or scene.enemies array not available.`);
       return;
   }

   for (let i = 0; i < numberOfDrones; i++) {
       // Spawn drones in a small radius around the engineer
       const angle = (i / numberOfDrones) * Math.PI * 2 + (Math.random() * 0.5 - 0.25); // Spread them out slightly randomly
       const spawnDist = 50 + Math.random() * 20; // Spawn 50-70 pixels away
       const spawnX = this.x + Math.cos(angle) * spawnDist;
       const spawnY = this.y + Math.sin(angle) * spawnDist;

       const newDrone = new DroneEnemy(spawnX, spawnY, { scene: this.scene });
       // Directly add the drone to the scene's enemy array
       this.scene.enemies.push(newDrone);
       console.log(` -> Spawned Drone ${newDrone.id} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
   }
}

// Method to spawn multiple turrets
spawnTurrets() {
    const numTurrets = 3 + Math.floor(Math.random() * 3); // Spawn 3-5 turrets
    console.log(`Engineer ${this.id} attempting to spawn ${numTurrets} turrets.`);

    // Check if the scene and the enemies array exist
    if (!this.scene || !Array.isArray(this.scene.enemies)) {
        console.error(`Engineer ${this.id}: Cannot spawn turrets - scene or scene.enemies array not available.`);
        return;
    }

    const baseSpawnDist = 150; // Base distance from engineer
    const randomDistOffset = 100; // Random additional distance

    for (let i = 0; i < numTurrets; i++) {
        // Spread them out in a circle, with some randomness
        const angle = (i / numTurrets) * Math.PI * 2 + (Math.random() * 0.6 - 0.3); // Add +/- 0.3 radians randomness
        const spawnDist = baseSpawnDist + Math.random() * randomDistOffset; // Spawn 150-250 pixels away

        const spawnX = this.x + Math.cos(angle) * spawnDist;
        const spawnY = this.y + Math.sin(angle) * spawnDist;

        // TODO: Optionally add a check here to ensure spawnX, spawnY is a valid location using worldManager

        const newTurret = new TurretEnemy(spawnX, spawnY, { scene: this.scene });
        // Directly add the turret to the scene's enemy array
        this.scene.enemies.push(newTurret);
        console.log(` -> Spawned Turret ${newTurret.id} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
    }
}
 
// OnDeath remains the same
onDeath() {
    // Reset visibility/collision if died while tunneling
    if (this.state === 'tunneling_underground') {
        this.visible = true;
        this.collidable = true;
        console.log(`Engineer ${this.id} died while tunneling underground. Resetting state.`);
    }

    super.onDeath();
    console.log(`EngineerEnemy ${this.id} has been defeated!`);

    if (this.scene && typeof this.scene.createExplosion === 'function') {
        this.scene.createExplosion(this.x, this.y, this.size * 1.5, { color: this.color });
    }

    const dropChance = 0.50;
     if (Math.random() < dropChance) {
         if (this.scene && this.scene.powerupManager) {
             console.log(`EngineerEnemy ${this.id} dropping powerup at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
             this.scene.powerupManager.spawnPowerup(this.x, this.y);
         } else {
             console.warn(`EngineerEnemy ${this.id}: Cannot drop powerup - scene or powerupManager not found.`);
         }
     }
}

    // SetState needs to reset visual effects when exiting tunneling states
    setState(newState) {
        const oldState = this.state;
        if (oldState !== newState) {
            // console.log(`Engineer ${this.id} changing state from ${oldState} to ${newState}`); // Re-commented original log
            this.state = newState;

            // Reset visual state if exiting tunneling state
            const exitingTunnel = (oldState === 'tunneling_underground');
            const enteringNonTunnel = (newState !== 'tunneling_underground');

            if (exitingTunnel && enteringNonTunnel) {
                 this.collidable = true;
                 this.visible = true;
            }
        }
    }

    // Removed draw override - rely on parent Entity draw method

    // Removed size property as it's derived from sprite now

    /**
     * Override the parent stun method to make the Engineer immune to stuns.
     * @param {number} duration - The duration the stun would normally last.
     */
    stun(duration) {
        // Do nothing, Engineer cannot be stunned.
        // console.log(`Engineer ${this.id} ignored stun attempt.`); // Optional: for debugging
    }
}
