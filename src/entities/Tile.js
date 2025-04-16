// src/entities/Tile.js

/**
 * Represents a single tile in the game world.
 */
export default class Tile {
    /**
     * Creates a new Tile instance.
     * @param {number} type - The type identifier for this tile (e.g., TILE_TYPES.NORMAL_GROUND).
     * @param {number} x - The tile's x position in tile coordinates.
     * @param {number} y - The tile's y position in tile coordinates.
     */
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.gameObject = null; // Reference to the Phaser GameObject representing this tile
    }

    // We might add methods later to handle interactions or visual updates
}

// Define Tile Types (can be moved to a constants file or WorldManager later)
export const TILE_TYPES = {
    NORMAL_GROUND: 0,
    LIGHT_GROUND: 1,
    ELEVATED_GROUND: 2,
    LIGHT_NORMAL_TRANSITION: 3,
    ELEVATED_TRANSITION: 4
};

// Define Tile Colors (can be moved to a constants file or WorldManager later)
export const COLORS = {
    NORMAL_GROUND: 0xc1440e,        // Rusty red
    LIGHT_GROUND: 0xe27b58,         // Light orange-red
    ELEVATED_GROUND: 0x83280b,      // Dark rusty brown
    LIGHT_NORMAL_TRANSITION: 0xd25a2b, // Medium rust
    ELEVATED_TRANSITION: 0x9e340c   // Dark red-brown
};