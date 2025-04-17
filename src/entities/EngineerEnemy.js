import { Enemy } from './Enemy.js';
import { DroneEnemy } from './DroneEnemy.js'; // Import the DroneEnemy
import { TurretEnemy } from './TurretEnemy.js'; // Import the TurretEnemy
import { DynamiteProjectile } from './DynamiteProjectile.js'; // Import the new DynamiteProjectile

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
            size: 80,
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
        // Drone spawning properties
        this.hasSpawnedDrones = false;

        // --- Dynamite Tossing Properties ---
        this.dynamiteCooldown = 4.0; // Time between dynamite throws (seconds) - Reduced
        this.dynamiteCooldownTimer = Math.random() * this.dynamiteCooldown; // Start with random cooldown
        this.dynamiteThrowRangeMin = 200; // Minimum distance to throw
        this.dynamiteThrowRangeMax = 500; // Maximum distance to throw
        this.dynamiteFuseTime = 2.0; // Seconds until dynamite explodes - Reduced
        this.dynamiteDamage = 450; // Damage on explosion - Increased
        this.dynamiteExplosionRadius = 150; // Radius of explosion - Increased
        this.dynamiteThrowSpeed = 450; // Initial speed of the thrown dynamite

        // Ensure initial state is set correctly
        if (!this.state) {
            this.setState('idle');
        }
        this.collidable = true;
        this.visible = true;

        console.log(`EngineerEnemy created at (${x}, ${y})`);
        // console.log(`Tunneling Params: Range=${this.tunnelRange}, Cooldown=${this.tunnelCooldown}, Down=${this.tunnelDownDuration}, Under=${this.tunnelDuration}, Up=${this.tunnelUpDuration}`); // Old log
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
        if (this.dynamiteCooldownTimer > 0) { // Update dynamite cooldown
            this.dynamiteCooldownTimer -= deltaTime;
            if (this.dynamiteCooldownTimer < 0) this.dynamiteCooldownTimer = 0;
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

        // If not tunneling, ensure scale is 1 and no shake
        this.visible = true;
        this.collidable = true;

        // Run standard update logic (includes pursuePlayer which might trigger dynamite)
        super.update(deltaTime, worldContext);
    }

    // PursuePlayer and StartTunneling remain the same as the previous version
    pursuePlayer(deltaTime) {
        const canAct = this.state !== 'stunned' && this.state !== 'dead' &&
                       this.state !== 'tunneling_underground';

        if (!this.targetPlayer || !canAct) {
             if (this.state === 'pursuing') {
                 super.pursuePlayer(deltaTime); // Still move if pursuing but no target/can't act
             }
            return;
        }

        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distanceSq = dx * dx + dy * dy;
        const tunnelRangeSq = this.tunnelRange * this.tunnelRange;
        const dynamiteRangeMinSq = this.dynamiteThrowRangeMin * this.dynamiteThrowRangeMin;
        const dynamiteRangeMaxSq = this.dynamiteThrowRangeMax * this.dynamiteThrowRangeMax;

        // --- Attack Priority ---
        // 1. Tunnel if close enough and cooldown ready
        if (distanceSq <= tunnelRangeSq && this.tunnelCooldownTimer <= 0) {
            this.startTunneling();
            return; // Don't do other actions if tunneling
        }

        // 2. Throw Dynamite if in range and cooldown ready
        if (distanceSq >= dynamiteRangeMinSq && distanceSq <= dynamiteRangeMaxSq && this.dynamiteCooldownTimer <= 0) {
            this.throwDynamite();
            this.dynamiteCooldownTimer = this.dynamiteCooldown; // Reset cooldown *after* throwing
            // Don't return, still pursue after throwing
        }

        // 3. Default: Move towards player if not doing other actions
        super.pursuePlayer(deltaTime);
    }

    startTunneling() {
        // ... (existing tunneling logic remains the same)
        const dx = this.targetPlayer ? this.targetPlayer.x - this.x : 0;
        const dy = this.targetPlayer ? this.targetPlayer.y - this.y : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        console.log(`Engineer ${this.id} initiating tunnel. Player distance: ${dist.toFixed(0)}`);

        console.log(`Engineer ${this.id} starting tunnel from (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);

        if (this.scene && typeof this.scene.createTunnelExplosion === 'function') {
            this.scene.createTunnelExplosion(this.x, this.y);
            if (typeof this.scene.createShockwaveEffect === 'function') {
                this.scene.createShockwaveEffect(this.x, this.y);
            }
        }

        this.setState('tunneling_underground');
        this.startX = this.x;
        this.startY = this.y;
        this.tunnelTrailTimer = 0;
        this.tunnelPhaseTimer = this.tunnelDuration;
        this.tunnelCooldownTimer = this.tunnelCooldown;
        this.visible = false;
        this.collidable = false;
        this.velocityX = 0;
        this.velocityY = 0;

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
    }

    // --- New Method: Throw Dynamite ---
    throwDynamite() {
        if (!this.targetPlayer || !this.scene || !this.scene.addProjectile) {
            console.warn(`Engineer ${this.id}: Cannot throw dynamite - missing target, scene, or addProjectile method.`);
            return;
        }

        console.log(`Engineer ${this.id} throwing dynamite towards player.`);

        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const angle = Math.atan2(dy, dx);

        // Predict player movement slightly (optional, can be simple for now)
        // const predictTime = Math.sqrt(dx*dx + dy*dy) / this.dynamiteThrowSpeed; // Rough time to target
        // const targetX = this.targetPlayer.x + this.targetPlayer.velocityX * predictTime;
        // const targetY = this.targetPlayer.y + this.targetPlayer.velocityY * predictTime;
        // const finalDx = targetX - this.x;
        // const finalDy = targetY - this.y;
        // const finalAngle = Math.atan2(finalDy, finalDx);

        const dynamite = new DynamiteProjectile(this.x, this.y, {
            scene: this.scene,
            velocityX: Math.cos(angle) * this.dynamiteThrowSpeed,
            velocityY: Math.sin(angle) * this.dynamiteThrowSpeed,
            fuseTime: this.dynamiteFuseTime,
            damage: this.dynamiteDamage,
            explosionRadius: this.dynamiteExplosionRadius,
            owner: this // Identify the owner to prevent self-damage if needed
        });

        this.scene.addProjectile(dynamite); // Use scene method to handle adding projectiles

        // Optional: Add a visual cue like a throwing animation or sound effect here
        // this.scene.playSound('dynamite_throw');
    }

    // HandleCollision remains the same
    handleCollision(otherEntity) {
        // ... (existing collision logic remains the same)
        if (!this.collidable) return;
        if (otherEntity.type !== 'player') {
            super.handleCollision(otherEntity);
        }
    }
// Override takeDamage to check for drone spawning condition
    takeDamage(amount) {
        // ... (existing takeDamage logic remains the same)
       const oldHealth = this.health;
       super.takeDamage(amount);

       if (this.state !== 'dead' && !this.hasSpawnedDrones && this.health <= this.maxHealth / 2) {
           this.spawnDrones();
           this.hasSpawnedDrones = true;
       }
    }

    spawnDrones() {
        // ... (existing spawnDrones logic remains the same)
       console.log(`Engineer ${this.id} health below 50% (${this.health}/${this.maxHealth}), spawning drones!`);
       const numberOfDrones = 4 + Math.floor(Math.random() * 3);

       if (!this.scene || !Array.isArray(this.scene.enemies)) {
           console.error(`Engineer ${this.id}: Cannot spawn drones - scene or scene.enemies array not available.`);
           return;
       }

       for (let i = 0; i < numberOfDrones; i++) {
           const angle = (i / numberOfDrones) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
           const spawnDist = 50 + Math.random() * 20;
           const spawnX = this.x + Math.cos(angle) * spawnDist;
           const spawnY = this.y + Math.sin(angle) * spawnDist;

           const newDrone = new DroneEnemy(spawnX, spawnY, { scene: this.scene });
           this.scene.enemies.push(newDrone); // Assuming direct addition is okay
           console.log(` -> Spawned Drone ${newDrone.id} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
       }
    }

// Method to spawn multiple turrets
    spawnTurrets() {
        // ... (existing spawnTurrets logic remains the same)
        const numTurrets = 3 + Math.floor(Math.random() * 3);
        console.log(`Engineer ${this.id} attempting to spawn ${numTurrets} turrets.`);

        if (!this.scene || !Array.isArray(this.scene.enemies)) {
            console.error(`Engineer ${this.id}: Cannot spawn turrets - scene or scene.enemies array not available.`);
            return;
        }

        const baseSpawnDist = 150;
        const randomDistOffset = 100;

        for (let i = 0; i < numTurrets; i++) {
            const angle = (i / numTurrets) * Math.PI * 2 + (Math.random() * 0.6 - 0.3);
            const spawnDist = baseSpawnDist + Math.random() * randomDistOffset;

            const spawnX = this.x + Math.cos(angle) * spawnDist;
            const spawnY = this.y + Math.sin(angle) * spawnDist;

            // 1. Create the visual representation (Phaser GameObject)
            // TODO: Replace 'turret_sprite' with the actual texture key for the turret
            const turretSprite = this.scene.add.sprite(spawnX, spawnY, 'turret_sprite');
            // Optionally set depth, scale, etc. for the sprite here
            // turretSprite.setDepth(5);

            // 2. Create the logic object, passing the GameObject reference
            const newTurret = new TurretEnemy(spawnX, spawnY, {
                scene: this.scene,
                gameObject: turretSprite // Pass the sprite reference
            });

            // 3. Add the logic object to the enemy manager/list
            this.scene.enemies.push(newTurret);
            console.log(` -> Spawned Turret ${newTurret.id} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
        }
    }
 
// OnDeath remains the same
    onDeath() {
        // ... (existing onDeath logic remains the same)
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
        // ... (existing setState logic remains the same)
        const oldState = this.state;
        if (oldState !== newState) {
            this.state = newState;

            const exitingTunnel = (oldState === 'tunneling_underground');
            const enteringNonTunnel = (newState !== 'tunneling_underground');

            if (exitingTunnel && enteringNonTunnel) {
                 this.collidable = true;
                 this.visible = true;
            }
        }
    }

    // Removed draw override - rely on parent Entity draw method

    /**
     * Override the parent stun method to make the Engineer immune to stuns.
     * @param {number} duration - The duration the stun would normally last.
     */
    stun(duration) {
        // ... (existing stun logic remains the same)
        // Do nothing, Engineer cannot be stunned.
    }
}