// import Phaser from 'phaser'; // Removed - Phaser is loaded globally via CDN
import WorldManager from '../entities/WorldManager.js';
import { Player } from '../entities/Player.js'; // Import your Player class
import { InputHandler } from '../entities/InputHandler.js'; // Import InputHandler
import { Enemy } from '../entities/Enemy.js'; // Import Enemy class
import { EnemyManager } from '../entities/EnemyManager.js'; // Import EnemyManager
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
    }

    preload() {
        // No assets needed for basic terrain/player yet
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

        // --- Update Enemies (Managed by GameScreen loop, populated by EnemyManager) ---
        const worldContext = this; // The scene itself provides context (like this.player)
        this.enemies.forEach(enemy => {
            if (enemy.state !== 'dead') { // Only update active enemies
                enemy.update(dtSeconds, worldContext);

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
                }
            }
        });

        // --- Collision Detection & Handling ---
        if (this.player.state !== 'dead') {
            this.enemies.forEach(enemy => {
                if (enemy.state !== 'dead') {
                    // Use the checkCollision method from Entity.js
                    if (this.player.checkCollision(enemy, dtSeconds)) {
                        // Collision detected! Call handleCollision on both entities.
                        this.player.handleCollision(enemy);
                        enemy.handleCollision(this.player);
                    }
                }
            });
        }
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

        // Remove dead enemies from the scene's list
        // This ensures they stop being updated and drawn by the scene loop
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.state === 'dead') {
                // Handle enemy visual removal
                const visual = this.enemyVisuals.get(enemy.id);
                if (visual) {
                    visual.destroy();
                    this.enemyVisuals.delete(enemy.id);
                }
                return false; // Remove from scene's array
            }
            return true; // Keep in scene's array
        });


        // Update world chunks based on the player data instance's position
        this.worldManager.update(this.player.x, this.player.y);

        // Commenting out the old placeholder
        // // If your Player/Entity classes have debug draw methods that use a canvas context,
        // // you would need a different approach in Phaser (e.g., using Graphics objects).
        // // For now, we assume rendering is handled by the playerVisual.
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
}