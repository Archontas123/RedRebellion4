import Chunk from './Chunk.js';
import Tile from './Tile.js';
import { perlin3 } from 'perlin-noise';

class WorldManager {
    /**
     * Creates a new WorldManager instance.
     * @param {number} chunkSize - The width and height of each chunk in tiles.
     * @param {number} seed - Optional seed for the noise generator.
     */
    constructor(chunkSize = 16, seed = Math.random()) {
        this.chunkSize = chunkSize;
        this.chunks = new Map(); // Stores loaded chunks, key: "x,y"
        this.seed = seed; // Seed for procedural generation

        // Configure noise generator using the imported perlin3 function
        // The scaling factors (e.g., 0.05 below) control the "zoom" level of the noise.
        // Smaller values = larger features, larger values = smaller, more frequent features.
        // Adjust these values to get the desired terrain appearance.
        this.noiseGenerator = (x, y) => perlin3(x * 0.05, y * 0.05, this.seed);
    }

    /**
     * Generates a unique key for a chunk based on its coordinates.
     * @param {number} chunkX - The x-coordinate of the chunk.
     * @param {number} chunkY - The y-coordinate of the chunk.
     * @returns {string} The chunk key.
     */
    _getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    /**
     * Gets the chunk at the specified chunk coordinates. Loads or generates if not present.
     * @param {number} chunkX - The x-coordinate of the chunk.
     * @param {number} chunkY - The y-coordinate of the chunk.
     * @returns {Chunk} The requested chunk.
     */
    getChunk(chunkX, chunkY) {
        const key = this._getChunkKey(chunkX, chunkY);
        if (!this.chunks.has(key)) {
            this.loadChunk(chunkX, chunkY);
        }
        const chunk = this.chunks.get(key);
        if (chunk.needsGeneration) {
            this.generateChunk(chunk);
            chunk.needsGeneration = false;
        }
        return chunk;
    }

    /**
     * Gets the tile at the specified world coordinates.
     * @param {number} worldX - The x-coordinate in the world.
     * @param {number} worldY - The y-coordinate in the world.
     * @returns {Tile | null} The Tile object or null if the chunk isn't loaded.
     */
    getTile(worldX, worldY) {
        const chunkX = Math.floor(worldX / this.chunkSize);
        const chunkY = Math.floor(worldY / this.chunkSize);
        const localX = worldX % this.chunkSize;
        const localY = worldY % this.chunkSize;
        // Handle negative modulo correctly
        const correctedLocalX = (localX + this.chunkSize) % this.chunkSize;
        const correctedLocalY = (localY + this.chunkSize) % this.chunkSize;

        const chunk = this.getChunk(chunkX, chunkY);
        return chunk.getTile(correctedLocalX, correctedLocalY);
    }


    /**
     * Creates and stores a chunk instance, marking it for generation.
     * @param {number} chunkX - The x-coordinate of the chunk.
     * @param {number} chunkY - The y-coordinate of the chunk.
     */
    loadChunk(chunkX, chunkY) {
        const key = this._getChunkKey(chunkX, chunkY);
        if (!this.chunks.has(key)) {
            const newChunk = new Chunk(chunkX, chunkY, this.chunkSize, this.chunkSize);
            this.chunks.set(key, newChunk);
            // console.log(`Loaded chunk: ${key}`);
        }
    }

    /**
     * Generates the terrain tiles for a given chunk using Perlin noise.
     * @param {Chunk} chunk - The chunk to generate terrain for.
     */
    generateChunk(chunk) {
        // console.log(`Generating chunk: ${chunk.chunkX},${chunk.chunkY}`);
        for (let y = 0; y < chunk.height; y++) {
            for (let x = 0; x < chunk.width; x++) {
                // Calculate world coordinates for noise input
                const worldX = chunk.chunkX * this.chunkSize + x;
                const worldY = chunk.chunkY * this.chunkSize + y;

                // Get noise value (range depends on the noise function, typically -1 to 1 or 0 to 1)
                // Adjust noise input scale for different terrain features
                const noiseValue = this.noiseGenerator(worldX * 0.05, worldY * 0.05, this.seed); // Example scaling

                // Determine tile type and color based on noise value
                const { type, color, decoration } = this._getMarsTileDetails(noiseValue);

                const tile = new Tile(type, decoration);
                tile.color = color; // Assign the generated color
                chunk.setTile(x, y, tile);
            }
        }
    }

    /**
     * Determines tile details based on a noise value, mimicking Mars terrain.
     * @param {number} noiseValue - The Perlin noise value (normalized to 0-1 ideally).
     * @returns {{type: string, color: string, decoration: any}}
     * @private
     */
    _getMarsTileDetails(noiseValue) {
        // Normalize noiseValue to 0-1 if it's not already
        const normalizedValue = (noiseValue + 1) / 2; // Assuming noise is -1 to 1

        let type = 'regolith_low';
        let color = '#D2B48C'; // Tan (base)
        let decoration = null;

        // Define thresholds and corresponding Mars-like features
        if (normalizedValue > 0.85) {
            type = 'mountain_peak';
            color = '#A0522D'; // Sienna Brown (higher peaks)
            decoration = 'sharp_rock';
        } else if (normalizedValue > 0.7) {
            type = 'highland';
            color = '#CD853F'; // Peru (mid-high ground)
        } else if (normalizedValue > 0.55) {
            type = 'rocky_plain';
            color = '#B8860B'; // DarkGoldenrod (rockier plains)
            if (Math.random() < 0.1) decoration = 'small_boulder';
        } else if (normalizedValue > 0.4) {
            type = 'sandy_plain';
            color = '#D2B48C'; // Tan (sandier plains)
             if (Math.random() < 0.05) decoration = 'ripple_mark';
        } else if (normalizedValue > 0.25) {
             type = 'dusty_basin';
             color = '#BC8F8F'; // RosyBrown (low dusty areas)
        } else {
             type = 'deep_crater_floor';
             color = '#8B4513'; // SaddleBrown (darkest, lowest areas)
             if (Math.random() < 0.15) decoration = 'impact_glass';
        }

        // Add some randomness for iron deposits (example)
        if (type !== 'mountain_peak' && Math.random() < 0.02) {
             type = 'iron_deposit';
             color = '#A52A2A'; // Brown (iron look)
             decoration = 'ore_vein';
        }


        return { type, color, decoration };
    }

    /**
     * Loads chunks around a central point (e.g., the player's position).
     * @param {number} centerX - The world x-coordinate of the center.
     * @param {number} centerY - The world y-coordinate of the center.
     * @param {number} loadRadius - The radius of chunks to load around the center (in chunks).
     */
    loadChunksAround(centerX, centerY, loadRadius = 2) {
        const centerChunkX = Math.floor(centerX / this.chunkSize);
        const centerChunkY = Math.floor(centerY / this.chunkSize);

        for (let y = centerChunkY - loadRadius; y <= centerChunkY + loadRadius; y++) {
            for (let x = centerChunkX - loadRadius; x <= centerChunkX + loadRadius; x++) {
                this.getChunk(x, y); // This will load/generate if needed
            }
        }
        // Optional: Add logic here to unload chunks outside the radius later
    }

    // Method to draw the visible chunks might be needed
    // draw(context, cameraX, cameraY, viewWidth, viewHeight, tileSize) { ... }
}

// Export the class
export default WorldManager;