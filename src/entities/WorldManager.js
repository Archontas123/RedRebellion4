// src/entities/WorldManager.js
import Chunk from './Chunk.js';

/**
 * Manages the loading and unloading of world chunks based on player position.
 */
export default class WorldManager {
    /**
     * Creates a new WorldManager instance.
     * @param {Phaser.Scene} scene - The scene this manager belongs to.
     * @param {object} config - Configuration object.
     * @param {number} config.tileSize - Size of each tile in pixels.
     * @param {number} config.chunkSize - Size of each chunk in tiles (width and height).
     * @param {number} config.renderDistance - How many chunks to load around the player (radius).
     * @param {number} [config.seed] - Optional seed for terrain generation. Defaults to random.
     */
    constructor(scene, config) {
        this.scene = scene;
        this.tileSize = config.tileSize;
        this.chunkSize = config.chunkSize;
        this.renderDistance = config.renderDistance;
        this.seed = config.seed !== undefined ? config.seed : Math.random() * 10000;

        this.loadedChunks = {}; // Store loaded chunks, keyed by "x,y"
        // this.mapContainer = this.scene.add.container(0, 0); // Removed - Chunks now use RenderTextures added directly to scene
    }

    /**
     * Generates a unique key for a chunk based on its coordinates.
     * @param {number} chunkX - Chunk's X coordinate.
     * @param {number} chunkY - Chunk's Y coordinate.
     * @returns {string} The chunk key.
     */
    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    /**
     * Loads a chunk at the specified coordinates if it's not already loaded.
     * @param {number} chunkX - Chunk's X coordinate.
     * @param {number} chunkY - Chunk's Y coordinate.
     */
    loadChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        if (!this.loadedChunks[key]) {
            console.log(`Loading chunk: ${key}`); // For debugging
            const chunk = new Chunk(this.scene, chunkX, chunkY, this.tileSize, this.chunkSize, this.seed);
            this.loadedChunks[key] = chunk;
            // chunk.renderTexture is already added to the scene in its constructor
            // No need to add it to a separate container here
            // this.mapContainer.add(chunk.renderTexture); // Removed
        }
    }

    /**
     * Unloads a chunk at the specified coordinates.
     * @param {number} chunkX - Chunk's X coordinate.
     * @param {number} chunkY - Chunk's Y coordinate.
     */
    unloadChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        if (this.loadedChunks[key]) {
            console.log(`Unloading chunk: ${key}`); // For debugging
            this.loadedChunks[key].destroy();
            delete this.loadedChunks[key];
        }
    }

    /**
     * Converts world (pixel) coordinates to global tile coordinates.
     * @param {number} worldX - The world X coordinate in pixels.
     * @param {number} worldY - The world Y coordinate in pixels.
     * @returns {{tileX: number, tileY: number}} An object containing the corresponding tile coordinates.
     */
    worldToTileCoords(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        return { tileX, tileY };
    }

    /**
     * Converts global tile coordinates to world (pixel) coordinates (center of the tile).
     * @param {number} tileX - The global tile X coordinate.
     * @param {number} tileY - The global tile Y coordinate.
     * @returns {{worldX: number, worldY: number}} An object containing the corresponding world coordinates (center of the tile).
     */
    tileToWorldCoords(tileX, tileY) {
        const worldX = tileX * this.tileSize + this.tileSize / 2;
        const worldY = tileY * this.tileSize + this.tileSize / 2;
        return { worldX, worldY };
    }

    /**
     * Gets the tile at the specified global tile coordinates.
     * Returns null if the chunk containing the tile is not loaded.
     * @param {number} tileX - The global tile X coordinate.
     * @param {number} tileY - The global tile Y coordinate.
     * @returns {Tile|null} The Tile object at the given coordinates, or null if not loaded.
     */
    getTileAt(tileX, tileY) {
        const chunkX = Math.floor(tileX / this.chunkSize);
        const chunkY = Math.floor(tileY / this.chunkSize);
        const key = this.getChunkKey(chunkX, chunkY);

        if (this.loadedChunks[key]) {
            const localTileX = tileX % this.chunkSize;
            const localTileY = tileY % this.chunkSize;
            // Adjust for negative modulo result if necessary
            const finalLocalX = localTileX < 0 ? localTileX + this.chunkSize : localTileX;
            const finalLocalY = localTileY < 0 ? localTileY + this.chunkSize : localTileY;
            return this.loadedChunks[key].getTile(finalLocalX, finalLocalY);
        }

        return null; // Chunk not loaded
    }


    /**
     * Updates the loaded chunks based on the player's current position.
     * Should be called in the scene's update loop.
     * @param {number} playerX - Player's world X coordinate.
     * @param {number} playerY - Player's world Y coordinate.
     */
    update(playerX, playerY) {
        // Use the new conversion function
        const { tileX: playerTileX, tileY: playerTileY } = this.worldToTileCoords(playerX, playerY);
        const playerChunkX = Math.floor(playerTileX / this.chunkSize);
        const playerChunkY = Math.floor(playerTileY / this.chunkSize);


        const chunksToKeep = {};

        // Load chunks around the player
        for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
            for (let y = playerChunkY - this.renderDistance; y <= playerChunkY + this.renderDistance; y++) {
                const key = this.getChunkKey(x, y);
                chunksToKeep[key] = true;
                this.loadChunk(x, y);
            }
        }

        // Unload chunks that are too far away
        for (const key in this.loadedChunks) {
            if (!chunksToKeep[key]) {
                const coords = key.split(',');
                this.unloadChunk(parseInt(coords[0], 10), parseInt(coords[1], 10));
            }
        }
    }

    /**
     * Destroys the world manager and all loaded chunks.
     */
    destroy() {
        for (const key in this.loadedChunks) {
             const coords = key.split(',');
             this.unloadChunk(parseInt(coords[0], 10), parseInt(coords[1], 10));
        }
        // this.mapContainer.destroy(); // Removed - No container to destroy
        this.loadedChunks = {};
        this.scene = null;
    }
}