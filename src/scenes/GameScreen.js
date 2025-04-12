// import Phaser from 'phaser'; // Removed - Phaser is loaded globally via CDN
import WorldManager from '../entities/WorldManager.js';
import { Player } from '../entities/Player.js'; // Import your Player class
import { InputHandler } from '../entities/InputHandler.js'; // Import InputHandler
import { Enemy } from '../entities/Enemy.js'; // Import Enemy class
import { RangedEnemy } from '../entities/RangedEnemy.js'; // Import RangedEnemy class
import { EnemyManager } from '../entities/EnemyManager.js'; // Import EnemyManager
import { Projectile } from '../entities/Projectile.js'; // Import Projectile class
export default class GameScreen extends Phaser.Scene {
    constructor() {
        super('GameScreen');
        this.worldManager = null;
        this.player = null;         // Instance of your Player class
        this.playerVisual = null;   // Phaser GameObject for the player
        this.playerShadow = null;   // Phaser Graphics object for the shadow
        this.inputHandler = null;   // InputHandler instance
        this.enemies = []; // Array to hold enemy instances
        this.debugGraphics = null; // Graphics object for debug drawing
        this.enemyManager = null; // Add EnemyManager instance
        this.enemyVisuals = new Map(); // Map enemy ID to Phaser GameObject
        this.enemyShadows = new Map(); // Map enemy ID to Phaser Graphics object for shadow
        this.projectiles = []; // Array to hold projectile instances
        this.projectileVisuals = new Map(); // Map projectile ID to Phaser GameObject
    }

    preload() {
        // Create a white dot texture for particles
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('white_dot', 16, 16);
        graphics.destroy();
        
        // Other preload code...
    }

    create() {
        // World Configuration
        const TILE_SIZE = 50;
        const CHUNK_SIZE = 16; // 16x16 tiles per chunk
        const RENDER_DISTANCE = 2; // Load 2 chunks radius around player (reverted back from 1)

        // Initialize World Manager
        this.worldManager = new WorldManager(this, {
            tileSize: TILE_SIZE,
            chunkSize: CHUNK_SIZE,
            renderDistance: RENDER_DISTANCE,
            // seed: 12345 // Optional: Set a specific seed for consistent testing
        });

        // --- Input Handler Setup ---
        this.inputHandler = new InputHandler(this); // Pass the scene to InputHandler

        // --- Player Setup ---
        // Starting position
        const startX = (this.cameras.main.width / 2); // Use camera center
        const startY = (this.cameras.main.height / 2);

        // Create instance of your Player class
        this.player = new Player(startX, startY, this.inputHandler, {
             // Set collision bounds to match tile size
             collisionBounds: { x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE }
        });

        // Create the visual representation for the player in Phaser
        // Using a rectangle for now, replace with sprite if you have one
        this.playerVisual = this.add.rectangle(
            this.player.x,
            this.player.y,
            TILE_SIZE, // Set visual width to TILE_SIZE
            TILE_SIZE, // Set visual height to TILE_SIZE
            0x00ff00 // Green color
        );
        this.playerVisual.setDepth(1); // Ensure player visual is above terrain

        // Create Graphics object for the shadow
        this.playerShadow = this.add.graphics();
        this.playerShadow.setDepth(0.9); // Draw shadow below player visual
        // Duplicate startY removed
        // --- Camera Setup ---
        this.cameras.main.startFollow(this.playerVisual); // Camera follows the visual object
        this.cameras.main.setZoom(0.75); // Zoom the camera out (30% of original 2.5)

        // Redundant comment removed
        this.cameras.main.setBackgroundColor('#2d2d2d');

        // --- Debug Graphics Setup ---
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(5); // Draw debug info above most things

        // --- Enemy Manager Setup ---
        this.enemyManager = new EnemyManager(this); // Create the manager

        // --- Manual Enemy Spawning Removed ---
        // The EnemyManager now handles spawning.

        // Pass the player reference to the worldManager if needed elsewhere
        // Also make player accessible on the scene itself for enemy AI context
        this.worldManager.player = this.player;
        // this.player = this.player; // This line is redundant, 'this.player' is already set

        // Initialize enemy shadow map
        this.enemyShadows = new Map();

        // Input setup is now handled by InputHandler and Player class

        // Initial chunk load based on player start position
        this.worldManager.update(this.player.x, this.player.y);

        // Add instructions text back
        // Update instructions text for Player class controls
    }

    update(time, delta) {
        // Ensure all necessary components exist
        if (!this.player || !this.worldManager || !this.inputHandler || !this.playerVisual) return;

        const dtSeconds = delta / 1000; // Delta time in seconds

        // Update InputHandler first to capture current state
        this.inputHandler.update();

        // Update Player logic (handles input, physics, state)
        // Pass delta in seconds, and the scene as the 'world' context for interactions
        this.player.update(dtSeconds, this);

        // Sync the visual representation's position with the player data instance
        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y;

        // --- Draw Player Shadow ---
        this.playerShadow.clear(); // Clear previous shadow drawing
        if (this.player.state !== 'dead') { // Don't draw shadow if dead
            const bounds = this.player.getAbsoluteBounds(); // Use bounds from the Player instance
            const shadowOffsetY = 5;
            const shadowScaleX = 0.8;
            const shadowScaleY = 0.4;
            const shadowAlpha = 0.3;

            const shadowX = this.player.x; // Center shadow on player's logical x
            const shadowY = this.player.y + bounds.height / 2 + shadowOffsetY; // Position below the logical bottom center
            const shadowRadiusX = (bounds.width / 2) * shadowScaleX;
            const shadowRadiusY = shadowRadiusX * shadowScaleY;

            if (shadowRadiusX > 0 && shadowRadiusY > 0) {
                this.playerShadow.fillStyle(0x000000, shadowAlpha); // Black, semi-transparent
                this.playerShadow.fillEllipse(shadowX, shadowY, shadowRadiusX * 2, shadowRadiusY * 2); // Phaser uses diameter
            }
        }
        // --- End Shadow Drawing ---

        // --- Update Enemy Manager ---
        if (this.enemyManager) {
            this.enemyManager.update(dtSeconds);
        }

        // --- Update Enemies ---
        const worldContext = { // Pass necessary context to entities
            player: this.player,
            scene: this, // Pass the scene itself for things like projectile creation
            // Add other relevant context if needed (e.g., world bounds)
        };
        this.enemies.forEach(enemy => {
            // --- Shadow Handling ---
            let shadow = this.enemyShadows.get(enemy.id);
            if (!shadow && enemy.state !== 'dead') {
                shadow = this.add.graphics();
                shadow.setDepth(0.9); // Below enemy visual
                this.enemyShadows.set(enemy.id, shadow);
            }

            if (shadow) {
                shadow.clear(); // Clear previous shadow drawing
                if (enemy.state !== 'dead') {
                    const bounds = enemy.getAbsoluteBounds();
                    const shadowOffsetY = 5;
                    const shadowScaleX = 0.8;
                    const shadowScaleY = 0.4;
                    const shadowAlpha = 0.3;
                    const shadowX = enemy.x;
                    const shadowY = enemy.y + bounds.height / 2 + shadowOffsetY;
                    const shadowRadiusX = (bounds.width / 2) * shadowScaleX;
                    const shadowRadiusY = shadowRadiusX * shadowScaleY;
                    if (shadowRadiusX > 0 && shadowRadiusY > 0) {
                        shadow.fillStyle(0x000000, shadowAlpha);
                        shadow.fillEllipse(shadowX, shadowY, shadowRadiusX * 2, shadowRadiusY * 2);
                    }
                } else {
                    shadow.destroy();
                    this.enemyShadows.delete(enemy.id);
                }
            }
            // --- End Shadow Handling ---

            if (enemy.state !== 'dead') { // Only update active enemies
                enemy.update(dtSeconds, worldContext);

                // Ensure visual exists for active enemy
                if (!this.enemyVisuals.has(enemy.id)) {
                    // Determine color based on enemy type
                    let enemyColor = 0xff0000; // Default red for melee
                    if (enemy instanceof RangedEnemy) {
                        enemyColor = 0xffa500; // Orange for ranged
                    }

                    const enemyVisual = this.add.rectangle(
                        enemy.x, enemy.y,
                        enemy.collisionBounds.width,
                        enemy.collisionBounds.height,
                        enemyColor
                    );
                    enemyVisual.setDepth(0.95);
                    this.enemyVisuals.set(enemy.id, enemyVisual);
                }

                // Sync enemy visual position and apply visual effects
                const visual = this.enemyVisuals.get(enemy.id);
                if (visual) {
                    visual.setPosition(enemy.x, enemy.y);

                    // Determine base color again for reset
                    let baseColor = 0xff0000;
                    if (enemy instanceof RangedEnemy) {
                        baseColor = 0xffa500;
                    }

                    // Reset to normal color/state
                    visual.setFillStyle(baseColor);
                    visual.setAlpha(1);

                    // Apply hit effect (flash white)
                    if (enemy.hitEffectTimer > 0) {
                        visual.setFillStyle(0xffffff);
                    }

                    // Apply stun effect
                    if (enemy.isStunned) {
                        const stunAlpha = 0.5 + (Math.sin(Date.now() / 100) * 0.2);
                        visual.setFillStyle(0xffffff); // Flash white when stunned
                        visual.setAlpha(stunAlpha * enemy.stunEffectIntensity);
                    }
                }
            }
        });

        // --- Update Projectiles ---
        this.projectiles.forEach(proj => {
            if (proj.state !== 'dead') {
                proj.update(dtSeconds, worldContext);

                // Ensure visual exists
                if (!this.projectileVisuals.has(proj.id)) {
                    const projVisual = this.add.circle(
                        proj.x, proj.y,
                        proj.collisionBounds.width / 2, // Use radius from bounds
                        0xffff00 // Yellow for projectiles
                    );
                    projVisual.setDepth(1.1); // Above player/enemies
                    this.projectileVisuals.set(proj.id, projVisual);
                }

                // Sync visual position
                const visual = this.projectileVisuals.get(proj.id);
                if (visual) {
                    visual.setPosition(proj.x, proj.y);
                }
            }
        });

        // --- Collision Detection & Handling ---
        // Player vs Enemies
        if (this.player.state !== 'dead') {
            this.enemies.forEach(enemy => {
                if (enemy.state !== 'dead') {
                    if (this.player.checkCollision(enemy, dtSeconds)) {
                        this.player.handleCollision(enemy);
                        enemy.handleCollision(this.player);
                    }
                }
            });
        }

        // Projectiles vs Player/Enemies
        this.projectiles.forEach(proj => {
            if (proj.state === 'dead') return; // Skip dead projectiles

            // Check against player
            if (this.player.state !== 'dead' && proj.ownerId !== this.player.id) {
                 if (proj.checkCollision(this.player, dtSeconds)) {
                     proj.handleCollision(this.player); // Projectile handles hitting player
                     // Player's takeDamage is called within projectile's handleCollision
                 }
            }

            // Check against enemies
            this.enemies.forEach(enemy => {
                if (enemy.state !== 'dead' && proj.ownerId !== enemy.id) {
                    if (proj.checkCollision(enemy, dtSeconds)) {
                        proj.handleCollision(enemy); // Projectile handles hitting enemy
                        // Enemy's takeDamage is called within projectile's handleCollision
                    }
                }
            });
        });
        // --- End Collision Detection ---


        // --- Debug Drawing ---
        this.debugGraphics.clear(); // Clear previous debug drawings

        // Draw player debug info (if any)
        if (this.player && this.player.drawDebug) {
             // Assuming player might also have a drawDebug method
             // this.player.drawDebug(this.debugGraphics);
        }

        // Draw enemy debug info (COMMENTED OUT)
        // this.enemies.forEach(enemy => {
        //     if (enemy.state !== 'dead') {
        //          enemy.drawDebug(this.debugGraphics);
        //     }
        // }); // Also comment out the closing part of the debug loop

        // --- Cleanup Dead Entities ---
        // Remove dead enemies
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.state === 'dead') {
                const visual = this.enemyVisuals.get(enemy.id);
                if (visual) visual.destroy();
                this.enemyVisuals.delete(enemy.id);

                const shadow = this.enemyShadows.get(enemy.id);
                if (shadow) shadow.destroy();
                this.enemyShadows.delete(enemy.id);
                return false; // Remove
            }
            return true; // Keep
        });

        // Remove dead projectiles
        this.projectiles = this.projectiles.filter(proj => {
            if (proj.state === 'dead') {
                const visual = this.projectileVisuals.get(proj.id);
                if (visual) visual.destroy();
                this.projectileVisuals.delete(proj.id);
                return false; // Remove
            }
            return true; // Keep
        });
        // --- End Cleanup ---


        // Update world chunks based on the player data instance's position
        this.worldManager.update(this.player.x, this.player.y);

        // Commenting out the old placeholder
        // // If your Player/Entity classes have debug draw methods that use a canvas context,
        // // you would need a different approach in Phaser (e.g., using Graphics objects).
        // // For now, we assume rendering is handled by the playerVisual.
    }

    // --- Effect Creation Methods ---

    // Updated createImpactEffect method for Phaser 3.80.1
    createImpactEffect(x, y) {
        // Create a circular impact marker
        const impactCircle = this.add.circle(x, y, 20, 0xffffff, 0.8);
        impactCircle.setDepth(2); // Above most elements

        // Create expanding ring
        const ring = this.add.circle(x, y, 10, 0xffffff, 0);
        ring.setStrokeStyle(3, 0xffffff, 0.8);
        ring.setDepth(2);

        // Create multiple particles manually instead of using particle emitter
        const particleCount = 10;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            // Create a small white circle as a particle
            const particle = this.add.circle(x, y, 3, 0xffffff, 0.8);
            particle.setDepth(2);

            // Random angle and speed
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;

            // Add to particles array for cleanup
            particles.push(particle);

            // Animate each particle
            this.tweens.add({
                targets: particle,
                x: particle.x + velocityX,
                y: particle.y + velocityY,
                alpha: 0,
                scale: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }

        // Animate and then destroy the impact effects
        this.tweens.add({
            targets: impactCircle,
            alpha: 0,
            scale: 1.5,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                impactCircle.destroy();
            }
        });

        this.tweens.add({
            targets: ring,
            scaleX: 4,
            scaleY: 4,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
            }
        });

        // Add screen shake effect
        this.cameras.main.shake(100, 0.01);
    }

    // Add a method for dash trail effects
    createDashTrailEffect(x, y) {
        // Create a fading dash trail marker
        const trailMarker = this.add.circle(x, y, 15, 0xffffff, 0.4); // Changed color to white
        trailMarker.setDepth(0.5); // Below player

        // Fade and disappear
        this.tweens.add({
            targets: trailMarker,
            alpha: 0,
            scale: 0.5,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                trailMarker.destroy();
            }
        });
    }

    // Method called by RangedEnemy to create a projectile
    createProjectile(x, y, direction, speed, damage, ownerId, type) {
        // Create the logical projectile instance
        const projectile = new Projectile(x, y, direction, speed, damage, ownerId, type);

        // Add to the scene's projectile list for updates and collision checks
        this.projectiles.push(projectile);

        // Visual creation will happen in the update loop when the projectile is detected
        // console.log(`Projectile ${projectile.id} created by ${ownerId}`); // Optional debug log
        return projectile; // Return instance if needed
    }
    // --- End Effect Creation Methods ---

    shutdown() {
        // Destroy InputHandler to remove listeners
        if (this.inputHandler) {
            this.inputHandler.destroy();
            this.inputHandler = null;
        }
        // Destroy WorldManager to clean up chunks
        if (this.worldManager) {
            this.worldManager.destroy();
            this.worldManager = null;
        }

        // Destroy EnemyManager
        if (this.enemyManager) {
            this.enemyManager.destroy();
            this.enemyManager = null;
        }

        // Release references
        this.player = null;
        this.playerVisual = null;
        this.playerShadow = null;
        if (this.playerShadow) this.playerShadow.destroy();
        this.debugGraphics = null;
        if (this.debugGraphics) this.debugGraphics.destroy();
        // Destroy any remaining enemy visuals and shadows
        this.enemyVisuals.forEach(visual => visual.destroy());
        this.enemyVisuals.clear();
        this.enemyShadows.forEach(shadow => shadow.destroy());
        this.enemyShadows.clear();
        this.enemies = [];

        // Destroy any remaining projectile visuals
        this.projectileVisuals.forEach(visual => visual.destroy());
        this.projectileVisuals.clear();
        this.projectiles = [];
    }
}