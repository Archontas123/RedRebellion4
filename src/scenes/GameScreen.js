// import Phaser from 'phaser'; // Removed - Phaser is loaded globally via CDN
import WorldManager from '../entities/WorldManager.js';
import { Player } from '../entities/Player.js';
import { InputHandler } from '../entities/InputHandler.js';
import { Enemy } from '../entities/Enemy.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { Plasma } from '../entities/Plasma.js'; // Import Plasma

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
        this.items = []; // Array to hold item instances (like Plasma)
        this.itemVisuals = new Map(); // Map item ID to Phaser GameObject
        this.itemShadows = new Map(); // Map item ID to Phaser Graphics object for shadow
        this.plasmaCounterText = null; // UI Text for plasma count
        this.playerHpText = null; // UI Text for player HP
        this.tileCoordsText = null; // UI Text for player tile coordinates
    }

    preload() {
        // Create a white dot texture for particles
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('white_dot', 16, 16);
        graphics.destroy();
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
        // Pass the worldManager instance to the Player constructor
        this.player = new Player(startX, startY, this.inputHandler, this.worldManager, {
            collisionBounds: { x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE },
            scene: this  // Pass scene reference during creation
        });
        this.player.scene = this; // Give player a reference to the scene

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

        // --- Camera Setup ---
        this.cameras.main.startFollow(this.playerVisual); // Camera follows the visual object
        this.cameras.main.setZoom(0.75); // Zoom the camera out (30% of original 2.5)

        this.cameras.main.setBackgroundColor('#2d2d2d');

        // --- Debug Graphics Setup ---
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(5); // Draw debug info above most things

        // --- Enemy Manager Setup ---
        this.enemyManager = new EnemyManager(this); // Create the manager

        // Pass the player reference to the worldManager if needed elsewhere
        this.worldManager.player = this.player;

        // Initial chunk load based on player start position
        this.worldManager.update(this.player.x, this.player.y);

        // --- UI Setup ---
        this.plasmaCounterText = this.add.text(10, 10, 'Plasma: 0', {
            fontSize: '24px',
            fill: '#FFFFFF', // White color
            stroke: '#000000', // Black stroke
            strokeThickness: 4
        });
        this.plasmaCounterText.setScrollFactor(0); // Keep text fixed on screen
        this.plasmaCounterText.setDepth(10); // Ensure UI is on top

        // Player HP Text
        this.playerHpText = this.add.text(10, 40, `HP: ${this.player.health}/${this.player.maxHealth}`, {
            fontSize: '24px',
            fill: '#00FF00', // Green color for HP
            stroke: '#000000',
            strokeThickness: 4
        });
        this.playerHpText.setScrollFactor(0);
        this.playerHpText.setDepth(10);

        // Tile Coordinates Text
        this.tileCoordsText = this.add.text(10, 70, `Tile: 0, 0`, { // Position below HP
            fontSize: '18px', // Slightly smaller font
            fill: '#CCCCCC', // Light gray color
            stroke: '#000000',
            strokeThickness: 3
        });
        this.tileCoordsText.setScrollFactor(0);
        this.tileCoordsText.setDepth(10);
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
        this.enemies.forEach(enemy => {
            if (enemy.state !== 'dead') { // Only update active enemies
                enemy.update(dtSeconds, this);

                // Ensure visual exists for active enemy
                if (!this.enemyVisuals.has(enemy.id)) {
                    const enemyVisual = this.add.rectangle(
                        enemy.x, enemy.y,
                        enemy.collisionBounds.width, // Use enemy's bounds
                        enemy.collisionBounds.height,
                        0xff0000 // Red color for enemies
                    );
                    enemyVisual.setDepth(0.95); // Slightly above shadow, below player
                    this.enemyVisuals.set(enemy.id, enemyVisual);
                }

                // Sync enemy visual position
                const visual = this.enemyVisuals.get(enemy.id);
                if (visual) {
                    visual.setPosition(enemy.x, enemy.y);

                    // --- Draw Enemy Shadow ---
                    let shadow = this.enemyShadows.get(enemy.id);
                    if (!shadow) {
                        shadow = this.add.graphics();
                        shadow.setDepth(visual.depth - 0.01); // Draw shadow just below the visual
                        this.enemyShadows.set(enemy.id, shadow);
                    }

                    shadow.clear();
                    if (enemy.state !== 'dead') {
                        const bounds = enemy.getAbsoluteBounds();
                        const shadowOffsetY = 5;
                        const shadowScaleX = 0.8;
                        const shadowScaleY = 0.4;
                        const shadowAlpha = 0.3;

                        const shadowX = enemy.x; // Center shadow on enemy's logical x
                        const shadowY = enemy.y + bounds.height / 2 + shadowOffsetY; // Position below the logical bottom center
                        const shadowRadiusX = (bounds.width / 2) * shadowScaleX;
                        const shadowRadiusY = shadowRadiusX * shadowScaleY;

                        if (shadowRadiusX > 0 && shadowRadiusY > 0) {
                            shadow.fillStyle(0x000000, shadowAlpha); // Black, semi-transparent
                            shadow.fillEllipse(shadowX, shadowY, shadowRadiusX * 2, shadowRadiusY * 2); // Phaser uses diameter
                        }
                    }
                    // --- End Enemy Shadow Drawing ---
                }
            }
        });

        // --- Update enemy visuals including stun effects ---
        this.updateEnemyVisuals();

        // --- Collision Detection & Handling ---
        if (this.player.state !== 'dead') {
            this.enemies.forEach(enemy => {
                if (enemy.state !== 'dead') {
                    // Use the checkCollision method from Entity.js
                    if (this.player.checkCollision(enemy, dtSeconds)) {
                        // Check if the player is attacking and this enemy hasn't been hit yet in this attack
                        if (this.player.isAttacking && !this.player.enemiesHitThisAttack.has(enemy.id)) {
                            // Handle the attack collision
                            this.player.handleCollision(enemy);
                            enemy.handleCollision(this.player);
                        }
                        // For non-attack collisions or enemies already hit this attack
                        else if (!this.player.isAttacking) {
                            // Normal collision handling
                            this.player.handleCollision(enemy);
                            enemy.handleCollision(this.player);
                        }
                    }
                }
            });

            // --- Player-Item Collision Check ---
            this.items.forEach(item => {
                // Check collision between player and item
                if (this.player.checkCollision(item, dtSeconds)) {
                    // Let the player handle the collision (which includes collection logic)
                    this.player.handleCollision(item);
                    // Note: The item removal is handled later in the update loop based on item.health <= 0
                }
            });
            // --- End Player-Item Collision Check ---
        }
        // --- End Collision Detection ---

        // --- Update Items ---
        this.items.forEach(item => {
            item.update(dtSeconds); // Update item logic (e.g., bobbing)

            // Ensure visual exists for the item
            if (!this.itemVisuals.has(item.id)) {
                // Create a visual based on item properties (simple circle for Plasma)
                const itemVisual = this.add.circle(
                    item.x, item.y,
                    item.collisionBounds.width / 2, // Use radius from bounds
                    0x00FFFF, // Cyan color for Plasma
                    1 // Alpha
                );
                itemVisual.setDepth(0.8); // Draw items below player/enemies but above ground/shadows
                this.itemVisuals.set(item.id, itemVisual);
            }

            // Sync item visual position
            const visual = this.itemVisuals.get(item.id);
            if (visual) {
                visual.setPosition(item.x, item.y); // Sync visual position first

                // --- Draw Item Shadow ---
                let shadow = this.itemShadows.get(item.id);
                if (!shadow) {
                    shadow = this.add.graphics();
                    shadow.setDepth(0.75); // Explicitly set depth below item visual (0.8)
                    this.itemShadows.set(item.id, shadow);
                }

                shadow.clear();
                const bounds = item.getAbsoluteBounds();
                const shadowOffsetY = 3; // Smaller offset for items
                const shadowScaleX = 0.6; // Smaller shadow scale
                const shadowScaleY = 0.3;
                const shadowAlpha = 0.3;

                const shadowX = item.x; // Center shadow on item's logical x
                const shadowY = item.y + bounds.height / 2 + shadowOffsetY; // Position below the logical bottom center
                const shadowRadiusX = (bounds.width / 2) * shadowScaleX;
                const shadowRadiusY = shadowRadiusX * shadowScaleY;

                if (shadowRadiusX > 0 && shadowRadiusY > 0) {
                    shadow.fillStyle(0x000000, shadowAlpha); // Black, semi-transparent
                    shadow.fillEllipse(shadowX, shadowY, shadowRadiusX * 2, shadowRadiusY * 2); // Phaser uses diameter
                }
                // --- End Item Shadow Drawing ---
            }
        });
        // --- End Update Items ---

        // --- Debug Drawing ---
        this.debugGraphics.clear(); // Clear previous debug drawings

        // Remove dead enemies from the scene's list
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.state === 'dead') {
                // --- Spawn Plasma on Death ---
                console.log(`Enemy ${enemy.id} died, spawning plasma.`);
                const plasmaDrop = new Plasma(enemy.x, enemy.y);
                this.items.push(plasmaDrop);
                // --- End Spawn Plasma ---

                // Handle enemy visual removal
                const visual = this.enemyVisuals.get(enemy.id);
                if (visual) {
                    visual.destroy();
                    this.enemyVisuals.delete(enemy.id);
                }

                // Also clean up stun effect if it exists
                if (enemy.stunEffect) {
                    enemy.stunEffect.destroy(); // Use the correct property name
                    enemy.stunEffect = null;
                }

                // Handle enemy shadow removal
                const shadow = this.enemyShadows.get(enemy.id);
                if (shadow) {
                    shadow.destroy();
                    this.enemyShadows.delete(enemy.id);
                }

                return false; // Remove from scene's array
            }
            return true; // Keep in scene's array
        });

        // --- Remove collected/dead items ---
        this.items = this.items.filter(item => {
            if (item.health <= 0) { // Assuming health <= 0 means collected/destroyed
                const visual = this.itemVisuals.get(item.id);
                if (visual) {
                    visual.destroy();
                    this.itemVisuals.delete(item.id);
                }
                // Remove item shadow
                const shadow = this.itemShadows.get(item.id);
                if (shadow) {
                    shadow.destroy();
                    this.itemShadows.delete(item.id);
                }
                return false; // Remove from items array
            }
            return true; // Keep in items array
        });

        // Update world chunks based on the player data instance's position
        this.worldManager.update(this.player.x, this.player.y);

        // --- Update UI ---
        if (this.plasmaCounterText && this.player) {
            this.plasmaCounterText.setText(`Plasma: ${this.player.plasmaCount}`);
        }
        if (this.playerHpText && this.player) {
             // Update HP text and color based on health percentage
            const hpPercent = this.player.health / this.player.maxHealth;
            let hpColor = '#00FF00'; // Green
            if (hpPercent < 0.6) hpColor = '#FFFF00'; // Yellow
            if (hpPercent < 0.3) hpColor = '#FF0000'; // Red

            this.playerHpText.setText(`HP: ${Math.max(0, Math.round(this.player.health))}/${this.player.maxHealth}`);
            this.playerHpText.setFill(hpColor);
        }
        if (this.tileCoordsText && this.player) {
            this.tileCoordsText.setText(`Tile: ${this.player.currentTileX}, ${this.player.currentTileY}`);
        }
    }
// End of update method (Class continues below)

// --- Player Death and Respawn Logic ---

handlePlayerDeath() {
    // Clear any existing death UI elements if they somehow persist
    if (this.deathText) this.deathText.destroy();
    if (this.respawnButton) this.respawnButton.destroy();

    const deathX = this.player.x; // Capture death location
    const deathY = this.player.y;
    console.log(`GameScreen: Handling player death at (${deathX.toFixed(0)}, ${deathY.toFixed(0)}).`);

    // Optional: Show a "You Died" message or fade the screen
    // Store death text reference on the scene
    this.deathText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'YOU DIED', {
        fontSize: '64px',
        fill: '#ff0000', // Red color
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(11); // Keep fixed on screen, above UI

    // Hide player visual immediately
    if (this.playerVisual) {
        this.playerVisual.setVisible(false);
    }
    if (this.playerShadow) {
        this.playerShadow.setVisible(false);
    }

    // Create Respawn Button
    this.respawnButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'Respawn', {
        fontSize: '32px',
        fill: '#ffffff',
        backgroundColor: '#555555',
        padding: { x: 20, y: 10 },
        align: 'center'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(11)
    .setInteractive({ useHandCursor: true }); // Make it clickable

    // Add click listener
    this.respawnButton.on('pointerdown', () => {
        console.log("Respawn button clicked.");
        this.respawnPlayer(); // Call respawn (no location needed)
    });
}

respawnPlayer() { // No longer needs death location
    console.log(`GameScreen: Respawning player near (0, 0).`);

    // Remove death UI elements
    if (this.deathText) {
        this.deathText.destroy();
        this.deathText = null;
    }
    if (this.respawnButton) {
        this.respawnButton.destroy();
        this.respawnButton = null;
    }

    // Reset player state and health
    this.player.health = this.player.maxHealth;
    this.player.state = 'idle'; // Reset state from 'dead'
    this.player.plasmaCount = 0; // Optional: Reset plasma count on death

    // --- Find Safe Respawn Location near (0, 0) ---
    const TILE_SIZE = this.worldManager.tileSize; // Get tile size
    const SAFETY_RADIUS_TILES = 5;
    const SAFETY_RADIUS_PIXELS = SAFETY_RADIUS_TILES * TILE_SIZE;
    const MAX_SEARCH_RADIUS_TILES = 20; // Limit search to avoid infinite loops

    let respawnX = 0;
    let respawnY = 0;
    let foundSafeSpot = false;

    // Check outwards in rings from (0,0)
    searchLoop:
    for (let radius = 0; radius <= MAX_SEARCH_RADIUS_TILES; radius++) {
        const step = TILE_SIZE; // Check tile centers
        // Check points on the square ring around (0,0) at this tile radius
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Only check the perimeter of the square for radius > 0
                if (radius > 0 && Math.abs(dx) < radius && Math.abs(dy) < radius) {
                    continue;
                }

                const potentialX = dx * step;
                const potentialY = dy * step;

                // Check if this spot is safe from active enemies
                let isSafe = true;
                for (const enemy of this.enemies) {
                    if (enemy.state === 'dead') continue; // Ignore dead enemies

                    // Calculate squared distance for efficiency
                    const distanceSq = (enemy.x - potentialX) ** 2 + (enemy.y - potentialY) ** 2;
                    if (distanceSq < SAFETY_RADIUS_PIXELS ** 2) {
                        isSafe = false;
                        break; // This spot is not safe, try next point in the inner loops
                    }
                }

                if (isSafe) {
                    respawnX = potentialX;
                    respawnY = potentialY;
                    foundSafeSpot = true;
                    console.log(`GameScreen: Found safe respawn spot at (${respawnX.toFixed(0)}, ${respawnY.toFixed(0)}) after checking radius ${radius}.`);
                    break searchLoop; // Exit all loops once a safe spot is found
                }
            }
        }
    }

    if (!foundSafeSpot) {
        console.warn(`GameScreen: Could not find a safe respawn spot within ${MAX_SEARCH_RADIUS_TILES} tiles of (0,0). Respawning at (0,0) anyway.`);
        respawnX = 0; // Default to 0,0 if no safe spot found
        respawnY = 0;
    }
    // --- End Find Safe Respawn Location ---


    console.log(`GameScreen: Setting respawn position: (${respawnX.toFixed(0)}, ${respawnY.toFixed(0)})`);

    this.player.x = respawnX;
    this.player.y = respawnY;
    this.player.velocityX = 0;
    this.player.velocityY = 0;

    // Make player visual and shadow visible again
    if (this.playerVisual) {
        this.playerVisual.setPosition(respawnX, respawnY);
        this.playerVisual.setVisible(true);
    }
     if (this.playerShadow) {
        this.playerShadow.setVisible(true);
    }

    // Update UI immediately
    if (this.plasmaCounterText) {
        this.plasmaCounterText.setText(`Plasma: ${this.player.plasmaCount}`);
    }
    if (this.playerHpText) {
         this.playerHpText.setText(`HP: ${this.player.health}/${this.player.maxHealth}`);
         this.playerHpText.setFill('#00FF00'); // Reset color to green on respawn
    }

    // Optional: Add brief invulnerability or visual effect on respawn
    if (this.playerVisual) {
        this.playerVisual.setAlpha(0.5); // Make slightly transparent
        this.tweens.add({
            targets: this.playerVisual,
            alpha: 1,
            duration: 150, // Flash duration
            ease: 'Linear',
            yoyo: true,
            repeat: 5, // Number of flashes (total duration = duration * (repeat + 1))
            onComplete: () => {
                if (this.playerVisual) { // Check if visual still exists
                   this.playerVisual.setAlpha(1); // Ensure alpha is reset
                }
            }
        });
    }

    console.log("GameScreen: Player respawned.");
}


// Update enemy visuals including stun effects and flashing
updateEnemyVisuals() {
    this.enemies.forEach(enemy => {
        if (enemy.state === 'dead') return;

        const visual = this.enemyVisuals.get(enemy.id);
        if (!visual) return;

        // Check if enemy is in flashing state (from Enemy.js)
        if (enemy.isFlashing) {
            // Apply white flash visual
            visual.setFillStyle(0xffffff);

            // Scale effect based on how recent the hit was
            const flashProgress = enemy.hitEffectTimer / enemy.hitEffectDuration;
            const scale = 1.0 + (0.3 * flashProgress); // 1.0 to 1.3 scale
            visual.setScale(scale);
        }
        // If not flashing, check for stun
        else if (enemy.isStunned) {
            // Display normal enemy color while stunned
            visual.setFillStyle(0xff0000); // Default red color
            visual.setScale(1.0); // Normal scale

            // Add confused ring above enemy if not already there
            if (!enemy.stunEffect) {
                this.createOrUpdateStunEffect(enemy);
            } else {
                // Update stun effect position
                enemy.stunEffect.setPosition(enemy.x, enemy.y - 30);
            }
        }
        // Otherwise, reset to default appearance
        else {
            visual.setFillStyle(0xff0000); // Default red color
            visual.setScale(1.0); // Normal scale
            visual.setAlpha(1);

            // Remove stun effect if it exists
            if (enemy.stunEffect) {
                enemy.stunEffect.destroy();
                enemy.stunEffect = null;
            }
        }
    });
}

// Simplified createOrUpdateStunEffect method
createOrUpdateStunEffect(enemy) {
    if (!enemy || enemy.state === 'dead') return;

    // Remove old effect if it exists and is active
    if (enemy.stunEffect && enemy.stunEffect.active) {
        enemy.stunEffect.destroy();
        enemy.stunEffect = null;
    }

    // Only create if the enemy is actually stunned *now*
    if (!enemy.isStunned) return;

    // Position above the enemy
    const stunX = enemy.x;
    const stunY = enemy.y - 30;

    // Create a container for the effect
    enemy.stunEffect = this.add.container(stunX, stunY);
    enemy.stunEffect.setDepth(2); // Above enemies

    // Create the ring base
    const ring = this.add.circle(0, 0, 15, 0xf0f0f0, 0);
    ring.setStrokeStyle(3, 0xf0f0f0, 0.8);
    enemy.stunEffect.add(ring);

    // Add stars orbiting the ring
    const starCount = 3;
    const stars = [];

    for (let i = 0; i < starCount; i++) {
        // Create a star shape
        const star = this.add.text(0, 0, "✶", {
            fontSize: '14px',
            color: '#FFFF00',
            stroke: '#000000',
            strokeThickness: 2
        });
        star.setOrigin(0.5);

        // Position it initially (will be animated)
        const angle = (i * Math.PI * 2) / starCount;
        star.x = Math.cos(angle) * 10;
        star.y = Math.sin(angle) * 10;

        enemy.stunEffect.add(star);
        stars.push(star);
    }

    // Animate the ring pulsing
    const ringTween = this.tweens.add({
        targets: ring,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.5,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // Animate the stars orbiting
    const starTweens = stars.map((star, index) => {
        return this.tweens.add({
            targets: star,
            angle: 360, // Use Phaser's angle property for rotation
            duration: 1500,
            repeat: -1,
            ease: 'Linear',
            onUpdate: (tween) => {
                // Calculate position based on the tween's angle property
                const currentAngleRad = ((index * Math.PI * 2) / starCount) + Phaser.Math.DegToRad(star.angle);
                star.x = Math.cos(currentAngleRad) * 10;
                star.y = Math.sin(currentAngleRad) * 10;
            }
        });
    });

    // Store tweens on the container so they can be stopped when the effect is destroyed
    enemy.stunEffect.setData('tweens', [ringTween, ...starTweens]);

    // Override destroy method to stop tweens
    enemy.stunEffect.destroy = function(fromScene) {
        const tweens = this.getData('tweens');
        if (tweens) {
            tweens.forEach(tween => tween.stop());
        }
        // Call the original Container destroy method
        Phaser.GameObjects.Container.prototype.destroy.call(this, fromScene);
    }
};

    // Create impact effect at hit location
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

    // 2. Make the Dash Trail White
    createDashTrailEffect(x, y) {
        // Create a white dash trail marker (changed from green to white)
        const trailMarker = this.add.circle(x, y, 15, 0xffffff, 0.4);
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
    // 3. Enhanced Knockback - Apply it independently of physics
    // Add this helper method to GameScreen.js
    applyEnhancedKnockback(entity, directionX, directionY, force) {
        if (!entity || entity.state === 'dead') return;

        console.log(`Applying enhanced knockback to ${entity.id} with force ${force}`);

        // Calculate normalized direction
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        if (length === 0) return;

        const normalizedX = directionX / length;
        const normalizedY = directionY / length;

        // Set a manual position change over time, independent of physics
        const knockbackDistance = force * 0.1; // Scale factor to control distance
        const knockbackDuration = 300; // milliseconds

        // Calculate target position
        const targetX = entity.x + normalizedX * knockbackDistance;
        const targetY = entity.y + normalizedY * knockbackDistance;

        console.log(`Knockback from (${entity.x}, ${entity.y}) to (${targetX}, ${targetY})`);

        // Create an object to tween that actually contains the entity's current position
        const tweenTarget = {
            x: entity.x,
            y: entity.y
        };

        // Use a tween for smooth motion
        this.tweens.add({
            targets: tweenTarget,  // Tween this object, not a temp object
            x: targetX,
            y: targetY,
            duration: knockbackDuration,
            ease: 'Power2Out',
            onUpdate: () => {
                // Update the entity's position from our tweened object
                entity.x = tweenTarget.x;
                entity.y = tweenTarget.y;
                console.log(`Knockback position updated: (${entity.x}, ${entity.y})`);
            },
            onComplete: () => {
                console.log(`Knockback complete for entity ${entity.id}`);
            }
        });
    }

    // 4. Enhanced Hit-Stop Effect - Scale with damage
    // Add this to GameScreen.js
    applyHitStop(attacker, target, damage) {
        // Scale hit-stop duration with damage (min 50ms, max 150ms)
        const baseDuration = 50;
        const maxDuration = 150;
        const damageScale = Math.min(1.0, damage / 100); // Normalized damage factor (100 damage = max duration)
        
        const hitStopDuration = baseDuration + (maxDuration - baseDuration) * damageScale;
        
        // Cache game speed
        const originalTimeScale = this.time.timeScale;
        
        // Almost freeze the game briefly
        this.time.timeScale = 0.05;
        
        // Resume normal time after duration
        this.time.delayedCall(hitStopDuration * 0.05, () => {
            // Gradually restore time scale for smoother transition
            this.tweens.add({
                targets: this.time,
                timeScale: originalTimeScale,
                duration: 100,
                ease: 'Power1Out'
            });
        });
    }


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
        // Destroy any remaining enemy visuals
        this.enemyVisuals.forEach(visual => visual.destroy());
        this.enemyVisuals.clear();
        this.enemies = []; // Clear the array
    }
} // End of GameScreen class