import Tile from './Tile.js';

class Chunk {
    /**
     * Creates a new Chunk instance.
     * @param {number} chunkX - The x-coordinate of the chunk in the world grid.
     * @param {number} chunkY - The y-coordinate of the chunk in the world grid.
     * @param {number} width - The width of the chunk in tiles.
     * @param {number} height - The height of the chunk in tiles.
     */
    constructor(chunkX, chunkY, width, height) {
        this.chunkX = chunkX;
        this.chunkY = chunkY;
        this.width = width;
        this.height = height;
        this.tiles = this._initializeTiles(); // 2D array of Tile objects
        this.needsGeneration = true; // Flag to indicate if terrain needs generating
    }

    /**
     * Initializes the tile grid with null values initially.
     * Actual tile generation will happen later.
     * @private
     */
    _initializeTiles() {
        const tiles = [];
        for (let y = 0; y < this.height; y++) {
            tiles[y] = new Array(this.width).fill(null);
        }
        return tiles;
    }

    /**
     * Gets the tile at the given local coordinates within the chunk.
     * @param {number} localX - The x-coordinate within the chunk (0 to width-1).
     * @param {number} localY - The y-coordinate within the chunk (0 to height-1).
     * @returns {Tile | null} The Tile object or null if coordinates are invalid.
     */
    getTile(localX, localY) {
        if (localX >= 0 && localX < this.width && localY >= 0 && localY < this.height) {
            return this.tiles[localY][localX];
        }
        return null; // Out of bounds
    }

    /**
     * Sets the tile at the given local coordinates within the chunk.
     * @param {number} localX - The x-coordinate within the chunk.
     * @param {number} localY - The y-coordinate within the chunk.
     * @param {Tile} tile - The Tile object to set.
     */
    setTile(localX, localY, tile) {
        if (localX >= 0 && localX < this.width && localY >= 0 && localY < this.height) {
            this.tiles[localY][localX] = tile;
        }
    }

    // Method to populate the chunk with tiles using Perlin noise will be added later
    // generateTerrain(noiseGenerator) { ... }

    // Method to draw the chunk might be needed
    // draw(context, offsetX, offsetY, tileSize) { ... }
}

// Export the class
export default Chunk;