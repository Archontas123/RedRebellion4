// import Phaser from 'phaser'; // Removed - Phaser is loaded globally via CDN
import WorldManager from '../entities/WorldManager.js';
import { Player } from '../entities/Player.js';
import { InputHandler } from '../entities/InputHandler.js';
import { Enemy } from '../entities/Enemy.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { Plasma } from '../entities/Plasma.js'; // Import Plasma
import MiniMap from '../ui/MiniMap.js'; // Import MiniMap
import { Projectile } from '../entities/Projectile.js'; // Import Projectile

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
        this.plasmaCounterContainerElement = null; // The main div container
        this.plasmaCountElement = null; // The span holding the number
        // Removed Phaser health bar graphics
        this.healthBarFillElement = null; // Reference to the HTML health bar fill div
        this.healthBarContainerElement = null; // Reference to the HTML health bar container div
        // Removed: this.tileCoordsText = null; // UI Text for player tile coordinates (moved to HTML)
        this.miniMap = null; // Instance of the MiniMap UI handler
        this.tileCoordsElement = null; // Reference to the HTML coordinate display element
        this.projectiles = []; // Array to hold projectile instances
        this.projectileVisuals = new Map(); // Map projectile ID to Phaser GameObject
    }

    preload() {
        // --- Create White Dot Texture (existing) ---
        // Use add.graphics for white dot texture as well for consistency
        let graphics = this.add.graphics({ x: 0, y: 0 }); // Add directly
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('white_dot', 16, 16);
        graphics.destroy(); // Destroy after generating

        // Removed health_gradient texture generation

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
        // Get references to the HTML plasma counter elements and make container visible
        this.plasmaCounterContainerElement = document.getElementById('plasma-counter');
        this.plasmaCountElement = document.getElementById('plasma-count'); // Get the span for the count
        if (this.plasmaCounterContainerElement && this.plasmaCountElement) {
            this.plasmaCounterContainerElement.style.display = 'flex'; // Show the counter (use flex as set in CSS)
            this.plasmaCountElement.innerText = this.player.plasmaCount; // Initial value (just the number)

        }


        // --- Health Bar (Now handled by HTML/CSS) ---
        // Get reference to the HTML element once
        // Get references to HTML elements
        this.healthBarContainerElement = document.getElementById('health-bar-container');
        this.healthBarFillElement = document.getElementById('health-bar-fill');

        // Show the health bar container when the scene starts
        if (this.healthBarContainerElement) {
            this.healthBarContainerElement.style.display = 'block';
        } else {
            console.error("Health bar container element not found in HTML!");
        }
        if (!this.healthBarFillElement) {
            console.error("Health bar fill element not found in HTML!");
        }

        // Removed Phaser graphics creation for health bar







        // Removed: Phaser Tile Coordinates Text (moved to HTML)

        // --- HTML Tile Coordinates Setup ---
        this.tileCoordsElement = document.getElementById('tile-coords-display');
        if (this.tileCoordsElement) {
            this.tileCoordsElement.style.display = 'block'; // Show the element
        } else {
            console.error("Tile coordinates display element not found in HTML!");
        }
        // --- End HTML Tile Coordinates Setup ---
        // --- MiniMap Setup ---
        // Ensure player, managers are created before initializing minimap
        if (this.worldManager && this.player && this.enemyManager) {
            this.miniMap = new MiniMap(this.worldManager, this.player, this); // Pass scene as context
            this.miniMap.show(); // Make it visible
        } else {
            console.error("Failed to initialize MiniMap: Required components missing.");
        }

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
        if (this.enemyManager && this.worldManager) {
            // Get current loaded bounds from WorldManager
            const currentBounds = this.worldManager.getLoadedBounds();
            if (currentBounds) {
                // Pass the dynamic bounds to the EnemyManager
                this.enemyManager.setWorldBounds(currentBounds);
            }
            // Now update the EnemyManager, which will use the latest bounds for spawning
            this.enemyManager.update(dtSeconds);
        }

        // --- Update Enemies ---
        // Prepare world context for enemies
        const worldContext = {
            player: this.player,
            enemies: this.enemies,
            projectiles: this.projectiles // Pass the projectiles list
        };

        this.enemies.forEach(enemy => {
            if (enemy.state !== 'dead') { // Only update active enemies
                // Pass the world context object to the enemy's update method
                enemy.update(dtSeconds, worldContext);

                // Ensure visual exists for active enemy
                if (!this.enemyVisuals.has(enemy.id)) {
                    // Determine color based on enemy type
                    const enemyColor = (enemy.type === 'ranged_enemy') ? 0xffa500 : 0xff0000; // Orange for ranged, Red for others
                    const enemyVisual = this.add.rectangle(
                        enemy.x, enemy.y,
                        enemy.collisionBounds.width, // Use enemy's bounds
                        enemy.collisionBounds.height,
                        enemyColor // Use determined color
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

        // --- Update Projectiles ---
        this.projectiles.forEach(projectile => {
            projectile.update(dtSeconds);

            // Sync visual position
            const visual = this.projectileVisuals.get(projectile.id);
            if (visual) {
                visual.setPosition(projectile.x, projectile.y);
            }
        });
        // --- End Update Projectiles ---

        // --- Gameplay Collision Detection & Handling (Attacks, Damage, Pickups) ---
        // Run this *before* physics resolution to ensure attacks register based on intended positions
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
        // --- End Player-Item Collision Check ---

        // --- Projectile Collision Check ---
        this.projectiles.forEach(projectile => {
            if (projectile.state === 'dead') return; // Skip already dead projectiles

            // Check against Player (if projectile owner is not player)
            if (projectile.ownerId !== this.player.id && this.player.state !== 'dead') {
                if (projectile.checkCollision(this.player, dtSeconds)) {
                    console.log(`Projectile ${projectile.id} hit player ${this.player.id}`);
                    this.player.takeDamage(projectile.damage);
                    projectile.destroy(); // Mark projectile as dead using its destroy method
                    // Optional: Create impact effect at player location
                    this.createImpactEffect(this.player.x, this.player.y);
                }
            }

            // Check against Enemies (if projectile owner is not the enemy itself)
            this.enemies.forEach(enemy => {
                if (projectile.state === 'dead') return; // Skip if projectile already hit something
                // Additional check: Prevent enemy projectiles from hitting other enemies
                const isEnemyProjectile = projectile.type === 'enemy_projectile';
                const isTargetEnemy = (enemy.type === 'enemy' || enemy.type === 'ranged_enemy');

                if (enemy.state !== 'dead' && projectile.ownerId !== enemy.id && !(isEnemyProjectile && isTargetEnemy)) {
                    if (projectile.checkCollision(enemy, dtSeconds)) {
                        console.log(`Projectile ${projectile.id} hit enemy ${enemy.id}`);
                        enemy.takeDamage(projectile.damage);
                        projectile.destroy(); // Mark projectile as dead using its destroy method
                        // Optional: Create impact effect at enemy location
                        this.createImpactEffect(enemy.x, enemy.y);
                    }
                }
            });
        });
        // --- End Projectile Collision Check ---

        // --- End Gameplay Collision Detection ---


        // --- Physics Collision Resolution ---
        // Resolve collisions after gameplay logic (like attacks) has been processed
        const allEntities = [this.player, ...this.enemies].filter(e => e && e.state !== 'dead'); // Combine player and active enemies

        // Iterate multiple times for stability (optional but recommended)
        const resolutionIterations = 3;
        for (let iter = 0; iter < resolutionIterations; iter++) {
            for (let i = 0; i < allEntities.length; i++) {
                for (let j = i + 1; j < allEntities.length; j++) {
                    const entityA = allEntities[i];
                    const entityB = allEntities[j];

                    // Use checkCollision (AABB overlap)
                    if (entityA.checkCollision(entityB, 0)) { // Pass 0 for deltaTime as we only check current overlap
                        this.resolveCollision(entityA, entityB);
                    }
                }
            }
        }
        // --- End Physics Collision Resolution ---
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
        // --- End Remove collected/dead items ---

        // --- Remove dead projectiles ---
        this.projectiles = this.projectiles.filter(projectile => {
            if (projectile.state === 'dead') {
                const visual = this.projectileVisuals.get(projectile.id);
                if (visual) {
                    visual.destroy();
                    this.projectileVisuals.delete(projectile.id);
                }
                return false; // Remove from projectiles array
            }
            return true; // Keep in projectiles array
        });

        // Update world chunks based on the player data instance's position
        this.worldManager.update(this.player.x, this.player.y);

        // --- Update UI ---
        // Update HTML Plasma Counter
        if (this.plasmaCountElement && this.player) {
            this.plasmaCountElement.innerText = this.player.plasmaCount; // Update only the number
        }
        // --- HTML Health Bar Update ---
        if (this.healthBarFillElement && this.player) {
            const hpPercent = Math.max(0, this.player.health / this.player.maxHealth);
            const widthPercentage = hpPercent * 100;
            this.healthBarFillElement.style.width = `${widthPercentage}%`;
        }
        // --- End HTML Health Bar Update ---








// Removed: Update Phaser Tile Coordinates Text (moved to HTML)

// --- Update HTML Tile Coordinates ---
if (this.tileCoordsElement && this.player) {
    this.tileCoordsElement.innerText = `Tile: ${this.player.currentTileX}, ${this.player.currentTileY}`;
}
// --- End Update HTML Tile Coordinates ---

        // --- Update MiniMap ---
        if (this.miniMap) {
            this.miniMap.update();
        }

    } // End of update method

    // --- Collision Resolution Method ---
    resolveCollision(entityA, entityB) {
        if (!entityA || !entityB || entityA.state === 'dead' || entityB.state === 'dead') {
            return; // Don't resolve if one is dead or invalid
        }

        const boundsA = entityA.getAbsoluteBounds();
        const boundsB = entityB.getAbsoluteBounds();

        // Calculate overlap on each axis
        const overlapX = Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) - Math.max(boundsA.x, boundsB.x);
        const overlapY = Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height) - Math.max(boundsA.y, boundsB.y);

        if (overlapX <= 0 || overlapY <= 0) {
            return; // Should not happen if checkCollision passed, but safety check
        }

        // Determine the minimum translation vector (MTV) axis
        let pushX = 0;
        let pushY = 0;
        const tolerance = 0.1; // Small tolerance to prevent jittering due to floating point inaccuracies

        if (overlapX < overlapY) {
            // Push horizontally
            const pushAmount = overlapX + tolerance;
            // Determine direction: push A away from B's center
            if (boundsA.x + boundsA.width / 2 < boundsB.x + boundsB.width / 2) {
                pushX = -pushAmount / 2; // Push A left, B right
            } else {
                pushX = pushAmount / 2; // Push A right, B left
            }
        } else {
            // Push vertically
            const pushAmount = overlapY + tolerance;
            // Determine direction: push A away from B's center
            if (boundsA.y + boundsA.height / 2 < boundsB.y + boundsB.height / 2) {
                pushY = -pushAmount / 2; // Push A up, B down
            } else {
                pushY = pushAmount / 2; // Push A down, B up
            }
        }

        // Apply the separation - directly modify positions
        // Avoid pushing if an entity is stunned (optional, can make them feel more solid)
        if (!entityA.isStunned) {
            entityA.x += pushX;
            entityA.y += pushY;
        }
         if (!entityB.isStunned) {
            entityB.x -= pushX; // Apply opposite push to B
            entityB.y -= pushY;
        }

        // Optional: Dampen velocity slightly upon collision to prevent jitter
        // entityA.velocityX *= 0.9;
        // entityA.velocityY *= 0.9;
        // entityB.velocityX *= 0.9;
        // entityB.velocityY *= 0.9;
    }
    // --- End Collision Resolution Method ---

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
    // Hide HTML UI elements on death
    if (this.healthBarContainerElement) this.healthBarContainerElement.style.display = 'none';
    if (this.plasmaCounterContainerElement) this.plasmaCounterContainerElement.style.display = 'none';
    if (this.miniMap) this.miniMap.hide(); // Use MiniMap's hide method
    if (this.tileCoordsElement) this.tileCoordsElement.style.display = 'none'; // Hide coords

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

    // Show HTML UI elements on respawn
    if (this.healthBarContainerElement) this.healthBarContainerElement.style.display = 'block';
    if (this.plasmaCounterContainerElement) this.plasmaCounterContainerElement.style.display = 'flex'; // Use flex as per CSS
    if (this.miniMap) this.miniMap.show(); // Use MiniMap's show method
    if (this.tileCoordsElement) this.tileCoordsElement.style.display = 'block'; // Show coords

    // Update UI immediately
    // Update HTML Plasma Counter
    if (this.plasmaCountElement) {
        this.plasmaCountElement.innerText = this.player.plasmaCount; // Update only the number
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

// Method for MiniMap to get plasma items
getPlasmas() {
    return this.items.filter(item => item instanceof Plasma);
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
            // Determine default color based on type
            const defaultColor = (enemy.type === 'ranged_enemy') ? 0xffa500 : 0xff0000; // Orange for ranged, Red for others
            visual.setFillStyle(defaultColor); // Use determined default color
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
            // Determine default color based on type when resetting
            const defaultColor = (enemy.type === 'ranged_enemy') ? 0xffa500 : 0xff0000; // Orange for ranged, Red for others
            visual.setFillStyle(defaultColor); // Use determined default color
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

    // --- Projectile Creation ---
    createProjectile(x, y, direction, speed, damage, ownerId, type = 'projectile') {
        // Create the logical projectile instance
        const projectile = new Projectile(x, y, direction, speed, damage, ownerId, { type: type });
        this.projectiles.push(projectile);

        // Create the visual representation (e.g., a small circle)
        const visual = this.add.circle(x, y, 5, 0xffff00); // Yellow color for projectiles
        visual.setDepth(1.5); // Draw above player/enemies but below UI/debug
        this.projectileVisuals.set(projectile.id, visual);

        console.log(`Created projectile ${projectile.id} of type ${type} at (${x.toFixed(0)}, ${y.toFixed(0)}) owned by ${ownerId}`);
        return projectile;
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

    // --- Smoke Bomb Effect ---
    createSmokeBombEffect(x, y) {
        console.log(`Creating smoke bomb effect at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        const particleCount = 25;
        const duration = 800; // Longer duration for smoke
        const maxRadius = 80; // How far particles spread

        for (let i = 0; i < particleCount; i++) {
            // Create a grey circle particle
            const greyShade = Phaser.Math.Between(50, 150); // Random grey
            const particle = this.add.circle(x, y, Phaser.Math.Between(5, 15), `0x${greyShade.toString(16).repeat(3)}`, 0.7);
            particle.setDepth(1.8); // Above projectiles, below UI

            // Random angle and distance for spread
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * maxRadius;
            const targetX = x + Math.cos(angle) * radius;
            const targetY = y + Math.sin(angle) * radius;

            // Animate particle: move out, expand, fade
            this.tweens.add({
                targets: particle,
                x: targetX,
                y: targetY,
                scale: Phaser.Math.FloatBetween(2.0, 4.0), // Expand size
                alpha: 0,
                duration: duration * Phaser.Math.FloatBetween(0.7, 1.0), // Vary duration slightly
                ease: 'Quad.easeOut', // Ease out for slowing down effect
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
         // Optional: Add a brief screen shake?
        // this.cameras.main.shake(50, 0.005);
    }
    // --- End Smoke Bomb Effect ---

    // --- Melee Hit Effect ---
    createMeleeHitEffect(x, y) {
        console.log(`Creating melee hit effect at (${x.toFixed(0)}, ${y.toFixed(0)})`);
        // Create a central flash (e.g., red)
        const flash = this.add.circle(x, y, 25, 0xff0000, 0.7); // Red flash
        flash.setDepth(2); // Above most elements

        // Create expanding ring (e.g., darker red)
        const ring = this.add.circle(x, y, 10, 0xcc0000, 0);
        ring.setStrokeStyle(4, 0xcc0000, 0.8); // Darker red stroke
        ring.setDepth(2);

        // Create fewer particles than impact, maybe sharper
        const particleCount = 6;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            // Create a small red square/shard as a particle
            const particle = this.add.rectangle(x, y, 5, 5, 0xff0000, 0.9);
            particle.setDepth(2);

            // Random angle and speed
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 120; // Slightly different speed range
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;

            particles.push(particle);

            // Animate each particle
            this.tweens.add({
                targets: particle,
                x: particle.x + velocityX,
                y: particle.y + velocityY,
                alpha: 0,
                scale: 0.2, // Shrink particles
                angle: Phaser.Math.Between(-180, 180), // Add rotation
                duration: 250, // Faster duration
                ease: 'Power1',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }

        // Animate and then destroy the main effects
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 0.5, // Shrink flash
            duration: 150, // Quick flash
            ease: 'Power1',
            onComplete: () => {
                flash.destroy();
            }
        });

        this.tweens.add({
            targets: ring,
            scaleX: 3, // Smaller expansion than impact
            scaleY: 3,
            alpha: 0,
            duration: 250, // Faster expansion
            ease: 'Quad.easeOut',
            onComplete: () => {
                ring.destroy();
            }
        });

        // Optional: Less intense screen shake for melee hit?
        this.cameras.main.shake(80, 0.008);
        // this.cameras.main.shake(80, 0.008);
    }
    // --- End Melee Hit Effect ---

    shutdown() {
        console.log("Shutting down GameScreen..."); // Added console log back for consistency

        // Hide the HTML health bar when the scene shuts down
        if (this.healthBarContainerElement) {
            this.healthBarContainerElement.style.display = 'none';
        }
        // Hide the HTML plasma counter when the scene shuts down
        if (this.plasmaCounterContainerElement) {
            this.plasmaCounterContainerElement.style.display = 'none';
        }

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

        // Clean up MiniMap
        if (this.miniMap) {
            this.miniMap.hide();
            this.miniMap.clearAllDots(); // Ensure all DOM elements are removed
            this.miniMap = null;
        }
        // Hide coords on shutdown
        if (this.tileCoordsElement) {
             this.tileCoordsElement.style.display = 'none';
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
        this.enemies = []; // Clear the enemy array
        // Destroy any remaining projectile visuals
        this.projectileVisuals.forEach(visual => visual.destroy());
        this.projectileVisuals.clear();
        this.projectiles = []; // Clear the projectile array

    }
} // End of GameScreen class