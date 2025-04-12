// import Phaser from 'phaser'; // Removed - Phaser is loaded globally via CDN
import WorldManager from '../entities/WorldManager.js';
import { Player } from '../entities/Player.js'; // Import your Player class
import { InputHandler } from '../entities/InputHandler.js'; // Import InputHandler
export default class GameScreen extends Phaser.Scene {
    constructor() {
        super('GameScreen');
        this.worldManager = null;
        this.player = null;         // Instance of your Player class
        this.playerVisual = null;   // Phaser GameObject for the player
        this.inputHandler = null;   // InputHandler instance
        // Removed cursors/wasd as InputHandler manages keys
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
        // Duplicate startY removed
        // --- Camera Setup ---
        this.cameras.main.startFollow(this.playerVisual); // Camera follows the visual object
        this.cameras.main.setZoom(0.75); // Zoom the camera out (30% of original 2.5)

        // Redundant comment removed
        this.cameras.main.setBackgroundColor('#2d2d2d');

        // Input setup is now handled by InputHandler and Player class

        // Initial chunk load
        // Initial chunk load based on player start position
        this.worldManager.update(this.player.x, this.player.y);

        // Add instructions text back
        // Update instructions text for Player class controls
        this.add.text(10, this.cameras.main.height - 30, 'Use WASD to move, Space to Dash, Q to Attack', {
             fontSize: '16px',
             fill: '#ffffff',
             backgroundColor: 'rgba(0,0,0,0.7)',
             padding: { x: 5, y: 3 }
         }).setScrollFactor(0).setDepth(10);
    }

    update(time, delta) {
        // Ensure all necessary components exist
        if (!this.player || !this.worldManager || !this.inputHandler || !this.playerVisual) return;

        // Update InputHandler first to capture current state
        this.inputHandler.update();

        // Update Player logic (handles input, physics, state)
        // Pass delta in seconds, and the scene as the 'world' context for interactions
        this.player.update(delta / 1000, this);

        // Sync the visual representation's position with the player data instance
        this.playerVisual.x = this.player.x;
        this.playerVisual.y = this.player.y;

        // Update world chunks based on the player data instance's position
        this.worldManager.update(this.player.x, this.player.y);

        // --- Debug Drawing ---
        // If your Player/Entity classes have debug draw methods that use a canvas context,
        // you would need a different approach in Phaser (e.g., using Graphics objects).
        // For now, we assume rendering is handled by the playerVisual.
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
        // Release references
        this.player = null;
        this.playerVisual = null;
    }
}