// src/entities/WorldManager.js
import Chunk from './Chunk.js';
import { TILE_TYPES } from './Tile.js'; // Import TILE_TYPES

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
            // Access the tiles array directly instead of calling a non-existent method
            if (this.loadedChunks[key].tiles && this.loadedChunks[key].tiles[finalLocalX]) {
                 return this.loadedChunks[key].tiles[finalLocalX][finalLocalY];
            }
            return null; // Tile array or row not found (shouldn't happen if chunk loaded correctly)
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
     * Calculates the approximate world boundaries based on currently loaded chunks.
     * @returns {{minX: number, minY: number, maxX: number, maxY: number, centerX: number, centerY: number, width: number, height: number} | null}
     *          An object representing the bounds, or null if no chunks are loaded.
     */
    getLoadedBounds() {
        const keys = Object.keys(this.loadedChunks);
        if (keys.length === 0) {
            return null; // No chunks loaded
        }

        let minChunkX = Infinity, maxChunkX = -Infinity;
        let minChunkY = Infinity, maxChunkY = -Infinity;

        keys.forEach(key => {
            const [chunkX, chunkY] = key.split(',').map(Number);
            minChunkX = Math.min(minChunkX, chunkX);
            maxChunkX = Math.max(maxChunkX, chunkX);
            minChunkY = Math.min(minChunkY, chunkY);
            maxChunkY = Math.max(maxChunkY, chunkY);
        });

        // Calculate world coordinates (pixel boundaries)
        const minX = minChunkX * this.chunkSize * this.tileSize;
        const minY = minChunkY * this.chunkSize * this.tileSize;
        // Add 1 because the max chunk coordinate refers to the top-left corner of that chunk
        const maxX = (maxChunkX + 1) * this.chunkSize * this.tileSize;
        const maxY = (maxChunkY + 1) * this.chunkSize * this.tileSize;

        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;


        return { minX, minY, maxX, maxY, centerX, centerY, width, height };
    }
    /**
     * Attempts to find a random valid (walkable and within loaded bounds) world position
     * within a specified radius range from a center point, while avoiding another point.
     * @param {number} centerX - The center X coordinate to search around.
     * @param {number} centerY - The center Y coordinate to search around.
     * @param {number} minRadius - The minimum distance from the center.
     * @param {number} maxRadius - The maximum distance from the center.
     * @param {number} avoidX - The X coordinate of the point to avoid.
     * @param {number} avoidY - The Y coordinate of the point to avoid.
     * @param {number} avoidRadius - The minimum distance to maintain from the avoid point.
     * @param {number} [maxAttempts=20] - Maximum number of attempts to find a valid position.
     * @returns {{x: number, y: number} | null} The coordinates of a valid position, or null if none found.
     */
    findRandomValidPositionNear(centerX, centerY, minRadius, maxRadius, avoidX, avoidY, avoidRadius, maxAttempts = 20) {
        const loadedBounds = this.getLoadedBounds();
        if (!loadedBounds) {
            console.warn("findRandomValidPositionNear: No loaded bounds available.");
            return null; // Cannot determine validity without bounds
        }

        const avoidRadiusSq = avoidRadius * avoidRadius;

        for (let i = 0; i < maxAttempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = minRadius + Math.random() * (maxRadius - minRadius);
            const targetX = centerX + Math.cos(angle) * distance;
            const targetY = centerY + Math.sin(angle) * distance;

            // 1. Check against loaded bounds
            if (targetX < loadedBounds.minX || targetX > loadedBounds.maxX ||
                targetY < loadedBounds.minY || targetY > loadedBounds.maxY) {
                continue; // Outside loaded area
            }

            // 2. Check against avoidance zone
            const dxAvoid = targetX - avoidX;
            const dyAvoid = targetY - avoidY;
            if (dxAvoid * dxAvoid + dyAvoid * dyAvoid < avoidRadiusSq) {
                continue; // Too close to the point to avoid
            }

            // 3. Check if the tile is valid/walkable
            const { tileX, tileY } = this.worldToTileCoords(targetX, targetY);
            const tile = this.getTileAt(tileX, tileY);

            // Check walkability based on tile type
            const walkableTypes = [
                TILE_TYPES.NORMAL_GROUND,
                TILE_TYPES.LIGHT_GROUND,
                TILE_TYPES.LIGHT_NORMAL_TRANSITION
            ];
            if (tile && walkableTypes.includes(tile.type)) {
                 console.log(`findRandomValidPositionNear: Found valid position (type: ${tile.type}) on attempt ${i + 1} at (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
                return { x: targetX, y: targetY }; // Found a valid spot
            }
        }

        console.warn(`findRandomValidPositionNear: Failed to find a valid position after ${maxAttempts} attempts.`);
        return null; // Failed to find a suitable position
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