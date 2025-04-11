class Tile {
    /**
     * Creates a new Tile instance.
     * @param {string} type - The type of the tile (e.g., 'rock', 'sand', 'iron_deposit').
     * @param {any} decoration - Any decoration present on the tile (e.g., 'small_rock', 'crater_edge', null).
     */
    constructor(type, decoration = null) {
        this.type = type;
        this.decoration = decoration;
        // Add color property later based on Perlin noise generation
        this.color = '#000000'; // Default color
    }

    // Potential methods for Tile could be added later, e.g., update, draw
}

// Export the class
export default Tile;