// src/entities/Chunk.js
import Tile, { TILE_TYPES, COLORS } from './Tile.js';

// Simple noise function (adapted from provided HTML)
// Using sine waves for a smooth noise function
function noise(x, y, seed) {
    const value = Math.sin(x * 0.3 + seed) * Math.cos(y * 0.3 + seed);
    return (value + 1) / 2; // Normalize to 0-1
}

// Note: The more complex noise combinations from the HTML are now integrated
// directly into the generateTerrain method below.


/**
 * Represents a chunk of the game world, containing multiple tiles.
 */
export default class Chunk {
    /**
     * Creates a new Chunk instance.
     * @param {Phaser.Scene} scene - The scene this chunk belongs to.
     * @param {number} chunkX - The chunk's x position in chunk coordinates.
     * @param {number} chunkY - The chunk's y position in chunk coordinates.
     * @param {number} tileSize - The size of each tile in pixels.
     * @param {number} chunkSize - The size of the chunk in tiles (e.g., 16x16).
     * @param {number} seed - The world generation seed.
     */
    constructor(scene, chunkX, chunkY, tileSize, chunkSize, seed) {
        this.scene = scene;
        this.chunkX = chunkX;
        this.chunkY = chunkY;
        this.tileSize = tileSize;
        this.chunkSize = chunkSize;
        this.seed = seed;

        this.tiles = Array(chunkSize).fill(null).map(() => Array(chunkSize).fill(null)); // Keep tile data
        this.chunkPixelWidth = chunkSize * tileSize;
        this.chunkPixelHeight = chunkSize * tileSize;

        // Create a RenderTexture for the chunk visuals
        this.renderTexture = scene.add.renderTexture(
            chunkX * this.chunkPixelWidth,
            chunkY * this.chunkPixelHeight,
            this.chunkPixelWidth,
            this.chunkPixelHeight
        );
        this.renderTexture.setOrigin(0, 0); // Ensure texture aligns with world coordinates

        // No separate container needed if RenderTexture holds everything
        // this.container = scene.add.container(...) // Removed

        this.generateTerrain();
        this.createChunkTexture(); // Renamed method
    }

    /**
     * Generates the terrain data for this chunk using noise functions.
     * This adapts the logic from the original createChunk function. Populates `this.finalTerrain`.
     */
    generateTerrain() {
        // Create an expanded area for noise generation to ensure smooth edges across chunks
        const borderSize = 2; // Add a 2-tile border for better transitions
        const expandedSize = this.chunkSize + borderSize * 2;

        // Generate the raw noise maps first using the updated logic
        const rawNoise = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));
        const lightNoiseMap = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));
        const elevatedNoiseMap = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));

        for (let x = 0; x < expandedSize; x++) {
            for (let y = 0; y < expandedSize; y++) {
                const worldX = (this.chunkX * this.chunkSize) + x - borderSize;
                const worldY = (this.chunkY * this.chunkSize) + y - borderSize;

                // Use multiple noise functions with different frequencies and offsets for more varied shapes

                // Base noise - low frequency for large features
                const baseNoiseVal = noise(worldX * 0.03, worldY * 0.03, this.seed);

                // Detail noise - higher frequency for detail
                const detailNoiseVal = noise(worldX * 0.1 + 300, worldY * 0.1 + 300, this.seed);

                // Combine for more interesting patterns
                rawNoise[x][y] = (baseNoiseVal * 0.7) + (detailNoiseVal * 0.3);

                // Generate separate noise for light ground patches
                // Using different noise patterns (Perlin-like combination)
                const ln1 = noise(worldX * 0.08 + 500, worldY * 0.08 + 500, this.seed);
                const ln2 = noise(worldX * 0.15 + 700, worldY * 0.15 + 700, this.seed);
                lightNoiseMap[x][y] = (ln1 * 0.6) + (ln2 * 0.4);

                // Generate separate noise for elevated ground patches
                // Different pattern again
                const en1 = noise(worldX * 0.07 + 1000, worldY * 0.07 + 1000, this.seed);
                const en2 = noise(worldX * 0.12 + 1200, worldY * 0.12 + 1200, this.seed);
                // More varied elevated terrain
                elevatedNoiseMap[x][y] = (en1 * 0.7) + (en2 * 0.3);
            }
        }

        // Create the base terrain with normal ground as default
        const baseTerrain = Array(expandedSize).fill().map(() => Array(expandedSize).fill(TILE_TYPES.NORMAL_GROUND));

        // Add patches of light ground and elevated ground with more varied shapes
        for (let x = 0; x < expandedSize; x++) {
            for (let y = 0; y < expandedSize; y++) {
                // Light ground - use thresholding with more varied shapes
                if (lightNoiseMap[x][y] > 0.65) {
                    baseTerrain[x][y] = TILE_TYPES.LIGHT_GROUND;
                }

                // Elevated ground - completely independent from light ground
                // Use separate noise map
                if (elevatedNoiseMap[x][y] > 0.75) {
                    // Ensure elevated and light ground are separate
                    // This is the key change - ensuring they don't mix
                    const worldX = (this.chunkX * this.chunkSize) + x - borderSize;
                    const worldY = (this.chunkY * this.chunkSize) + y - borderSize;

                    // Use a different noise value to make the decision
                    const separationNoise = noise(worldX * 0.2 + 2000, worldY * 0.2 + 2000, this.seed);

                    // If this returns true, prioritize elevated ground
                    if (separationNoise > 0.4) {
                        baseTerrain[x][y] = TILE_TYPES.ELEVATED_GROUND;
                    }
                }
            }
        }

        // Create a distance map from each cell to the nearest different terrain type
        const distanceMap = Array(expandedSize).fill().map(() => Array(expandedSize).fill(100));

        // First pass: Identify direct boundaries (distance = 1)
        for (let x = 0; x < expandedSize; x++) {
            for (let y = 0; y < expandedSize; y++) {
                const currentType = baseTerrain[x][y];
                for (let nx = -1; nx <= 1; nx++) {
                    for (let ny = -1; ny <= 1; ny++) {
                        if ((nx === 0 && ny === 0) || (nx !== 0 && ny !== 0)) continue;
                        const checkX = x + nx;
                        const checkY = y + ny;
                        if (checkX < 0 || checkX >= expandedSize || checkY < 0 || checkY >= expandedSize) continue;
                        const neighborType = baseTerrain[checkX][checkY];
                        if (neighborType !== currentType) {
                            distanceMap[x][y] = 1; // This is a direct boundary
                            break;
                        }
                    }
                    if (distanceMap[x][y] === 1) break;
                }
            }
        }

        // Create final terrain with transitions
        this.finalTerrain = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));

        // Apply transitions only to direct boundary tiles
        for (let x = 0; x < expandedSize; x++) {
            for (let y = 0; y < expandedSize; y++) {
                const currentType = baseTerrain[x][y];

                if (distanceMap[x][y] === 1) {
                    // This is a direct boundary tile
                    let neighborTypes = [];
                    for (let nx = -1; nx <= 1; nx++) {
                        for (let ny = -1; ny <= 1; ny++) {
                            if ((nx === 0 && ny === 0) || (nx !== 0 && ny !== 0)) continue;
                            const checkX = x + nx;
                            const checkY = y + ny;
                            if (checkX < 0 || checkX >= expandedSize || checkY < 0 || checkY >= expandedSize) continue;
                            const neighborType = baseTerrain[checkX][checkY];
                            if (neighborType !== currentType) {
                                neighborTypes.push(neighborType);
                            }
                        }
                    }

                    // Determine which transition to use (updated logic)
                    const hasElevatedNeighbor = neighborTypes.includes(TILE_TYPES.ELEVATED_GROUND);
                    const isElevated = currentType === TILE_TYPES.ELEVATED_GROUND;

                    if (hasElevatedNeighbor || isElevated) {
                        this.finalTerrain[x][y] = TILE_TYPES.ELEVATED_TRANSITION;
                    } else if ((currentType === TILE_TYPES.NORMAL_GROUND && neighborTypes.includes(TILE_TYPES.LIGHT_GROUND)) ||
                               (currentType === TILE_TYPES.LIGHT_GROUND && neighborTypes.includes(TILE_TYPES.NORMAL_GROUND))) {
                        this.finalTerrain[x][y] = TILE_TYPES.LIGHT_NORMAL_TRANSITION;
                    } else {
                        this.finalTerrain[x][y] = currentType;
                    }
                } else {
                    // Not a boundary, use original terrain
                    this.finalTerrain[x][y] = currentType;
                }
            }
        }

        // Fix for double transitions at corners (updated logic)
        for (let x = 0; x < expandedSize; x++) {
            for (let y = 0; y < expandedSize; y++) {
                const currentType = this.finalTerrain[x][y];

                if (currentType === TILE_TYPES.LIGHT_NORMAL_TRANSITION || currentType === TILE_TYPES.ELEVATED_TRANSITION) {
                    let adjacentBaseTypes = [];
                    for (let nx = -1; nx <= 1; nx++) {
                        for (let ny = -1; ny <= 1; ny++) {
                            if ((nx === 0 && ny === 0) || (nx !== 0 && ny !== 0)) continue;
                            const checkX = x + nx;
                            const checkY = y + ny;
                            if (checkX < 0 || checkX >= expandedSize || checkY < 0 || checkY >= expandedSize) continue;
                            const neighborType = this.finalTerrain[checkX][checkY];
                            if (neighborType === TILE_TYPES.NORMAL_GROUND ||
                                neighborType === TILE_TYPES.LIGHT_GROUND ||
                                neighborType === TILE_TYPES.ELEVATED_GROUND) {
                                adjacentBaseTypes.push(neighborType);
                            }
                        }
                    }

                    const uniqueTypes = new Set(adjacentBaseTypes);

                    if (uniqueTypes.size < 2) {
                        if (adjacentBaseTypes.length > 0) {
                            this.finalTerrain[x][y] = adjacentBaseTypes[0]; // Revert to dominant neighbor
                        }
                    } else if (currentType === TILE_TYPES.ELEVATED_TRANSITION) {
                        if (!uniqueTypes.has(TILE_TYPES.ELEVATED_GROUND)) {
                            // Wrong transition, revert/change
                            if (uniqueTypes.has(TILE_TYPES.LIGHT_GROUND) && uniqueTypes.has(TILE_TYPES.NORMAL_GROUND)) {
                                this.finalTerrain[x][y] = TILE_TYPES.LIGHT_NORMAL_TRANSITION;
                            } else if (adjacentBaseTypes.length > 0) {
                                this.finalTerrain[x][y] = adjacentBaseTypes[0];
                            }
                        }
                    } else if (currentType === TILE_TYPES.LIGHT_NORMAL_TRANSITION) {
                        if (!(uniqueTypes.has(TILE_TYPES.LIGHT_GROUND) && uniqueTypes.has(TILE_TYPES.NORMAL_GROUND))) {
                             // Wrong transition, revert
                             if (adjacentBaseTypes.length > 0) {
                                this.finalTerrain[x][y] = adjacentBaseTypes[0];
                             }
                        }
                    }
                }
            }
        }
    } // End of generateTerrain method

    /**
     * Draws the generated terrain onto the chunk's RenderTexture.
     */
    createChunkTexture() {
        const borderSize = 2; // Must match the border size used in generateTerrain
        const tempGraphics = this.scene.make.graphics({ add: false }); // Use temporary Graphics for drawing

        this.renderTexture.clear(); // Clear previous texture content if any

        for (let x = 0; x < this.chunkSize; x++) {
            for (let y = 0; y < this.chunkSize; y++) {
                // Get the tile type from the generated terrain (offset by border)
                const tileType = this.finalTerrain[x + borderSize][y + borderSize];

                // Map tile type to color
                let groundColor;
                switch (tileType) {
                    case TILE_TYPES.NORMAL_GROUND: groundColor = COLORS.NORMAL_GROUND; break;
                    case TILE_TYPES.LIGHT_GROUND: groundColor = COLORS.LIGHT_GROUND; break;
                    case TILE_TYPES.ELEVATED_GROUND: groundColor = COLORS.ELEVATED_GROUND; break;
                    case TILE_TYPES.LIGHT_NORMAL_TRANSITION: groundColor = COLORS.LIGHT_NORMAL_TRANSITION; break;
                    case TILE_TYPES.ELEVATED_TRANSITION: groundColor = COLORS.ELEVATED_TRANSITION; break;
                    default: groundColor = 0xffffff; // Default white for unknown
                }

                // Create tile data object (still useful for game logic)
                const tileWorldX = this.chunkX * this.chunkSize + x;
                const tileWorldY = this.chunkY * this.chunkSize + y;
                const tile = new Tile(tileType, tileWorldX, tileWorldY);
                this.tiles[x][y] = tile; // Store tile data

                // --- Draw tile onto RenderTexture using temp Graphics ---
                const drawX = x * this.tileSize;
                const drawY = y * this.tileSize;

                // Draw filled rectangle for color
                tempGraphics.fillStyle(groundColor, 1);
                tempGraphics.fillRect(drawX, drawY, this.tileSize, this.tileSize);

                // Draw grid lines (stroke rectangle)
                tempGraphics.lineStyle(1, 0x000000, 0.3); // Black grid lines with low alpha
                tempGraphics.strokeRect(drawX, drawY, this.tileSize, this.tileSize);
            }
        }

        // Draw the accumulated graphics onto the RenderTexture
        this.renderTexture.draw(tempGraphics);

        // Clean up temporary graphics object
        tempGraphics.destroy();

        // No need to store gameObject reference in Tile anymore
        // tile.gameObject = tileRect; // Removed
    } // End of createChunkTexture method

    /**
     * Destroys the chunk and its associated GameObjects.
     */
    destroy() {
        // Destroy the RenderTexture
        if (this.renderTexture) {
            this.renderTexture.destroy();
            this.renderTexture = null;
        }
        // Container was removed, no need to destroy it separately
        this.tiles = null; // Clear references
        this.scene = null;
    }
}