(() => {
  // src/entities/Tile.js
  var Tile = class {
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
      this.gameObject = null;
    }
    // We might add methods later to handle interactions or visual updates
  };
  var TILE_TYPES = {
    NORMAL_GROUND: 0,
    LIGHT_GROUND: 1,
    ELEVATED_GROUND: 2,
    LIGHT_NORMAL_TRANSITION: 3,
    ELEVATED_TRANSITION: 4
  };
  var COLORS = {
    NORMAL_GROUND: 12665870,
    // Rusty red
    LIGHT_GROUND: 14842712,
    // Light orange-red
    ELEVATED_GROUND: 8595467,
    // Dark rusty brown
    LIGHT_NORMAL_TRANSITION: 13785643,
    // Medium rust
    ELEVATED_TRANSITION: 10368012
    // Dark red-brown
  };

  // src/entities/Chunk.js
  function noise(x, y, seed) {
    const value = Math.sin(x * 0.3 + seed) * Math.cos(y * 0.3 + seed);
    return (value + 1) / 2;
  }
  var Chunk = class {
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
      this.tiles = Array(chunkSize).fill(null).map(() => Array(chunkSize).fill(null));
      this.chunkPixelWidth = chunkSize * tileSize;
      this.chunkPixelHeight = chunkSize * tileSize;
      this.renderTexture = scene.add.renderTexture(
        chunkX * this.chunkPixelWidth,
        chunkY * this.chunkPixelHeight,
        this.chunkPixelWidth,
        this.chunkPixelHeight
      );
      this.renderTexture.setOrigin(0, 0);
      this.generateTerrain();
      this.createChunkTexture();
    }
    /**
     * Generates the terrain data for this chunk using noise functions.
     * This adapts the logic from the original createChunk function. Populates `this.finalTerrain`.
     */
    generateTerrain() {
      const borderSize = 2;
      const expandedSize = this.chunkSize + borderSize * 2;
      const rawNoise = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));
      const lightNoiseMap = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));
      const elevatedNoiseMap = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));
      for (let x = 0; x < expandedSize; x++) {
        for (let y = 0; y < expandedSize; y++) {
          const worldX = this.chunkX * this.chunkSize + x - borderSize;
          const worldY = this.chunkY * this.chunkSize + y - borderSize;
          const baseNoiseVal = noise(worldX * 0.03, worldY * 0.03, this.seed);
          const detailNoiseVal = noise(worldX * 0.1 + 300, worldY * 0.1 + 300, this.seed);
          rawNoise[x][y] = baseNoiseVal * 0.7 + detailNoiseVal * 0.3;
          const ln1 = noise(worldX * 0.08 + 500, worldY * 0.08 + 500, this.seed);
          const ln2 = noise(worldX * 0.15 + 700, worldY * 0.15 + 700, this.seed);
          lightNoiseMap[x][y] = ln1 * 0.6 + ln2 * 0.4;
          const en1 = noise(worldX * 0.07 + 1e3, worldY * 0.07 + 1e3, this.seed);
          const en2 = noise(worldX * 0.12 + 1200, worldY * 0.12 + 1200, this.seed);
          elevatedNoiseMap[x][y] = en1 * 0.7 + en2 * 0.3;
        }
      }
      const baseTerrain = Array(expandedSize).fill().map(() => Array(expandedSize).fill(TILE_TYPES.NORMAL_GROUND));
      for (let x = 0; x < expandedSize; x++) {
        for (let y = 0; y < expandedSize; y++) {
          if (lightNoiseMap[x][y] > 0.65) {
            baseTerrain[x][y] = TILE_TYPES.LIGHT_GROUND;
          }
          if (elevatedNoiseMap[x][y] > 0.75) {
            const worldX = this.chunkX * this.chunkSize + x - borderSize;
            const worldY = this.chunkY * this.chunkSize + y - borderSize;
            const separationNoise = noise(worldX * 0.2 + 2e3, worldY * 0.2 + 2e3, this.seed);
            if (separationNoise > 0.4) {
              baseTerrain[x][y] = TILE_TYPES.ELEVATED_GROUND;
            }
          }
        }
      }
      const distanceMap = Array(expandedSize).fill().map(() => Array(expandedSize).fill(100));
      for (let x = 0; x < expandedSize; x++) {
        for (let y = 0; y < expandedSize; y++) {
          const currentType = baseTerrain[x][y];
          for (let nx = -1; nx <= 1; nx++) {
            for (let ny = -1; ny <= 1; ny++) {
              if (nx === 0 && ny === 0 || nx !== 0 && ny !== 0) continue;
              const checkX = x + nx;
              const checkY = y + ny;
              if (checkX < 0 || checkX >= expandedSize || checkY < 0 || checkY >= expandedSize) continue;
              const neighborType = baseTerrain[checkX][checkY];
              if (neighborType !== currentType) {
                distanceMap[x][y] = 1;
                break;
              }
            }
            if (distanceMap[x][y] === 1) break;
          }
        }
      }
      this.finalTerrain = Array(expandedSize).fill().map(() => Array(expandedSize).fill(0));
      for (let x = 0; x < expandedSize; x++) {
        for (let y = 0; y < expandedSize; y++) {
          const currentType = baseTerrain[x][y];
          if (distanceMap[x][y] === 1) {
            let neighborTypes = [];
            for (let nx = -1; nx <= 1; nx++) {
              for (let ny = -1; ny <= 1; ny++) {
                if (nx === 0 && ny === 0 || nx !== 0 && ny !== 0) continue;
                const checkX = x + nx;
                const checkY = y + ny;
                if (checkX < 0 || checkX >= expandedSize || checkY < 0 || checkY >= expandedSize) continue;
                const neighborType = baseTerrain[checkX][checkY];
                if (neighborType !== currentType) {
                  neighborTypes.push(neighborType);
                }
              }
            }
            const hasElevatedNeighbor = neighborTypes.includes(TILE_TYPES.ELEVATED_GROUND);
            const isElevated = currentType === TILE_TYPES.ELEVATED_GROUND;
            if (hasElevatedNeighbor || isElevated) {
              this.finalTerrain[x][y] = TILE_TYPES.ELEVATED_TRANSITION;
            } else if (currentType === TILE_TYPES.NORMAL_GROUND && neighborTypes.includes(TILE_TYPES.LIGHT_GROUND) || currentType === TILE_TYPES.LIGHT_GROUND && neighborTypes.includes(TILE_TYPES.NORMAL_GROUND)) {
              this.finalTerrain[x][y] = TILE_TYPES.LIGHT_NORMAL_TRANSITION;
            } else {
              this.finalTerrain[x][y] = currentType;
            }
          } else {
            this.finalTerrain[x][y] = currentType;
          }
        }
      }
      for (let x = 0; x < expandedSize; x++) {
        for (let y = 0; y < expandedSize; y++) {
          const currentType = this.finalTerrain[x][y];
          if (currentType === TILE_TYPES.LIGHT_NORMAL_TRANSITION || currentType === TILE_TYPES.ELEVATED_TRANSITION) {
            let adjacentBaseTypes = [];
            for (let nx = -1; nx <= 1; nx++) {
              for (let ny = -1; ny <= 1; ny++) {
                if (nx === 0 && ny === 0 || nx !== 0 && ny !== 0) continue;
                const checkX = x + nx;
                const checkY = y + ny;
                if (checkX < 0 || checkX >= expandedSize || checkY < 0 || checkY >= expandedSize) continue;
                const neighborType = this.finalTerrain[checkX][checkY];
                if (neighborType === TILE_TYPES.NORMAL_GROUND || neighborType === TILE_TYPES.LIGHT_GROUND || neighborType === TILE_TYPES.ELEVATED_GROUND) {
                  adjacentBaseTypes.push(neighborType);
                }
              }
            }
            const uniqueTypes = new Set(adjacentBaseTypes);
            if (uniqueTypes.size < 2) {
              if (adjacentBaseTypes.length > 0) {
                this.finalTerrain[x][y] = adjacentBaseTypes[0];
              }
            } else if (currentType === TILE_TYPES.ELEVATED_TRANSITION) {
              if (!uniqueTypes.has(TILE_TYPES.ELEVATED_GROUND)) {
                if (uniqueTypes.has(TILE_TYPES.LIGHT_GROUND) && uniqueTypes.has(TILE_TYPES.NORMAL_GROUND)) {
                  this.finalTerrain[x][y] = TILE_TYPES.LIGHT_NORMAL_TRANSITION;
                } else if (adjacentBaseTypes.length > 0) {
                  this.finalTerrain[x][y] = adjacentBaseTypes[0];
                }
              }
            } else if (currentType === TILE_TYPES.LIGHT_NORMAL_TRANSITION) {
              if (!(uniqueTypes.has(TILE_TYPES.LIGHT_GROUND) && uniqueTypes.has(TILE_TYPES.NORMAL_GROUND))) {
                if (adjacentBaseTypes.length > 0) {
                  this.finalTerrain[x][y] = adjacentBaseTypes[0];
                }
              }
            }
          }
        }
      }
    }
    // End of generateTerrain method
    /**
     * Draws the generated terrain onto the chunk's RenderTexture.
     */
    createChunkTexture() {
      const borderSize = 2;
      const tempGraphics = this.scene.make.graphics({ add: false });
      this.renderTexture.clear();
      for (let x = 0; x < this.chunkSize; x++) {
        for (let y = 0; y < this.chunkSize; y++) {
          const tileType = this.finalTerrain[x + borderSize][y + borderSize];
          let groundColor;
          switch (tileType) {
            case TILE_TYPES.NORMAL_GROUND:
              groundColor = COLORS.NORMAL_GROUND;
              break;
            case TILE_TYPES.LIGHT_GROUND:
              groundColor = COLORS.LIGHT_GROUND;
              break;
            case TILE_TYPES.ELEVATED_GROUND:
              groundColor = COLORS.ELEVATED_GROUND;
              break;
            case TILE_TYPES.LIGHT_NORMAL_TRANSITION:
              groundColor = COLORS.LIGHT_NORMAL_TRANSITION;
              break;
            case TILE_TYPES.ELEVATED_TRANSITION:
              groundColor = COLORS.ELEVATED_TRANSITION;
              break;
            default:
              groundColor = 16777215;
          }
          const tileWorldX = this.chunkX * this.chunkSize + x;
          const tileWorldY = this.chunkY * this.chunkSize + y;
          const tile = new Tile(tileType, tileWorldX, tileWorldY);
          this.tiles[x][y] = tile;
          const drawX = x * this.tileSize;
          const drawY = y * this.tileSize;
          tempGraphics.fillStyle(groundColor, 1);
          tempGraphics.fillRect(drawX, drawY, this.tileSize, this.tileSize);
          tempGraphics.lineStyle(1, 0, 0.3);
          tempGraphics.strokeRect(drawX, drawY, this.tileSize, this.tileSize);
        }
      }
      this.renderTexture.draw(tempGraphics);
      tempGraphics.destroy();
    }
    // End of createChunkTexture method
    /**
     * Destroys the chunk and its associated GameObjects.
     */
    destroy() {
      if (this.renderTexture) {
        this.renderTexture.destroy();
        this.renderTexture = null;
      }
      this.tiles = null;
      this.scene = null;
    }
  };

  // src/entities/WorldManager.js
  var WorldManager = class {
    /**
     * Creates a new WorldManager instance.
     * @param {Phaser.Scene} scene - The scene this manager belongs to.
     * @param {object} config - Configuration object.
     * @param {number} config.tileSize - Size of each tile in pixels.
     * @param {number} config.chunkSize - Size of each chunk in tiles (width and height).
     * @param {number} config.renderDistance - How many chunks to load around the player (radius).
     * @param {number} [config.seed] - Optional seed for terrain generation. Defaults to random.
     */
    constructor(scene, config2) {
      this.scene = scene;
      this.tileSize = config2.tileSize;
      this.chunkSize = config2.chunkSize;
      this.renderDistance = config2.renderDistance;
      this.seed = config2.seed !== void 0 ? config2.seed : Math.random() * 1e4;
      this.loadedChunks = {};
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
        console.log(`Loading chunk: ${key}`);
        const chunk = new Chunk(this.scene, chunkX, chunkY, this.tileSize, this.chunkSize, this.seed);
        this.loadedChunks[key] = chunk;
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
        console.log(`Unloading chunk: ${key}`);
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
        const finalLocalX = localTileX < 0 ? localTileX + this.chunkSize : localTileX;
        const finalLocalY = localTileY < 0 ? localTileY + this.chunkSize : localTileY;
        if (this.loadedChunks[key].tiles && this.loadedChunks[key].tiles[finalLocalX]) {
          return this.loadedChunks[key].tiles[finalLocalX][finalLocalY];
        }
        return null;
      }
      return null;
    }
    /**
     * Updates the loaded chunks based on the player's current position.
     * Should be called in the scene's update loop.
     * @param {number} playerX - Player's world X coordinate.
     * @param {number} playerY - Player's world Y coordinate.
     */
    update(playerX, playerY) {
      const { tileX: playerTileX, tileY: playerTileY } = this.worldToTileCoords(playerX, playerY);
      const playerChunkX = Math.floor(playerTileX / this.chunkSize);
      const playerChunkY = Math.floor(playerTileY / this.chunkSize);
      const chunksToKeep = {};
      for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
        for (let y = playerChunkY - this.renderDistance; y <= playerChunkY + this.renderDistance; y++) {
          const key = this.getChunkKey(x, y);
          chunksToKeep[key] = true;
          this.loadChunk(x, y);
        }
      }
      for (const key in this.loadedChunks) {
        if (!chunksToKeep[key]) {
          const coords = key.split(",");
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
        return null;
      }
      let minChunkX = Infinity, maxChunkX = -Infinity;
      let minChunkY = Infinity, maxChunkY = -Infinity;
      keys.forEach((key) => {
        const [chunkX, chunkY] = key.split(",").map(Number);
        minChunkX = Math.min(minChunkX, chunkX);
        maxChunkX = Math.max(maxChunkX, chunkX);
        minChunkY = Math.min(minChunkY, chunkY);
        maxChunkY = Math.max(maxChunkY, chunkY);
      });
      const minX = minChunkX * this.chunkSize * this.tileSize;
      const minY = minChunkY * this.chunkSize * this.tileSize;
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
        return null;
      }
      const avoidRadiusSq = avoidRadius * avoidRadius;
      for (let i = 0; i < maxAttempts; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minRadius + Math.random() * (maxRadius - minRadius);
        const targetX = centerX + Math.cos(angle) * distance;
        const targetY = centerY + Math.sin(angle) * distance;
        if (targetX < loadedBounds.minX || targetX > loadedBounds.maxX || targetY < loadedBounds.minY || targetY > loadedBounds.maxY) {
          continue;
        }
        const dxAvoid = targetX - avoidX;
        const dyAvoid = targetY - avoidY;
        if (dxAvoid * dxAvoid + dyAvoid * dyAvoid < avoidRadiusSq) {
          continue;
        }
        const { tileX, tileY } = this.worldToTileCoords(targetX, targetY);
        const tile = this.getTileAt(tileX, tileY);
        const walkableTypes = [
          TILE_TYPES.NORMAL_GROUND,
          TILE_TYPES.LIGHT_GROUND,
          TILE_TYPES.LIGHT_NORMAL_TRANSITION
        ];
        if (tile && walkableTypes.includes(tile.type)) {
          console.log(`findRandomValidPositionNear: Found valid position (type: ${tile.type}) on attempt ${i + 1} at (${targetX.toFixed(0)}, ${targetY.toFixed(0)})`);
          return { x: targetX, y: targetY };
        }
      }
      console.warn(`findRandomValidPositionNear: Failed to find a valid position after ${maxAttempts} attempts.`);
      return null;
    }
    /**
     * Destroys the world manager and all loaded chunks.
     */
    destroy() {
      for (const key in this.loadedChunks) {
        const coords = key.split(",");
        this.unloadChunk(parseInt(coords[0], 10), parseInt(coords[1], 10));
      }
      this.loadedChunks = {};
      this.scene = null;
    }
  };

  // src/entities/Entity.js
  var nextEntityId = 0;
  var Entity = class {
    constructor(x, y, options = {}) {
      this.id = nextEntityId++;
      this.type = options.type || "generic";
      this.x = x;
      this.y = y;
      this.velocityX = 0;
      this.velocityY = 0;
      this.accelerationX = 0;
      this.accelerationY = 0;
      this.friction = options.friction || 0.95;
      this.gravity = options.gravity || 0;
      this.maxVelocityX = options.maxVelocityX || 500;
      this.maxVelocityY = options.maxVelocityY || 500;
      this.maxHealth = options.maxHealth || 100;
      this.health = options.health || this.maxHealth;
      this.state = options.state || "idle";
      this.isStunned = false;
      this.stunTimer = 0;
      this.isFlashing = false;
      this.flashTimer = 0;
      this.flashColor = "white";
      this.collisionBounds = options.collisionBounds || { x: 0, y: 0, width: 10, height: 10 };
      this.sprite = null;
      this.spritePath = options.spritePath || null;
      this.spriteLoaded = false;
      this.spriteWidth = options.width || 10;
      this.spriteHeight = options.height || 10;
      this.animations = options.animations || {};
      this.currentAnimation = null;
      this.currentFrame = 0;
      this.frameTimer = 0;
      this.setAnimation(this.state);
      this.color = options.color || "grey";
      if (this.spritePath) {
        this.loadSprite(this.spritePath);
      } else {
        this.updateBoundsFromSize();
      }
    }
    // --- NEW: Sprite Loading ---
    loadSprite(path) {
      this.sprite = new Image();
      this.sprite.onload = () => {
        this.spriteLoaded = true;
        this.spriteWidth = this.sprite.naturalWidth;
        this.spriteHeight = this.sprite.naturalHeight;
        this.updateBoundsFromSize();
        console.log(`Sprite loaded: ${path} (${this.spriteWidth}x${this.spriteHeight}) for Entity ${this.id}`);
      };
      this.sprite.onerror = () => {
        console.error(`Failed to load sprite: ${path} for Entity ${this.id}`);
        this.spriteLoaded = false;
        this.updateBoundsFromSize();
      };
      this.sprite.src = path;
    }
    // --- Health Methods ---
    takeDamage(amount) {
      if (this.state === "dead") return;
      this.health -= amount;
      if (this.health <= 0) {
        this.health = 0;
        this.setState("dead");
        this.onDeath();
      } else {
        this.flash("red", 0.1);
      }
    }
    heal(amount) {
      if (this.state === "dead") return;
      this.health += amount;
      if (this.health > this.maxHealth) {
        this.health = this.maxHealth;
      }
    }
    onDeath() {
      console.log(`Entity ${this.id} (${this.type}) died.`);
      this.setState("dead");
      this.velocityX = 0;
      this.velocityY = 0;
      this.accelerationX = 0;
      this.accelerationY = 0;
      this.isStunned = false;
      this.isFlashing = false;
    }
    // --- State Management ---
    setState(newState) {
      if (this.state !== newState && this.state !== "dead") {
        this.state = newState;
        this.setAnimation(newState);
      }
    }
    // --- Animation Methods ---
    setAnimation(animationName) {
      if (this.animations[animationName] && this.currentAnimation !== this.animations[animationName]) {
        this.currentAnimation = this.animations[animationName];
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.updateBoundsFromSprite();
      } else if (!this.animations[animationName]) {
        if (this.animations["idle"]) {
          this.setAnimation("idle");
        } else {
          this.currentAnimation = null;
        }
      }
    }
    updateAnimation(deltaTime) {
      if (!this.currentAnimation || !this.currentAnimation.frames || this.currentAnimation.frames.length === 0) {
        return;
      }
      this.frameTimer += deltaTime;
      const frameDuration = 1 / (this.currentAnimation.speed || 10);
      if (this.frameTimer >= frameDuration) {
        this.frameTimer -= frameDuration;
        this.currentFrame = (this.currentFrame + 1) % this.currentAnimation.frames.length;
        this.updateBoundsFromSize();
      }
    }
    // Renamed and simplified: Update bounds based on spriteWidth/spriteHeight
    updateBoundsFromSize() {
      this.collisionBounds.width = this.spriteWidth;
      this.collisionBounds.height = this.spriteHeight;
      this.collisionBounds.x = -this.spriteWidth / 2;
      this.collisionBounds.y = -this.spriteHeight / 2;
    }
    // --- Physics and Update ---
    update(deltaTime) {
      if (this.state === "dead") return;
      this.updateStun(deltaTime);
      this.updateFlash(deltaTime);
      if (!this.isStunned) {
        this.velocityX += this.accelerationX * deltaTime;
        this.velocityY += this.accelerationY * deltaTime;
        this.velocityY += this.gravity * deltaTime;
        this.velocityX *= Math.pow(this.friction, deltaTime * 60);
        this.velocityY *= Math.pow(this.friction, deltaTime * 60);
        if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
        }
        this.velocityX = Math.max(-this.maxVelocityX, Math.min(this.maxVelocityX, this.velocityX));
        this.velocityY = Math.max(-this.maxVelocityY, Math.min(this.maxVelocityY, this.velocityY));
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
          if (this.state === "idle") this.setState("moving");
        } else {
          if (this.state === "moving") this.setState("idle");
        }
      } else {
        this.velocityX *= Math.pow(0.5, deltaTime * 60);
        this.velocityY *= Math.pow(0.5, deltaTime * 60);
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
      }
      this.updateAnimation(deltaTime);
    }
    // --- Status Effect Methods ---
    applyKnockback(directionX, directionY, force) {
      if (this.state === "dead") return;
      const length = Math.sqrt(directionX * directionX + directionY * directionY);
      if (length > 0) {
        const normalizedX = directionX / length;
        const normalizedY = directionY / length;
        this.velocityX += normalizedX * force;
        this.velocityY += normalizedY * force;
        console.log(`[Knockback Applied] ID: ${this.id}, Force: ${force}, New Vel: (${this.velocityX.toFixed(2)}, ${this.velocityY.toFixed(2)})`);
      }
    }
    stun(duration) {
      if (this.state === "dead") return;
      this.isStunned = true;
      this.stunTimer = Math.max(this.stunTimer, duration);
      console.log(`Stunned ${this.id} for ${duration}s`);
      this.flash("white", duration);
    }
    updateStun(deltaTime) {
      if (this.isStunned) {
        this.stunTimer -= deltaTime;
        if (this.stunTimer <= 0) {
          this.isStunned = false;
          this.stunTimer = 0;
          console.log(`Stun ended for ${this.id}`);
        }
      }
    }
    // Enhanced flash method for better visual feedback
    flash(color, duration) {
      if (this.state === "dead") return;
      this.isFlashing = true;
      this.flashColor = color;
      this.flashTimer = Math.max(this.flashTimer, duration);
      this.flashIntensity = 1;
      this.flashDecayRate = 1 / duration;
      this.originalColor = this.originalColor || null;
    }
    // Update flash with decay for smoother transitions
    updateFlash(deltaTime) {
      if (this.isFlashing) {
        this.flashTimer -= deltaTime;
        if (this.flashIntensity > 0) {
          this.flashIntensity = Math.max(0, this.flashIntensity - this.flashDecayRate * deltaTime);
        }
        if (this.flashTimer <= 0) {
          this.isFlashing = false;
          this.flashTimer = 0;
          this.flashIntensity = 0;
        }
      }
    }
    // --- Collision Methods ---
    checkCollision(otherEntity, deltaTime) {
      if (this.state === "dead" || otherEntity.state === "dead") return false;
      const moveX = this.velocityX * deltaTime;
      const moveY = this.velocityY * deltaTime;
      const bounds2 = this.getAbsoluteBounds();
      const otherBounds = otherEntity.getAbsoluteBounds();
      const overlap = bounds2.x < otherBounds.x + otherBounds.width && bounds2.x + bounds2.width > otherBounds.x && bounds2.y < otherBounds.y + otherBounds.height && bounds2.y + bounds2.height > otherBounds.y;
      if (overlap) {
        return true;
      }
      if (moveX === 0 && moveY === 0) return false;
      const rayStartX = bounds2.x + bounds2.width / 2;
      const rayStartY = bounds2.y + bounds2.height / 2;
      const rayEndX = rayStartX + moveX;
      const rayEndY = rayStartY + moveY;
      if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x, otherBounds.y, otherBounds.x, otherBounds.y + otherBounds.height)) return true;
      if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x + otherBounds.width, otherBounds.y, otherBounds.x + otherBounds.width, otherBounds.y + otherBounds.height)) return true;
      if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x, otherBounds.y, otherBounds.x + otherBounds.width, otherBounds.y)) return true;
      if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x, otherBounds.y + otherBounds.height, otherBounds.x + otherBounds.width, otherBounds.y + otherBounds.height)) return true;
      return false;
    }
    handleCollision(otherEntity) {
    }
    // Helper to get absolute bounds position (centered based on x,y)
    getAbsoluteBounds() {
      return {
        x: this.x + this.collisionBounds.x,
        // x - width/2
        y: this.y + this.collisionBounds.y,
        // y - height/2
        width: this.collisionBounds.width,
        height: this.collisionBounds.height
      };
    }
    // Helper function for line segment intersection
    lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
      const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      if (den === 0) return false;
      const t = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
      const u = -((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }
    // --- Drawing ---
    // Updated draw method for sprites, size increase, and image smoothing
    draw(context) {
      if (this.state === "dead" && !(this.currentAnimation && this.currentAnimation.name === "death")) {
      }
      let drawn = false;
      const drawWidth = this.spriteWidth;
      const drawHeight = this.spriteHeight;
      const drawX = this.x - drawWidth / 2;
      const drawY = this.y - drawHeight / 2;
      context.fillStyle = "rgba(0, 0, 0, 0.3)";
      context.beginPath();
      context.ellipse(
        this.x,
        // Center X of entity
        this.y + drawHeight * 0.4,
        // Slightly below the entity center (using natural height)
        drawWidth / 2 * 0.8,
        // Radius X based on natural width
        drawHeight / 4,
        // Radius Y based on natural height (flattened)
        0,
        0,
        Math.PI * 2
      );
      context.fill();
      context.imageSmoothingEnabled = false;
      if (this.currentAnimation && this.currentAnimation.frames && this.currentAnimation.frames.length > 0) {
        const frame = this.currentAnimation.frames[this.currentFrame];
        if (frame && frame.width && frame.height) {
          context.drawImage(frame, drawX, drawY, drawWidth, drawHeight);
          drawn = true;
        }
      }
      if (!drawn && this.spriteLoaded && this.sprite) {
        context.drawImage(this.sprite, drawX, drawY, drawWidth, drawHeight);
        drawn = true;
      }
      if (!drawn) {
        const bounds2 = this.getAbsoluteBounds();
        context.fillStyle = this.color;
        context.fillRect(bounds2.x, bounds2.y, bounds2.width, bounds2.height);
      }
      if (this.isFlashing) {
        context.save();
        context.globalAlpha = 0.75 * this.flashIntensity;
        context.fillStyle = this.flashColor;
        context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        context.globalAlpha = 0.5 * this.flashIntensity;
        context.lineWidth = 3;
        context.strokeStyle = this.flashColor;
        context.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
        context.restore();
      }
      if (this.isStunned) {
        context.save();
        const centerX = bounds.x + bounds.width / 2;
        const topY = bounds.y - 15;
        const currentTime = Date.now() / 1e3;
        const starCount = 3;
        for (let i = 0; i < starCount; i++) {
          const angle = currentTime * 2 + i * Math.PI * 2 / starCount;
          const starX = centerX + Math.cos(angle) * 12;
          const starY = topY + Math.sin(angle) * 6;
          context.fillStyle = "yellow";
          context.beginPath();
          context.arc(starX, starY, 3, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }
    }
  };

  // src/entities/PowerupManager.js
  var PowerupManager = class {
    /**
     * Creates a new PowerupManager instance.
     * @param {Phaser.Scene} scene - The scene this manager belongs to.
     * @param {object} target - The entity whose power-ups are being managed (e.g., Player instance).
     */
    constructor(scene, target) {
      this.scene = scene;
      this.target = target;
      this.activePowerups = /* @__PURE__ */ new Map();
    }
    /**
     * Adds and activates a power-up for the target.
     * If a power-up of the same type is already active and stackable, increments the stack count.
     * @param {Powerup} powerup - The Powerup instance to add.
     */
    addPowerup(powerup) {
      const type = powerup.type;
      const maxStacks = powerup.maxStacks || 1;
      let currentPowerupData = this.activePowerups.get(type);
      if (currentPowerupData) {
        if (maxStacks > 1 && currentPowerupData.stacks < maxStacks) {
          currentPowerupData.stacks++;
          console.log(`Stacked ${type} power-up. Current stacks: ${currentPowerupData.stacks}`);
          this.applyEffect(type, currentPowerupData.stacks);
        } else if (maxStacks === 1) {
          console.log(`${type} power-up is not stackable or already active.`);
        } else {
          console.log(`${type} power-up is already at max stacks (${maxStacks}).`);
        }
      } else {
        currentPowerupData = { instance: powerup, stacks: 1 };
        this.activePowerups.set(type, currentPowerupData);
        console.log(`Activated ${type} power-up. Stacks: 1`);
        this.applyEffect(type, 1);
      }
    }
    /**
     * Applies the effect of a powerup based on its type and stack count.
     * @param {string} type - The type of the powerup.
     * @param {number} stacks - The current number of stacks.
     */
    applyEffect(type, stacks) {
      switch (type) {
        case "speed_boost":
          if (this.target && typeof this.target.updateSpeed === "function") {
            this.target.updateSpeed(stacks);
          } else {
            console.error("Target does not have an updateSpeed method.");
          }
          break;
        // case 'damage_boost': // Removed - Effect handled in Player.js attack logic
        //     if (this.target && typeof this.target.updateDamage === 'function') {
        //         this.target.updateDamage(stacks); // Pass stack count
        //     } else {
        //          console.error("Target does not have an updateDamage method.");
        //     }
        //     break;
        // case 'fire_rate_boost': // Removed
        //     if (this.target && typeof this.target.updateFireRate === 'function') {
        //         this.target.updateFireRate(stacks); // Pass stack count
        //     } else {
        //          console.error("Target does not have an updateFireRate method.");
        //     }
        //     break;
        case "health_increase":
          if (this.target && typeof this.target.updateMaxHealth === "function") {
            this.target.updateMaxHealth(stacks);
          } else {
            console.error("Target does not have an updateMaxHealth method.");
          }
          break;
          break;
        // Add cases for other powerup types here
        default:
          const powerupData = this.activePowerups.get(type);
          if (powerupData && stacks === 1) {
            powerupData.instance.activate(this.target);
          } else if (!powerupData) {
            console.warn(`Could not find powerup instance for type "${type}" during effect application.`);
          }
          console.warn(`No specific effect application defined in PowerupManager for type "${type}". Relying on Powerup.activate (if applicable).`);
      }
    }
    /**
     * Resets the effect of a powerup when it's removed or the manager is destroyed.
     * @param {string} type - The type of the powerup.
     */
    resetEffect(type) {
      switch (type) {
        case "speed_boost":
          if (this.target && typeof this.target.updateSpeed === "function") {
            this.target.updateSpeed(0);
          }
          break;
        // case 'damage_boost': // Removed
        //      if (this.target && typeof this.target.updateDamage === 'function') {
        //          this.target.updateDamage(0); // Reset damage boost
        //      }
        //      break;
        // case 'fire_rate_boost': // Removed
        //      if (this.target && typeof this.target.updateFireRate === 'function') {
        //          this.target.updateFireRate(0); // Reset fire rate boost
        //      }
        //      break;
        case "health_increase":
          if (this.target && typeof this.target.updateMaxHealth === "function") {
            this.target.updateMaxHealth(0);
          }
          break;
        // Add cases for other powerup types here
        default:
          const powerupData = this.activePowerups.get(type);
          if (powerupData && typeof powerupData.instance.deactivate === "function") {
            powerupData.instance.deactivate(this.target);
          } else {
            console.warn(`No specific effect reset defined in PowerupManager or Powerup.deactivate for type "${type}".`);
          }
          break;
      }
    }
    /**
     * Deactivates and removes a power-up by its type.
     * @param {string} type - The type of the power-up to remove.
     */
    removePowerup(type) {
      const powerupData = this.activePowerups.get(type);
      if (powerupData) {
        this.resetEffect(type);
        this.activePowerups.delete(type);
        console.log(`Removed all stacks of ${type} power-up.`);
      }
    }
    /**
     * Checks if a power-up of a specific type is currently active.
     * @param {string} type - The type of the power-up.
     * @returns {boolean} True if the power-up is active, false otherwise.
     */
    isPowerupActive(type) {
      return this.activePowerups.has(type);
    }
    /**
     * Update method, called every frame.
     * (Currently, timers handle expiration, but this could be used for other per-frame logic).
     * @param {number} time - The current time.
     * @param {number} delta - The delta time in ms since the last frame.
     */
    update(time, delta) {
    }
    /**
    * Cleans up all active powerups and timers. Useful when the target is destroyed or the scene ends.
    */
    destroy() {
      this.activePowerups.forEach((powerupData, type) => {
        this.resetEffect(type);
        console.log(`Resetting effect for ${type} on destroy.`);
      });
      this.activePowerups.clear();
      console.log("PowerupManager destroyed and cleaned up.");
    }
  };

  // src/entities/Player.js
  var Player = class extends Entity {
    // Add worldManager to the constructor parameters
    constructor(x, y, inputHandler, worldManager, options = {}) {
      const playerOptions = {
        type: "player",
        maxHealth: options.maxHealth || 150,
        // Increased base health by 50%
        friction: options.friction || 0.85,
        // Slightly higher friction for more responsive controls
        spritePath: "assets/hero.png",
        // Added sprite path
        ...options
      };
      super(x, y, playerOptions);
      const newHitboxWidth = 60;
      const newHitboxHeight = 60;
      this.collisionBounds = {
        x: -newHitboxWidth / 2,
        // Keep it centered relative to player's x,y
        y: -newHitboxHeight / 2,
        width: newHitboxWidth,
        height: newHitboxHeight
      };
      this.scene = options.scene || null;
      this.worldManager = worldManager;
      if (!this.worldManager) {
        console.error("Player created without a WorldManager reference!");
      }
      this.currentWeapon = "melee";
      this.weapons = ["melee", "railgun"];
      this.currentWeaponIndex = 0;
      this.railgunChargeTime = 1.5;
      this.railgunCooldown = 1;
      this.railgunMinDamage = 15;
      this.railgunMaxDamage = 150;
      this.railgunProjectileSpeed = 1200;
      this.isChargingRailgun = false;
      this.railgunChargeTimer = 0;
      this.railgunCooldownTimer = 0;
      this.isRailgunMaxCharged = false;
      this.inputHandler = inputHandler;
      this.baseMoveSpeed = options.moveSpeed || 200;
      this.moveSpeed = this.baseMoveSpeed;
      this.isMoving = false;
      this.direction = { x: 0, y: 1 };
      this.lastMoveDirection = { x: 0, y: 1 };
      this.dashSpeed = this.moveSpeed * 6;
      this.dashDistance = 10 * (options.tileSize || 50);
      this.dashDuration = 0.3;
      this.dashCooldown = 1.5;
      this.dashTimer = 0;
      this.dashCooldownTimer = 0;
      this.isDashing = false;
      this.dashDirection = { x: 0, y: 0 };
      this.dashDistanceTraveled = 0;
      this.baseAttackPower = options.attackPower || 25;
      this.attackPower = this.baseAttackPower;
      this.lungeSpeed = this.moveSpeed * 3;
      this.lungeDistance = 3 * (options.tileSize || 50);
      this.lungeDuration = 0.2;
      this.attackCooldown = 0.5;
      this.lungeTimer = 0;
      this.attackCooldownTimer = 0;
      this.isAttacking = false;
      this.lungeDirection = { x: 0, y: 0 };
      this.enemiesHitThisAttack = /* @__PURE__ */ new Set();
      this.lungeDistanceTraveled = 0;
      this.currentTileX = 0;
      this.currentTileY = 0;
      this.updateCurrentTileCoords();
      this.plasmaCount = 0;
      this.powerupManager = new PowerupManager(this.scene, this);
      this.speedBoostStacks = 0;
      this.healthIncreaseStacks = 0;
      this.baseMaxHealth = this.maxHealth;
      this.turretDestroyRange = (options.tileSize || 50) * 1.5;
      this.turretDestroyHoldTime = 1;
      this.turretDestroyTimer = 0;
      this.nearbyTurret = null;
      this.turretPromptText = null;
      this.lives = options.initialLives || 3;
    }
    // onMouseMove, onMouseDown, onMouseUp removed - Handled by InputHandler via scene
    // Calculate direction to mouse cursor (in screen space)
    updateAimDirection() {
      if (!this.scene || !this.scene.input || !this.scene.input.activePointer) return;
      const pointer = this.scene.input.activePointer;
      const dx = pointer.worldX - this.x;
      const dy = pointer.worldY - this.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        this.direction = {
          x: dx / length,
          y: dy / length
        };
      }
    }
    update(deltaTime, scene) {
      if (!this.scene && scene) {
        this.scene = scene;
      }
      if (this.state === "dead") return;
      this.velocityX = 0;
      this.velocityY = 0;
      this.updateAimDirection();
      if (this.dashCooldownTimer > 0) {
        this.dashCooldownTimer -= deltaTime;
      }
      if (this.attackCooldownTimer > 0) {
        this.attackCooldownTimer -= deltaTime;
      }
      if (this.railgunCooldownTimer > 0) {
        this.railgunCooldownTimer -= deltaTime;
      }
      if (this.isDashing) {
        this.updateDash(deltaTime);
      } else if (this.isAttacking) {
        this.updateAttack(deltaTime);
      } else if (this.isChargingRailgun) {
        this.updateRailgunCharge(deltaTime);
        this.processInput();
      } else {
        this.processInput();
      }
      this.friction = this.baseFriction || 0.85;
      super.update(deltaTime);
      this.updateCurrentTileCoords();
      if (this.isMoving && this.speedBoostStacks > 0 && this.scene && typeof this.scene.createSpeedTrailEffect === "function") {
        this.scene.createSpeedTrailEffect(this.x, this.y, this.speedBoostStacks, this.velocityX, this.velocityY);
      }
      this.updateTurretDestruction(deltaTime);
      this.updateTurretDestruction(deltaTime);
    }
    processInput() {
      if (this.isDashing || this.isAttacking) return;
      let moveX = 0;
      let moveY = 0;
      if (this.inputHandler.isDown("KeyW")) moveY -= 1;
      if (this.inputHandler.isDown("KeyS")) moveY += 1;
      if (this.inputHandler.isDown("KeyA")) moveX -= 1;
      if (this.inputHandler.isDown("KeyD")) moveX += 1;
      if (moveX !== 0 && moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;
      }
      this.velocityX = moveX * this.moveSpeed;
      this.velocityY = moveY * this.moveSpeed;
      this.isMoving = moveX !== 0 || moveY !== 0;
      if (this.isMoving) {
        this.lastMoveDirection = { x: moveX, y: moveY };
        if (!this.isChargingRailgun) {
          this.setState("moving");
        }
      } else {
        if (!this.isChargingRailgun) {
          this.setState("idle");
        }
      }
      if (this.inputHandler.wasPressed("Space") && this.dashCooldownTimer <= 0) {
        if (this.isChargingRailgun) {
          this.cancelRailgunCharge();
        }
        this.startDash();
        return;
      }
      if (this.inputHandler.wasPressed("KeyE")) {
        this.swapWeapon();
      }
      if (this.currentWeapon === "melee") {
        if (this.inputHandler.wasLeftPointerPressed() && this.attackCooldownTimer <= 0 && !this.isAttacking) {
          if (!this.isChargingRailgun) {
            this.startAttack();
          }
        }
      } else if (this.currentWeapon === "railgun") {
        if (this.inputHandler.isDown("KeyR") && this.railgunCooldownTimer <= 0 && !this.isChargingRailgun && !this.isDashing && !this.isAttacking) {
          this.startChargingRailgun();
        } else if (!this.inputHandler.isDown("KeyR") && this.isChargingRailgun) {
          this.fireRailgun();
        }
      }
    }
    // Turret Destruction Input (handled in updateTurretDestruction)
    // We check input there to avoid interfering with other actions like dash/attack
    // --- NEW: Weapon Swap Method ---
    swapWeapon() {
      this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
      this.currentWeapon = this.weapons[this.currentWeaponIndex];
      console.log(`Swapped weapon to: ${this.currentWeapon}`);
      if (this.currentWeapon !== "railgun" && this.isChargingRailgun) {
        this.cancelRailgunCharge();
      }
    }
    // --- NEW: Railgun Methods ---
    startChargingRailgun() {
      if (this.railgunCooldownTimer <= 0) {
        this.isChargingRailgun = true;
        this.railgunChargeTimer = 0;
        this.setState("charging");
        console.log("Charging railgun...");
      }
    }
    updateRailgunCharge(deltaTime) {
      if (!this.isChargingRailgun) return;
      this.railgunChargeTimer += deltaTime;
      const wasMaxCharged = this.isRailgunMaxCharged;
      this.isRailgunMaxCharged = this.railgunChargeTimer >= this.railgunChargeTime;
      if (this.isRailgunMaxCharged && !wasMaxCharged) {
        if (this.scene && typeof this.scene.startContinuousShake === "function") {
          this.scene.startContinuousShake(3e-3);
        }
      } else if (!this.isRailgunMaxCharged && wasMaxCharged) {
        if (this.scene && typeof this.scene.stopContinuousShake === "function") {
          this.scene.stopContinuousShake();
        }
      }
      if (this.isMoving) {
        this.setState("charging_moving");
      } else {
        this.setState("charging");
      }
    }
    fireRailgun() {
      if (!this.isChargingRailgun) return;
      const chargeRatio = Math.min(this.railgunChargeTimer / this.railgunChargeTime, 1);
      const minChargeToFire = 0.1;
      console.log(`Attempting to fire railgun. Charge ratio: ${chargeRatio.toFixed(2)}`);
      if (this.isRailgunMaxCharged) {
        if (this.scene && typeof this.scene.stopContinuousShake === "function") {
          this.scene.stopContinuousShake();
        }
      }
      if (this.plasmaCount <= 0) {
        console.log("Railgun fizzled - no plasma!");
        this.cancelRailgunCharge();
        return;
      }
      if (chargeRatio >= minChargeToFire) {
        this.plasmaCount--;
        console.log(`Plasma consumed. Remaining: ${this.plasmaCount}`);
        const damage = this.railgunMinDamage + (this.railgunMaxDamage - this.railgunMinDamage) * chargeRatio;
        console.log(`Firing railgun! (Charge: ${(chargeRatio * 100).toFixed(0)}%, Damage: ${damage.toFixed(0)}, Plasma Left: ${this.plasmaCount})`);
        this.railgunCooldownTimer = this.railgunCooldown;
        if (this.scene && typeof this.scene.createRailgunProjectile === "function") {
          this.scene.createRailgunProjectile(
            this.x,
            this.y,
            this.direction.x,
            // Use aim direction
            this.direction.y,
            damage,
            // Pass calculated damage
            this.railgunProjectileSpeed,
            chargeRatio
            // Pass charge ratio for potential effects (e.g., beam width/intensity)
          );
        } else {
          console.error("Scene or createRailgunProjectile method not found!");
        }
      } else {
        console.log("Railgun fizzled - not enough charge.");
      }
      this.cancelRailgunCharge();
    }
    cancelRailgunCharge() {
      if (!this.isChargingRailgun) return;
      if (this.isRailgunMaxCharged) {
        if (this.scene && typeof this.scene.stopContinuousShake === "function") {
          this.scene.stopContinuousShake();
        }
      }
      this.isChargingRailgun = false;
      this.railgunChargeTimer = 0;
      this.isRailgunMaxCharged = false;
      this.setState(this.isMoving ? "moving" : "idle");
      console.log("Railgun charge cancelled.");
    }
    startDash() {
      this.isDashing = true;
      this.dashTimer = 0;
      this.dashDistanceTraveled = 0;
      this.dashDirection = { ...this.lastMoveDirection };
      this.setState("dashing");
    }
    updateDash(deltaTime) {
      this.dashTimer += deltaTime;
      this.velocityX = this.dashDirection.x * this.dashSpeed;
      this.velocityY = this.dashDirection.y * this.dashSpeed;
      const distanceThisFrame = Math.sqrt(
        (this.velocityX * deltaTime) ** 2 + (this.velocityY * deltaTime) ** 2
      );
      this.dashDistanceTraveled += distanceThisFrame;
      this.createDashTrail();
      if (this.dashTimer >= this.dashDuration || this.dashDistanceTraveled >= this.dashDistance) {
        this.isDashing = false;
        this.dashCooldownTimer = this.dashCooldown;
        this.setState("idle");
      }
    }
    // Create a visual dash trail effect
    createDashTrail() {
      if (this.scene && this.scene.createDashTrailEffect) {
        this.scene.createDashTrailEffect(this.x, this.y);
      }
    }
    // Speed trail logic removed
    // Modify startAttack to only work for melee
    startAttack() {
      if (this.currentWeapon !== "melee") return;
      this.isAttacking = true;
      this.enemiesHitThisAttack.clear();
      this.lungeTimer = 0;
      this.lungeDistanceTraveled = 0;
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        const dx = nearestEnemy.x - this.x;
        const dy = nearestEnemy.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          this.lungeDirection = {
            x: dx / distance,
            y: dy / distance
          };
        } else {
          this.lungeDirection = { ...this.lastMoveDirection };
        }
      } else {
        this.lungeDirection = { ...this.lastMoveDirection };
      }
      this.setState("attacking");
    }
    // Helper method to find the nearest enemy
    findNearestEnemy() {
      console.log("[findNearestEnemy] Searching for enemies...");
      if (!this.scene) {
        console.log("[findNearestEnemy] No scene reference found.");
        return null;
      }
      const detectionRange = 300;
      let nearestEnemy = null;
      let nearestDistance = detectionRange;
      if (this.scene.enemies && Array.isArray(this.scene.enemies)) {
        console.log(`[findNearestEnemy] Found ${this.scene.enemies.length} enemies in scene list.`);
        for (const enemy of this.scene.enemies) {
          if (enemy.state === "dead") continue;
          const dx = enemy.x - this.x;
          const dy = enemy.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestEnemy = enemy;
          }
        }
      } else {
        console.log("[findNearestEnemy] Scene.enemies list not found or not an array.");
      }
      if (nearestEnemy) {
        console.log(`[findNearestEnemy] Found nearest enemy: ${nearestEnemy.id} at distance ${nearestDistance.toFixed(2)}`);
      } else {
        console.log("[findNearestEnemy] No suitable enemy found within range.");
      }
      return nearestEnemy;
    }
    updateAttack(deltaTime) {
      if (this.enemiesHitThisAttack.size > 0) {
        this.isAttacking = false;
        this.attackCooldownTimer = this.attackCooldown;
        this.setState("idle");
        this.velocityX = 0;
        this.velocityY = 0;
        return;
      }
      this.lungeTimer += deltaTime;
      this.velocityX = this.lungeDirection.x * this.lungeSpeed;
      this.velocityY = this.lungeDirection.y * this.lungeSpeed;
      const distanceThisFrame = Math.sqrt(
        (this.velocityX * deltaTime) ** 2 + (this.velocityY * deltaTime) ** 2
      );
      this.lungeDistanceTraveled += distanceThisFrame;
      if (this.lungeTimer >= this.lungeDuration || this.lungeDistanceTraveled >= this.lungeDistance) {
        this.isAttacking = false;
        this.attackCooldownTimer = this.attackCooldown;
        this.setState("idle");
      }
    }
    // Handle collision with other entities
    handleCollision(otherEntity) {
      super.handleCollision(otherEntity);
      if (otherEntity?.type === "plasma") {
        console.log(`Player collided with Plasma ${otherEntity.id}`);
        otherEntity.collect(this);
        return;
      }
      if (this.isAttacking) {
        console.log(`Player attacking, collided with: ${otherEntity?.id} (Type: ${otherEntity?.type})`);
        if (otherEntity?.type === "enemy" || otherEntity?.type === "ranged_enemy" || otherEntity?.type === "engineer" || otherEntity?.type === "drone_enemy") {
          console.log(`>>> Enemy collision detected during attack! Applying effects to ${otherEntity.id}`);
          if (otherEntity.state !== "dead" && !this.enemiesHitThisAttack.has(otherEntity.id)) {
            otherEntity.takeDamage(this.baseAttackPower);
            this.enemiesHitThisAttack.add(otherEntity.id);
            const knockbackForce = 800;
            const knockbackDirectionX = otherEntity.x - this.x;
            const knockbackDirectionY = otherEntity.y - this.y;
            if (this.scene) {
              this.scene.applyEnhancedKnockback(otherEntity, knockbackDirectionX, knockbackDirectionY, knockbackForce);
            }
            const stunDuration = 0.8;
            otherEntity.stun(stunDuration);
            if (this.scene && this.scene.createImpactEffect) {
              this.scene.createImpactEffect(otherEntity.x, otherEntity.y, 1);
            }
            if (this.scene && this.scene.cameras && this.scene.cameras.main) {
              this.scene.cameras.main.shake(100, 0.01);
            }
            if (this.scene && this.scene.applyHitStop) {
              this.scene.applyHitStop(this, otherEntity, this.baseAttackPower, 1);
            } else {
              if (this.scene) {
                const playerVelX = this.velocityX;
                const playerVelY = this.velocityY;
                this.velocityX = 0;
                this.velocityY = 0;
                otherEntity.velocityX = 0;
                otherEntity.velocityY = 0;
                this.scene.time.delayedCall(80, () => {
                  this.velocityX = playerVelX * 0.7;
                  this.velocityY = playerVelY * 0.7;
                });
              }
            }
          }
        }
      }
    }
    // --- New method to update tile coordinates ---
    updateCurrentTileCoords() {
      if (this.worldManager) {
        const { tileX, tileY } = this.worldManager.worldToTileCoords(this.x, this.y);
        if (tileX !== this.currentTileX || tileY !== this.currentTileY) {
          this.currentTileX = tileX;
          this.currentTileY = tileY;
        }
      }
    }
    /**
     * Updates the player's movement speed based on the number of active speed boost stacks.
     * Also recalculates dependent speeds like dash and lunge.
     * @param {number} stacks - The number of active speed boost stacks.
     */
    updateSpeed(stacks) {
      const speedBoostPerStack = 0.05;
      const maxStacks = 15;
      const actualStacks = Math.min(stacks, maxStacks);
      this.speedBoostStacks = actualStacks;
      const speedMultiplier = 1 + actualStacks * speedBoostPerStack;
      this.moveSpeed = this.baseMoveSpeed * speedMultiplier;
      this.dashSpeed = this.moveSpeed * 6;
      this.lungeSpeed = this.moveSpeed * 3;
    }
    // /** // Removed updateDamage method
    //  * Updates the player's projectile damage based on damage boost stacks.
    //  * @param {number} stacks - The number of active damage boost stacks.
    //  */
    // updateDamage(stacks) {
    //     const damageBoostPerStack = 0.10; // 10% increase per stack
    //     const maxStacks = 5; // Maximum number of stacks allowed
    //     const actualStacks = Math.min(stacks, maxStacks); // Clamp stacks to the maximum
    //     this.damageBoostStacks = actualStacks; // Store the stack count
    //     const damageMultiplier = 1 + (actualStacks * damageBoostPerStack);
    //     this.currentProjectileDamage = this.baseProjectileDamage * damageMultiplier;
    //     // console.log(`Updated damage. Stacks: ${actualStacks}, Multiplier: ${damageMultiplier.toFixed(2)}, Damage: ${this.currentProjectileDamage.toFixed(2)}`); // Debug log
    // }
    // /** // Removed updateFireRate method
    //  * Updates the player's fire rate (delay between shots) based on fire rate boost stacks.
    //  * @param {number} stacks - The number of active fire rate boost stacks.
    //  */
    // updateFireRate(stacks) {
    //     const fireRateIncreasePerStack = 0.08; // 8% increase in rate per stack (means lower delay)
    //     const maxStacks = 5; // Maximum number of stacks allowed
    //     const actualStacks = Math.min(stacks, maxStacks); // Clamp stacks to the maximum
    //     this.fireRateBoostStacks = actualStacks; // Store the stack count
    //     // Calculate the multiplier for the delay (inverse of rate increase)
    //     const delayMultiplier = 1 / (1 + (actualStacks * fireRateIncreasePerStack));
    //     this.currentFireRateDelay = this.baseFireRateDelay * delayMultiplier;
    //     // console.log(`Updated fire rate. Stacks: ${actualStacks}, Delay Multiplier: ${delayMultiplier.toFixed(3)}, Delay: ${this.currentFireRateDelay.toFixed(3)}s`); // Debug log
    // }
    /**
     * Updates the player's maximum health based on health increase stacks.
     * Also increases current health proportionally.
     * @param {number} stacks - The number of active health increase stacks.
     */
    updateMaxHealth(stacks) {
      const healthIncreasePerStack = 20;
      const maxStacks = 5;
      const actualStacks = Math.min(stacks, maxStacks);
      this.healthIncreaseStacks = actualStacks;
      const healthIncrease = actualStacks * healthIncreasePerStack;
      const newMaxHealth = this.baseMaxHealth + healthIncrease;
      const maxHealthDifference = newMaxHealth - this.maxHealth;
      this.maxHealth = newMaxHealth;
      if (maxHealthDifference > 0) {
        this.health = Math.min(this.health + maxHealthDifference, this.maxHealth);
      }
      if (this.scene && this.scene.uiManager && typeof this.scene.uiManager.updateHealthBar === "function") {
        this.scene.uiManager.updateHealthBar(this.health, this.maxHealth);
      } else {
      }
    }
    // Powerup management methods (addPowerup, calculateCurrentStats) removed.
    // Player now uses base stats directly, updated via methods like updateSpeed.
    // Dependent speeds (dashSpeed, lungeSpeed) are initialized in the constructor based on baseMoveSpeed.
    // Visual effect for double hit (damage powerup) removed
    // Override takeDamage to implement player-specific damage handling
    // Added 'source' parameter to get projectile info for knockback
    takeDamage(amount, source = null) {
      const actualDamage = this.isDashing ? amount * 0.5 : amount;
      super.takeDamage(actualDamage);
      console.log(`Player took ${actualDamage} damage, health: ${this.health}/${this.maxHealth}`);
      if (this.scene) {
        if (this.scene.cameras && this.scene.cameras.main) {
          this.scene.cameras.main.shake(150, 8e-3);
        }
        if (this.scene.createImpactEffect) {
          this.scene.createImpactEffect(this.x, this.y, 1);
        }
        if (source && typeof source.velocityX !== "undefined" && typeof source.velocityY !== "undefined") {
          const knockbackForce = 300;
          const sourceSpeed = Math.sqrt(source.velocityX * source.velocityX + source.velocityY * source.velocityY);
          if (sourceSpeed > 0) {
            const knockbackDirX = source.velocityX / sourceSpeed;
            const knockbackDirY = source.velocityY / sourceSpeed;
            this.velocityX += knockbackDirX * knockbackForce;
            this.velocityY += knockbackDirY * knockbackForce;
            console.log(`Applied knockback: Force=${knockbackForce}, DirX=${knockbackDirX.toFixed(2)}, DirY=${knockbackDirY.toFixed(2)}`);
          }
        }
      }
    }
    // Override onDeath for player-specific death behavior
    onDeath() {
      super.onDeath();
      console.log("Player has died!");
      this.velocityX = 0;
      this.velocityY = 0;
      this.isDashing = false;
      this.isAttacking = false;
      this.isMoving = false;
      if (this.scene && typeof this.scene.handlePlayerDeath === "function") {
        this.scene.handlePlayerDeath();
      } else {
        console.warn("Player died, but scene or handlePlayerDeath method not found.");
      }
    }
    // Clean up when player is destroyed
    destroy() {
      if (this.powerupManager) {
        this.powerupManager.destroy();
        this.powerupManager = null;
      }
      if (this.turretPromptText) {
        this.turretPromptText.destroy();
        this.turretPromptText = null;
      }
      super.destroy();
    }
    // --- NEW: Turret Destruction Logic ---
    updateTurretDestruction(deltaTime) {
      let closestTurret = null;
      let minDistanceSq = this.turretDestroyRange * this.turretDestroyRange;
      if (!this.isDashing && !this.isAttacking && this.state !== "dead" && this.scene && this.scene.enemies) {
        for (const enemy of this.scene.enemies) {
          if (enemy.constructor.name === "TurretEnemy" && enemy.state !== "dead") {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq < minDistanceSq) {
              minDistanceSq = distanceSq;
              closestTurret = enemy;
            }
          }
        }
      }
      if (closestTurret) {
        if (!this.turretPromptText && this.scene) {
          this.turretPromptText = this.scene.add.text(
            this.x,
            this.y - 60,
            // Position above player
            "[B] Disable Turret",
            { fontSize: "16px", fill: "#ffffff", stroke: "#000000", strokeThickness: 3 }
          );
          this.turretPromptText.setOrigin(0.5, 1);
          this.turretPromptText.setDepth(20);
        }
        if (this.turretPromptText) {
          this.turretPromptText.setPosition(this.x, this.y - 60);
          this.turretPromptText.setVisible(true);
        }
        if (this.inputHandler.isDown("KeyB")) {
          if (this.nearbyTurret !== closestTurret) {
            this.resetTurretDestruction();
            this.nearbyTurret = closestTurret;
            console.log(`Player started interacting with Turret ${this.nearbyTurret.id}`);
            if (typeof this.nearbyTurret.showDestructionIndicator === "function") {
              this.nearbyTurret.showDestructionIndicator();
            }
          }
          if (this.nearbyTurret) {
            this.turretDestroyTimer += deltaTime;
            if (typeof this.nearbyTurret.updateDestructionIndicator === "function") {
              const progress = Math.min(this.turretDestroyTimer / this.turretDestroyHoldTime, 1);
              this.nearbyTurret.updateDestructionIndicator(progress);
            }
            if (this.turretDestroyTimer >= this.turretDestroyHoldTime) {
              console.log(`Player destroyed Turret ${this.nearbyTurret.id}`);
              if (typeof this.nearbyTurret.destroyTurret === "function") {
                this.nearbyTurret.destroyTurret();
              } else {
                if (typeof this.nearbyTurret.destroy === "function") this.nearbyTurret.destroy();
                else if (typeof this.nearbyTurret.onDeath === "function") this.nearbyTurret.onDeath();
              }
              this.resetTurretDestruction();
            }
          }
        } else {
          this.resetTurretDestruction();
        }
      } else {
        if (this.turretPromptText) {
          this.turretPromptText.setVisible(false);
        }
        this.resetTurretDestruction();
      }
      if (this.isDashing || this.isAttacking || this.state === "dead") {
        if (this.turretPromptText) {
          this.turretPromptText.setVisible(false);
        }
        this.resetTurretDestruction();
      }
    }
    resetTurretDestruction() {
      if (this.nearbyTurret && typeof this.nearbyTurret.hideDestructionIndicator === "function") {
        this.nearbyTurret.hideDestructionIndicator();
      }
      if (this.turretPromptText) {
        this.turretPromptText.setVisible(false);
      }
      this.turretDestroyTimer = 0;
      this.nearbyTurret = null;
    }
  };

  // src/entities/InputHandler.js
  var InputHandler = class {
    constructor(scene) {
      this.scene = scene;
      this.keys = /* @__PURE__ */ new Set();
      this.justPressed = /* @__PURE__ */ new Set();
      this.lastKeys = /* @__PURE__ */ new Set();
      this.isPointerDown = false;
      this.wasPointerPressed = false;
      this.lastPointerDown = false;
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onKeyUp = this._onKeyUp.bind(this);
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      this.scene.input.keyboard.on("keydown", this._onKeyDown);
      this.scene.input.keyboard.on("keyup", this._onKeyUp);
      this.scene.input.on("pointerdown", this._onPointerDown);
      this.scene.input.on("pointerup", this._onPointerUp);
    }
    _onKeyDown(e) {
      this.keys.add(e.code);
    }
    _onKeyUp(e) {
      this.keys.delete(e.code);
    }
    _onPointerDown(pointer) {
      if (pointer.button === 0) {
        this.isPointerDown = true;
      }
    }
    _onPointerUp(pointer) {
      if (pointer.button === 0) {
        this.isPointerDown = false;
      }
    }
    // Call this at the beginning of each game loop update
    update() {
      this.justPressed.clear();
      for (const key of this.keys) {
        if (!this.lastKeys.has(key)) {
          this.justPressed.add(key);
        }
      }
      this.lastKeys = new Set(this.keys);
      this.wasPointerPressed = this.isPointerDown && !this.lastPointerDown;
      this.lastPointerDown = this.isPointerDown;
    }
    isDown(keyCode) {
      return this.keys.has(keyCode);
    }
    wasPressed(keyCode) {
      return this.justPressed.has(keyCode);
    }
    // New methods for pointer state
    isLeftPointerDown() {
      return this.isPointerDown;
    }
    wasLeftPointerPressed() {
      return this.wasPointerPressed;
    }
    // Clean up event listeners when the handler is no longer needed
    destroy() {
      if (this.scene && this.scene.input) {
        this.scene.input.keyboard.off("keydown", this._onKeyDown);
        this.scene.input.keyboard.off("keyup", this._onKeyUp);
        this.scene.input.off("pointerdown", this._onPointerDown);
        this.scene.input.off("pointerup", this._onPointerUp);
      }
      this.keys.clear();
      this.justPressed.clear();
      this.lastKeys.clear();
      this.isPointerDown = false;
      this.wasPointerPressed = false;
      this.lastPointerDown = false;
    }
    // New method to clear state, typically called when the scene resumes
    clearStateOnResume() {
      this.keys.clear();
      this.justPressed.clear();
      this.lastKeys.clear();
      this.isPointerDown = false;
      this.wasPointerPressed = false;
      this.lastPointerDown = false;
    }
  };

  // src/entities/Enemy.js
  var Enemy = class extends Entity {
    constructor(x, y, options = {}) {
      const enemyOptions = {
        type: "enemy",
        maxHealth: options.maxHealth || 50,
        friction: options.friction || 0.9,
        // Moderate friction
        collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 40, height: 40 },
        // Slightly smaller than player
        spritePath: "assets/enemy.png",
        // Added default sprite path
        // color: options.color || 'red', // Color determined by sprite
        // size: options.size || 30, // Size determined by sprite
        ...options
      };
      super(x, y, enemyOptions);
      this.targetPlayer = null;
      this.scene = options.scene || null;
      this.detectionRange = options.detectionRange || 600;
      this.agroRange = 80 * 50;
      this.moveSpeed = options.moveSpeed || 80;
      this.aggressiveness = options.aggressiveness || 0.7;
      this.wanderSpeed = this.moveSpeed * 0.5;
      this.damageAmount = options.damageAmount || 10;
      this.damageCooldown = options.damageCooldown || 0.5;
      this.damageCooldownTimer = 0;
      this.decisionTimer = 0;
      this.decisionInterval = 0.5;
      this.wanderDirection = { x: 0, y: 0 };
      this.wanderDuration = 0;
      this.wanderTimer = 0;
      this.idleTimer = 0;
      this.idleDuration = 0;
      this.separationRadius = 50;
      this.separationForce = 100;
      this.isFlashing = false;
      this.hitEffectTimer = 0;
      this.hitEffectDuration = 0.15;
      this.stunEffectIntensity = 1;
      this.stunEffectDecayRate = 0.8;
      this.avoidanceRadius = 100;
      this.avoidancePredictionTime = 0.2;
      this.avoidanceForce = 150;
      this.avoidanceCooldown = 0.1;
      this.avoidanceTimer = 0;
      this.flankDirection = Math.random() < 0.5 ? -1 : 1;
      this.flankOffsetDistance = 150;
      this.flankUpdateTimer = 0;
      this.flankUpdateInterval = 1 + Math.random();
    }
    update(deltaTime, worldContext) {
      if (this.state === "dead") return;
      if (worldContext && worldContext.player && !this.targetPlayer) {
        this.targetPlayer = worldContext.player;
      }
      if (this.hitEffectTimer > 0) {
        this.hitEffectTimer -= deltaTime;
        if (this.hitEffectTimer <= 0) {
          this.hitEffectTimer = 0;
          this.isFlashing = false;
        }
      }
      if (this.damageCooldownTimer > 0) {
        this.damageCooldownTimer -= deltaTime;
        if (this.damageCooldownTimer < 0) {
          this.damageCooldownTimer = 0;
        }
      }
      if (this.avoidanceTimer > 0) {
        this.avoidanceTimer -= deltaTime;
        if (this.avoidanceTimer < 0) {
          this.avoidanceTimer = 0;
        }
      }
      if (this.isStunned) {
        if (this.stunEffectIntensity > 0) {
          this.stunEffectIntensity *= Math.pow(this.stunEffectDecayRate, deltaTime * 10);
        }
        super.update(deltaTime);
        return;
      }
      this.decisionTimer += deltaTime;
      this.flankUpdateTimer += deltaTime;
      if (this.decisionTimer >= this.decisionInterval) {
        this.decisionTimer = 0;
        this.makeDecision();
      }
      if (this.flankUpdateTimer >= this.flankUpdateInterval) {
        this.flankUpdateTimer = 0;
        this.flankDirection = Math.random() < 0.5 ? -1 : 1;
        this.flankUpdateInterval = 1 + Math.random();
      }
      if (this.state === "pursuing" && this.targetPlayer) {
        this.pursuePlayer(deltaTime);
      } else if (this.state === "wandering") {
        this.wander(deltaTime);
      } else if (this.state === "idle") {
        this.idle(deltaTime);
      }
      let separationX = 0;
      let separationY = 0;
      if (worldContext && worldContext.enemies && this.state !== "wandering" && this.state !== "idle") {
        worldContext.enemies.forEach((otherEnemy) => {
          if (otherEnemy !== this && otherEnemy.state !== "dead") {
            const dx = this.x - otherEnemy.x;
            const dy = this.y - otherEnemy.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq > 0 && distanceSq < this.separationRadius * this.separationRadius) {
              const distance = Math.sqrt(distanceSq);
              const forceMagnitude = (this.separationRadius - distance) / this.separationRadius;
              const directForceX = dx / distance * forceMagnitude;
              const directForceY = dy / distance * forceMagnitude;
              separationX += directForceX;
              separationY += directForceY;
              const tangentialForceMagnitude = forceMagnitude * 0.3;
              const tangentialForceX = -directForceY * tangentialForceMagnitude;
              const tangentialForceY = directForceX * tangentialForceMagnitude;
              separationX += tangentialForceX;
              separationY += tangentialForceY;
            }
          }
        });
      }
      const separationLength = Math.sqrt(separationX * separationX + separationY * separationY);
      if (separationLength > 0) {
        this.velocityX += separationX / separationLength * this.separationForce * deltaTime;
        this.velocityY += separationY / separationLength * this.separationForce * deltaTime;
      }
      let avoidanceX = 0;
      let avoidanceY = 0;
      if (worldContext && worldContext.projectiles && this.avoidanceTimer <= 0 && this.state !== "stunned" && this.state !== "dead") {
        worldContext.projectiles.forEach((proj) => {
          if (proj.type === "enemy_projectile" && proj.ownerId !== this.id && proj.state !== "dead") {
            const dx = proj.x - this.x;
            const dy = proj.y - this.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq < this.avoidanceRadius * this.avoidanceRadius) {
              const predictTime = this.avoidancePredictionTime;
              const futureProjX = proj.x + proj.velocityX * predictTime;
              const futureProjY = proj.y + proj.velocityY * predictTime;
              const futureEnemyX = this.x + this.velocityX * predictTime;
              const futureEnemyY = this.y + this.velocityY * predictTime;
              const enemyBounds = this.getAbsoluteBounds();
              const futureEnemyLeft = futureEnemyX - enemyBounds.width / 2;
              const futureEnemyRight = futureEnemyX + enemyBounds.width / 2;
              const futureEnemyTop = futureEnemyY - enemyBounds.height / 2;
              const futureEnemyBottom = futureEnemyY + enemyBounds.height / 2;
              if (futureProjX > futureEnemyLeft && futureProjX < futureEnemyRight && futureProjY > futureEnemyTop && futureProjY < futureEnemyBottom) {
                const projVelLen = Math.sqrt(proj.velocityX * proj.velocityX + proj.velocityY * proj.velocityY);
                if (projVelLen > 0) {
                  const perp1X = -proj.velocityY / projVelLen;
                  const perp1Y = proj.velocityX / projVelLen;
                  const perp2X = proj.velocityY / projVelLen;
                  const perp2Y = -proj.velocityX / projVelLen;
                  const dot1 = perp1X * dx + perp1Y * dy;
                  const dot2 = perp2X * dx + perp2Y * dy;
                  if (dot1 > dot2) {
                    avoidanceX += perp1X;
                    avoidanceY += perp1Y;
                  } else {
                    avoidanceX += perp2X;
                    avoidanceY += perp2Y;
                  }
                  this.avoidanceTimer = this.avoidanceCooldown;
                }
              }
            }
          }
        });
        const avoidanceLength = Math.sqrt(avoidanceX * avoidanceX + avoidanceY * avoidanceY);
        if (avoidanceLength > 0) {
          this.velocityX += avoidanceX / avoidanceLength * this.avoidanceForce * deltaTime;
          this.velocityY += avoidanceY / avoidanceLength * this.avoidanceForce * deltaTime;
        }
      }
      super.update(deltaTime);
    }
    makeDecision() {
      if (this.isStunned || this.state === "dead") return;
      if (this.targetPlayer) {
        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        if (distanceToPlayer <= this.agroRange) {
          if (Math.random() < this.aggressiveness) {
            this.setState("pursuing");
            return;
          }
        }
      }
      if (Math.random() < 0.7) {
        this.startWandering();
      } else {
        this.startIdle();
      }
    }
    startWandering() {
      this.setState("wandering");
      const angle = Math.random() * Math.PI * 2;
      this.wanderDirection = {
        x: Math.cos(angle),
        y: Math.sin(angle)
      };
      this.wanderDuration = 1 + Math.random() * 2;
      this.wanderTimer = 0;
    }
    wander(deltaTime) {
      this.velocityX = this.wanderDirection.x * this.wanderSpeed;
      this.velocityY = this.wanderDirection.y * this.wanderSpeed;
      this.wanderTimer += deltaTime;
      if (this.wanderTimer >= this.wanderDuration) {
        if (Math.random() < 0.3) {
          this.startIdle();
        } else {
          this.startWandering();
        }
      }
    }
    startIdle() {
      this.setState("idle");
      this.velocityX = 0;
      this.velocityY = 0;
      this.idleDuration = 0.5 + Math.random() * 1.5;
      this.idleTimer = 0;
    }
    idle(deltaTime) {
      this.idleTimer += deltaTime;
      if (this.idleTimer >= this.idleDuration) {
        this.makeDecision();
      }
    }
    pursuePlayer(deltaTime) {
      if (!this.targetPlayer) return;
      const dx = this.targetPlayer.x - this.x;
      const dy = this.targetPlayer.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > this.agroRange * 1.1) {
        this.startWandering();
        return;
      }
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      const perpX = -normalizedY;
      const perpY = normalizedX;
      const flankTargetX = this.targetPlayer.x + perpX * this.flankDirection * this.flankOffsetDistance;
      const flankTargetY = this.targetPlayer.y + perpY * this.flankDirection * this.flankOffsetDistance;
      const flankDx = flankTargetX - this.x;
      const flankDy = flankTargetY - this.y;
      const flankDist = Math.sqrt(flankDx * flankDx + flankDy * flankDy);
      let finalMoveX = normalizedX;
      let finalMoveY = normalizedY;
      if (flankDist > 10) {
        finalMoveX = flankDx / flankDist;
        finalMoveY = flankDy / flankDist;
      }
      const flankWeight = 0.7;
      const combinedMoveX = finalMoveX * flankWeight + normalizedX * (1 - flankWeight);
      const combinedMoveY = finalMoveY * flankWeight + normalizedY * (1 - flankWeight);
      const combinedLength = Math.sqrt(combinedMoveX * combinedMoveX + combinedMoveY * combinedMoveY);
      const finalCombinedX = combinedLength > 0 ? combinedMoveX / combinedLength : normalizedX;
      const finalCombinedY = combinedLength > 0 ? combinedMoveY / combinedLength : normalizedY;
      this.velocityX = finalCombinedX * this.moveSpeed;
      this.velocityY = finalCombinedY * this.moveSpeed;
    }
    // Override takeDamage to add hit effects
    takeDamage(amount) {
      const oldHealth = this.health;
      super.takeDamage(amount);
      console.log(`Enemy ${this.id} took ${amount} damage. Health: ${oldHealth} -> ${this.health}`);
      this.hitEffectTimer = this.hitEffectDuration;
      this.isFlashing = true;
      this.stunEffectIntensity = 1;
    }
    // Handle collision with player attacks
    handleCollision(otherEntity) {
      super.handleCollision(otherEntity);
      if (otherEntity.type === "player") {
        console.log(`Enemy ${this.id} collided with player ${otherEntity.id}. Cooldown: ${this.damageCooldownTimer.toFixed(2)}`);
        if (this.damageCooldownTimer <= 0 && this.state !== "dead" && !this.isStunned) {
          console.log(`>>> Enemy ${this.id} applying ${this.damageAmount} damage to player ${otherEntity.id}`);
          otherEntity.takeDamage(this.damageAmount);
          if (this.scene && typeof this.scene.createMeleeHitEffect === "function") {
            this.scene.createMeleeHitEffect(this.x, this.y);
          } else {
            console.warn(`Enemy ${this.id}: Scene or createMeleeHitEffect method not found!`);
          }
          this.damageCooldownTimer = this.damageCooldown;
        }
      }
    }
    // Override onStun to add visual enhancements
    stun(duration) {
      super.stun(duration);
      this.stunEffectIntensity = 1;
      this.setState("stunned");
    }
    onDeath() {
      super.onDeath();
      console.log(`Enemy ${this.id} died!`);
      this.velocityX = 0;
      this.velocityY = 0;
      this.isStunned = false;
      this.stunEffectIntensity = 0;
      const dropChance = 0.1;
      if (Math.random() < dropChance) {
        if (this.scene && this.scene.powerupManager) {
          console.log(`Enemy ${this.id} dropping powerup at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
          this.scene.powerupManager.spawnPowerup(this.x, this.y);
        } else {
          console.warn(`Enemy ${this.id}: Cannot drop powerup - scene or powerupManager not found.`);
        }
      }
    }
    // --- applyBleed Method Removed ---
    // applyBleed(dps, duration) { ... }
    // --- updateBleed Method Removed ---
    // updateBleed(deltaTime) {
    //     if (!this.isBleeding || this.state === 'dead') {
    //         return;
    //     }
    //
    //     if (this.bleedDurationTimer > 0) {
    //         this.bleedDurationTimer -= deltaTime;
    //
    //         // Apply damage proportionally to deltaTime
    //         const damageThisFrame = this.bleedDPS * deltaTime;
    //         super.takeDamage(damageThisFrame);
    //
    //         // Visual tick timer
    //         this.bleedTickTimer -= deltaTime;
    //         if (this.bleedTickTimer <= 0) {
    //             this.bleedTickTimer = this.bleedTickInterval;
    //             // Trigger visual damage indicator in GameScreen
    //             if (this.scene && typeof this.scene.createBleedDamageIndicator === 'function') {
    //                 // Also trigger dripping particle effect
    //                 if (typeof this.scene.createBleedParticleEffect === 'function') {
    //                     // this.scene.createBleedParticleEffect(this.x, this.y); // Removed
    //                 }
    //                 // this.scene.createBleedDamageIndicator(this.x, this.y, Math.ceil(this.bleedDPS * this.bleedTickInterval)); // Removed
    //             }
    //         }
    //
    //
    //         if (this.bleedDurationTimer <= 0) {
    //             console.log(`Enemy ${this.id} bleed ended.`);
    //             this.isBleeding = false;
    //             this.bleedDPS = 0;
    //             this.bleedDurationTimer = 0;
    //         }
    //     } else {
    //          // Safety cleanup if timer is somehow <= 0 but flag is true
    //          this.isBleeding = false;
    //          this.bleedDPS = 0;
    //     }
    // }
  };

  // src/entities/RangedEnemy.js
  var RangedEnemy = class extends Enemy {
    constructor(x, y, options = {}) {
      const rangedOptions = {
        maxHealth: options.maxHealth || 75,
        // Ranged enemies might be less tanky
        moveSpeed: options.moveSpeed || 60,
        // Slightly slower maybe
        detectionRange: options.detectionRange || 600,
        // Increased detection range
        attackRange: options.attackRange || 700,
        // Increased attack range (now 700px)
        attackCooldown: options.attackCooldown || 2,
        // Time between shots (seconds)
        attackPower: options.attackPower || 10,
        // Damage per shot
        projectileSpeed: options.projectileSpeed || 300,
        // Speed of the projectile
        retreatDistance: options.retreatDistance || 300,
        // Increased retreat distance
        spritePath: "assets/ranged_enemy.png",
        // Added sprite path
        // color: '#90EE90', // Color determined by sprite
        // size: 40, // Size determined by sprite
        ...options,
        // Allow overriding defaults
        type: "ranged_enemy"
        // Specific type identifier
      };
      super(x, y, rangedOptions);
      this.attackRange = rangedOptions.attackRange;
      this.attackCooldown = rangedOptions.attackCooldown;
      this.attackPower = rangedOptions.attackPower;
      this.projectileSpeed = rangedOptions.projectileSpeed;
      this.retreatDistance = rangedOptions.retreatDistance;
      this.smokeBombRange = rangedOptions.smokeBombRange || 150;
      this.smokeBombCooldown = rangedOptions.smokeBombCooldown || 10;
      this.smokeBombTeleportDist = rangedOptions.smokeBombTeleportDist || 250;
      this.attackTimer = 0;
      this.isAttacking = false;
      this.attackDuration = 0.3;
      this.attackActionTimer = 0;
      this.smokeBombTimer = 0;
    }
    update(deltaTime, worldContext) {
      if (this.state === "dead") return;
      if (this.attackTimer > 0) {
        this.attackTimer -= deltaTime;
      }
      if (this.smokeBombTimer > 0) {
        this.smokeBombTimer -= deltaTime;
      }
      if (this.isAttacking) {
        this.attackActionTimer += deltaTime;
        if (this.attackActionTimer >= this.attackDuration) {
          this.isAttacking = false;
        }
        this.velocityX = 0;
        this.velocityY = 0;
        Entity.prototype.update.call(this, deltaTime);
        return;
      }
      super.update(deltaTime, worldContext);
    }
    makeDecision() {
      if (this.isStunned || this.state === "dead" || this.isAttacking) return;
      if (this.targetPlayer && this.targetPlayer.state !== "dead") {
        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        if (distanceToPlayer < this.smokeBombRange && this.smokeBombTimer <= 0) {
          this.useSmokeBomb(dx / distanceToPlayer, dy / distanceToPlayer);
          return;
        }
        if (distanceToPlayer <= this.attackRange && distanceToPlayer >= this.retreatDistance && this.attackTimer <= 0) {
          this.startAttack();
          return;
        }
        if (distanceToPlayer <= this.detectionRange) {
          this.setState("pursuing");
          return;
        }
      }
      if (this.state !== "wandering" && this.state !== "idle") {
        if (Math.random() < 0.7) {
          this.startWandering();
        } else {
          this.startIdle();
        }
      }
    }
    startAttack() {
      if (this.attackTimer <= 0 && this.targetPlayer && this.targetPlayer.state !== "dead" && !this.isAttacking && !this.isStunned) {
        this.setState("attacking");
        this.isAttacking = true;
        this.attackActionTimer = 0;
        this.attackTimer = this.attackCooldown;
        this.velocityX = 0;
        this.velocityY = 0;
        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let fireDirection = { x: 0, y: 1 };
        if (distance > 0) {
          fireDirection = { x: dx / distance, y: dy / distance };
        }
        this.fireProjectile(fireDirection);
      }
    }
    // This method signals that a projectile should be created.
    // The actual creation logic will likely live in GameScreen or a ProjectileManager.
    fireProjectile(direction) {
      console.log(`DEBUG: RangedEnemy ${this.id} attempting fire. this.scene:`, this.scene);
      if (this.scene && typeof this.scene.createProjectile === "function") {
        this.scene.createProjectile(
          this.x,
          // Start position x
          this.y,
          // Start position y
          direction,
          // Normalized direction vector {x, y}
          this.projectileSpeed,
          // Speed
          this.attackPower,
          // Damage
          this.id,
          // ID of the enemy firing (to prevent self-collision)
          "enemy_projectile"
          // Type identifier for the projectile
        );
      } else {
        console.warn(`RangedEnemy ${this.id}: Cannot fire projectile. Condition failed: (this.scene && typeof this.scene.createProjectile === 'function')`);
        console.warn(`DEBUG: Value of this.scene:`, this.scene);
        if (this.scene) {
          console.warn(`DEBUG: Value of typeof this.scene.createProjectile:`, typeof this.scene.createProjectile);
        }
      }
    }
    pursuePlayer(deltaTime) {
      if (!this.targetPlayer || this.targetPlayer.state === "dead") {
        this.startWandering();
        return;
      }
      const dx = this.targetPlayer.x - this.x;
      const dy = this.targetPlayer.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > this.detectionRange * 1.1) {
        this.startWandering();
        return;
      }
      let targetX = 0;
      let targetY = 0;
      let speed = this.moveSpeed;
      if (distance < this.retreatDistance) {
        targetX = -dx / distance;
        targetY = -dy / distance;
        speed = this.moveSpeed * 1.2;
      } else if (distance > this.attackRange) {
        targetX = dx / distance;
        targetY = dy / distance;
      } else {
        targetX = 0;
        targetY = 0;
      }
      this.velocityX = targetX * speed;
      this.velocityY = targetY * speed;
    }
    // Override takeDamage to potentially interrupt attacks or add specific reactions
    takeDamage(amount) {
      super.takeDamage(amount);
    }
    // Override onDeath for specific cleanup if needed
    onDeath() {
      super.onDeath();
    }
    useSmokeBomb(dirX, dirY) {
      console.log(`RangedEnemy ${this.id} used Smoke Bomb!`);
      if (this.scene && typeof this.scene.createSmokeBombEffect === "function") {
        this.scene.createSmokeBombEffect(this.x, this.y);
      } else {
        console.warn(`RangedEnemy ${this.id}: Scene or createSmokeBombEffect method not found!`);
      }
      const targetX = this.x + dirX * this.smokeBombTeleportDist;
      const targetY = this.y + dirY * this.smokeBombTeleportDist;
      this.x = targetX;
      this.y = targetY;
      this.smokeBombTimer = this.smokeBombCooldown;
      this.velocityX = 0;
      this.velocityY = 0;
      this.setState("idle");
      this.idleTimer = 0.5;
    }
  };

  // src/entities/DroneEnemy.js
  var DroneEnemy = class extends Enemy {
    constructor(x, y, options = {}) {
      const droneOptions = {
        maxHealth: 15,
        // Low health
        moveSpeed: 110,
        // Slightly faster than base enemy
        damageAmount: 2,
        // Very low contact damage
        friction: 0.95,
        // Less friction for quicker movement changes
        collisionBounds: { x: 0, y: 0, width: 20, height: 20 },
        // Smaller size
        color: "#FFD700",
        // Gold/Yellow color for drones
        agroRange: 50 * 50,
        // Standard agro range
        separationRadius: 30,
        // Less separation needed for smaller drones
        separationForce: 90,
        type: "drone_enemy",
        // Specific type identifier
        spritePath: "assets/drone.png",
        // Added sprite path
        // color: '#FFD700', // Color determined by sprite
        ...options
        // Allow specific overrides from spawner
      };
      super(x, y, droneOptions);
      this.explosionRadius = 60;
      this.explosionDamage = 20;
    }
    onDeath() {
      this.state = "dead";
      this.velocityX = 0;
      this.velocityY = 0;
      this.isStunned = false;
      console.log(`DroneEnemy ${this.id} died and is exploding!`);
      if (this.scene && typeof this.scene.createExplosionEffect === "function") {
        this.scene.createExplosionEffect(this.x, this.y, this.explosionRadius);
      } else {
        console.warn(`DroneEnemy ${this.id}: Scene or createExplosionEffect method not found!`);
      }
      let entitiesToDamage = [];
      if (this.scene && this.scene.enemyManager && this.scene.player) {
        entitiesToDamage.push(this.scene.player);
        entitiesToDamage = entitiesToDamage.concat(
          this.scene.enemies.filter((e) => e !== this)
          // Get all other enemies from the scene list
        );
      } else if (this.scene && this.scene.entityManager) {
        entitiesToDamage = this.scene.entityManager.getEntitiesNear(this.x, this.y, this.explosionRadius).filter((e) => e !== this);
      } else {
        console.warn(`DroneEnemy ${this.id}: Scene, EnemyManager/Player, or EntityManager not found for explosion damage.`);
      }
      entitiesToDamage.forEach((entity) => {
        if (entity.state !== "dead") {
          const dx = entity.x - this.x;
          const dy = entity.y - this.y;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq <= this.explosionRadius * this.explosionRadius) {
            if (entity.type === "player" || entity.type === "enemy" || entity.type === "drone_enemy" || entity.type === "engineer_enemy" || entity.type === "ranged_enemy" || entity.type === "splitter_enemy") {
              console.log(`Drone explosion hitting ${entity.type} ${entity.id} for ${this.explosionDamage} damage.`);
              entity.takeDamage(this.explosionDamage);
            }
          }
        }
      });
    }
    // Removed custom draw method - rely on parent Entity draw
  };

  // src/entities/TurretEnemy.js
  var TurretEnemy = class extends Enemy {
    constructor(x, y, options = {}) {
      const turretOptions = {
        maxHealth: Infinity,
        // Invincible
        moveSpeed: 0,
        // Stationary
        wanderSpeed: 0,
        // Stationary
        friction: 1,
        // No sliding
        collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 50, height: 50 },
        // Adjust size as needed
        attackRange: options.attackRange || 600,
        attackCooldown: options.attackCooldown || 2.5,
        // Slower fire rate than RangedEnemy?
        attackPower: options.attackPower || 8,
        projectileSpeed: options.projectileSpeed || 250,
        damageAmount: 0,
        // No contact damage
        spritePath: "assets/turret.png",
        // Added sprite path
        ...options,
        type: "turret_enemy",
        // Specific type identifier
        // Remove properties not needed for a stationary turret
        aggressiveness: 1,
        // Always aggressive if player in range
        separationRadius: 0,
        separationForce: 0,
        avoidanceRadius: 0,
        avoidanceForce: 0,
        flankDirection: 0,
        flankOffsetDistance: 0
      };
      super(x, y, turretOptions);
      this.attackRange = turretOptions.attackRange;
      this.attackCooldown = turretOptions.attackCooldown;
      this.attackPower = turretOptions.attackPower;
      this.projectileSpeed = turretOptions.projectileSpeed;
      this.attackTimer = Math.random() * this.attackCooldown;
      this.isShooting = false;
      this.shootDuration = 0.2;
      this.shootTimer = 0;
      this.state = "idle";
      this.indicatorOffsetY = -40;
      this.indicatorWidth = 50;
      this.indicatorHeight = 8;
      this.indicatorBgGraphics = null;
      this.indicatorProgressGraphics = null;
      this.isIndicatorVisible = false;
      if (options.scene) {
        this.scene = options.scene;
        this.createIndicatorGraphics();
      }
    }
    update(deltaTime, worldContext) {
      if (this.state === "dead") return;
      if (worldContext && worldContext.player && !this.targetPlayer) {
        this.targetPlayer = worldContext.player;
      }
      if (worldContext && worldContext.scene && !this.scene) {
        this.scene = worldContext.scene;
      }
      if (this.attackTimer > 0) {
        this.attackTimer -= deltaTime;
      }
      if (this.isShooting) {
        this.shootTimer += deltaTime;
        if (this.shootTimer >= this.shootDuration) {
          this.isShooting = false;
          this.shootTimer = 0;
        }
      }
      this.makeDecision();
      if (this.state === "attacking" && !this.isShooting && this.attackTimer <= 0 && this.targetPlayer && this.targetPlayer.state !== "dead") {
        this.performAttack();
      }
      Entity.prototype.update.call(this, deltaTime);
      this.velocityX = 0;
      this.velocityY = 0;
      this.updateIndicatorPosition();
    }
    makeDecision() {
      if (this.isStunned || !this.targetPlayer || this.targetPlayer.state === "dead") {
        this.setState("idle");
        return;
      }
      const dx = this.targetPlayer.x - this.x;
      const dy = this.targetPlayer.y - this.y;
      const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
      if (distanceToPlayer <= this.attackRange) {
        this.setState("attacking");
      } else {
        this.setState("idle");
      }
    }
    performAttack() {
      if (!this.targetPlayer || this.targetPlayer.state === "dead" || !this.scene) return;
      this.isShooting = true;
      this.shootTimer = 0;
      this.attackTimer = this.attackCooldown;
      const dx = this.targetPlayer.x - this.x;
      const dy = this.targetPlayer.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let fireDirection = { x: 0, y: 1 };
      if (distance > 0) {
        fireDirection = { x: dx / distance, y: dy / distance };
      }
      this.fireProjectile(fireDirection);
    }
    fireProjectile(direction) {
      if (this.scene && typeof this.scene.createProjectile === "function") {
        this.scene.createProjectile(
          this.x,
          this.y,
          direction,
          this.projectileSpeed,
          this.attackPower,
          this.id,
          // Owner ID
          "enemy_projectile"
          // Type
        );
      } else {
        console.warn(`TurretEnemy ${this.id}: Cannot fire projectile. Scene or createProjectile method not found.`);
        console.warn(`DEBUG: Value of this.scene:`, this.scene);
        if (this.scene) {
          console.warn(`DEBUG: Value of typeof this.scene.createProjectile:`, typeof this.scene.createProjectile);
        }
      }
    }
    // Override takeDamage to make the turret invincible
    takeDamage(amount) {
    }
    // Override stun - maybe turrets can't be stunned? Or maybe they can?
    // For now, let's allow stunning via the base Entity logic, but it won't move anyway.
    // stun(duration) {
    //     super.stun(duration);
    // }
    // Override onDeath - should never be called if invincible
    onDeath() {
      super.onDeath();
      this.hideDestructionIndicator();
    }
    // Remove methods related to movement and complex AI inherited from Enemy
    pursuePlayer(deltaTime) {
    }
    wander(deltaTime) {
    }
    startWandering() {
    }
    idle(deltaTime) {
    }
    startIdle() {
    }
    // Override handleCollision to prevent contact damage
    handleCollision(otherEntity) {
      Entity.prototype.handleCollision.call(this, otherEntity);
    }
    // Override setState to prevent entering movement states
    setState(newState) {
      if (newState === "pursuing" || newState === "wandering") {
        newState = "idle";
      }
      super.setState(newState);
    }
    // --- NEW: Method called by Player to destroy the turret ---
    destroyTurret() {
      console.log(`Turret ${this.id} is being destroyed by player interaction.`);
      this.onDeath();
    }
    // --- NEW: Indicator Methods ---
    createIndicatorGraphics() {
      if (!this.scene || this.indicatorBgGraphics) return;
      this.indicatorBgGraphics = this.scene.add.graphics();
      this.indicatorBgGraphics.fillStyle(0, 0.5);
      this.indicatorBgGraphics.fillRect(0, 0, this.indicatorWidth, this.indicatorHeight);
      this.indicatorBgGraphics.setVisible(false);
      this.indicatorBgGraphics.setDepth(10);
      this.indicatorProgressGraphics = this.scene.add.graphics();
      this.indicatorProgressGraphics.fillStyle(16763904, 1);
      this.indicatorProgressGraphics.fillRect(0, 0, 0, this.indicatorHeight);
      this.indicatorProgressGraphics.setVisible(false);
      this.indicatorProgressGraphics.setDepth(11);
      this.updateIndicatorPosition();
    }
    updateIndicatorPosition() {
      if (this.indicatorBgGraphics) {
        const indicatorX = this.x - this.indicatorWidth / 2;
        const indicatorY = this.y + this.indicatorOffsetY;
        this.indicatorBgGraphics.setPosition(indicatorX, indicatorY);
        this.indicatorProgressGraphics.setPosition(indicatorX, indicatorY);
      }
    }
    showDestructionIndicator() {
      if (!this.indicatorBgGraphics && this.scene) {
        this.createIndicatorGraphics();
      }
      if (this.indicatorBgGraphics && !this.isIndicatorVisible) {
        this.indicatorBgGraphics.setVisible(true);
        this.indicatorProgressGraphics.setVisible(true);
        this.updateDestructionIndicator(0);
        this.isIndicatorVisible = true;
      }
    }
    updateDestructionIndicator(progress) {
      if (this.indicatorProgressGraphics && this.isIndicatorVisible) {
        const currentWidth = this.indicatorWidth * progress;
        this.indicatorProgressGraphics.clear();
        this.indicatorProgressGraphics.fillStyle(16763904, 1);
        this.indicatorProgressGraphics.fillRect(0, 0, currentWidth, this.indicatorHeight);
      }
    }
    hideDestructionIndicator() {
      if (this.isIndicatorVisible) {
        if (this.indicatorBgGraphics) {
          this.indicatorBgGraphics.destroy();
          this.indicatorBgGraphics = null;
        }
        if (this.indicatorProgressGraphics) {
          this.indicatorProgressGraphics.destroy();
          this.indicatorProgressGraphics = null;
        }
        this.isIndicatorVisible = false;
      }
    }
  };

  // src/entities/Projectile.js
  var Projectile = class extends Entity {
    constructor(x, y, direction, speed, damage, ownerId, type = "projectile", options = {}) {
      const projectileOptions = {
        type,
        // e.g., 'enemy_projectile', 'player_projectile'
        collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 10, height: 10 },
        // Small collision box
        friction: 1,
        // No friction, moves constantly
        maxHealth: 1,
        // Destroyed on first hit
        ...options
      };
      super(x, y, projectileOptions);
      this.speed = speed;
      this.damage = damage;
      this.ownerId = ownerId;
      this.direction = { ...direction };
      this.velocityX = this.direction.x * this.speed;
      this.velocityY = this.direction.y * this.speed;
      this.lifeTimer = 0;
      this.maxLifetime = options.maxLifetime || 3;
    }
    update(deltaTime, worldContext) {
      if (this.state === "dead") return;
      this.lifeTimer += deltaTime;
      if (this.lifeTimer >= this.maxLifetime) {
        this.destroy();
        return;
      }
      super.update(deltaTime);
    }
    // Handle collision with other entities
    handleCollision(otherEntity) {
      if (otherEntity.id === this.ownerId) {
        return;
      }
      if (otherEntity.type.includes("projectile")) {
        return;
      }
      console.log(`[Projectile.handleCollision] Collision detected: Projectile ${this.id} (Type: ${this.type}, Owner: ${this.ownerId}) vs Entity ${otherEntity.id} (Type: ${otherEntity.type})`);
      if (this.type === "enemy_projectile" && otherEntity.type === "player") {
        console.log(`[Projectile.handleCollision] Condition met: Projectile ${this.id} (Type: ${this.type}) vs Player ${otherEntity.id} (Type: ${otherEntity.type}). Damage: ${this.damage}`);
        console.log(`[Projectile.handleCollision] Calling takeDamage on Player ${otherEntity.id}`);
        otherEntity.takeDamage(this.damage, this);
        this.destroy();
      } else if (this.type === "player_projectile" && (otherEntity.type === "enemy" || otherEntity.type === "ranged_enemy" || otherEntity.type === "engineer" || otherEntity.type === "drone_enemy")) {
        otherEntity.takeDamage(this.damage);
        this.destroy();
      } else {
        if (otherEntity.id !== this.ownerId && !otherEntity.type.includes("projectile")) {
        }
      }
    }
    // Override destroy to set state for removal
    destroy() {
      if (this.state !== "dead") {
        this.setState("dead");
        this.velocityX = 0;
        this.velocityY = 0;
      }
    }
    // Override onDeath (called by setState('dead'))
    onDeath() {
      super.onDeath();
    }
  };

  // src/entities/EngineerEnemy.js
  var EngineerEnemy = class extends Enemy {
    constructor(x, y, options = {}) {
      const engineerOptions = {
        type: "engineer",
        maxHealth: 2e3,
        // Increased from 500
        friction: 0.95,
        collisionBounds: { x: 0, y: 0, width: 80, height: 80 },
        moveSpeed: 60,
        damageAmount: 0,
        color: "#FFFF00",
        spritePath: "assets/engineer.png",
        // Added sprite path
        // size: 80, // Size will be determined by sprite
        ...options,
        scene: options.scene
      };
      super(x, y, engineerOptions);
      this.tunnelRange = 150;
      this.tunnelCooldown = 20;
      this.tunnelDuration = 0.75;
      this.tunnelMinDistance = 300;
      this.tunnelMaxDistance = 600;
      this.tunnelPlayerAvoidRadius = 200;
      this.tunnelCooldownTimer = 0;
      this.tunnelPhaseTimer = 0;
      this.targetTunnelX = 0;
      this.targetTunnelY = 0;
      this.startX = 0;
      this.startY = 0;
      this.tunnelTrailTimer = 0;
      this.tunnelTrailInterval = 0.03;
      if (!this.state) {
        this.setState("idle");
      }
      this.collidable = true;
      this.turretSpawnCooldown = 8;
      this.turretSpawnCooldownTimer = Math.random() * this.turretSpawnCooldown;
      this.turretSpawnChance = 0.75;
      this.visible = true;
      this.hasSpawnedDrones = false;
      this.shootRange = 700;
      this.fireRate = 5;
      this.fireCooldown = 1 / this.fireRate;
      this.fireCooldownTimer = 0;
      this.projectileSpeed = 500;
      this.projectileDamage = 2;
      this.gunOffset = 35;
      this.nextGun = 0;
      this.clipSize = 30;
      this.ammoCount = this.clipSize;
      this.reloadTime = 4;
      this.reloadTimer = 0;
      this.isReloading = false;
      console.log(`EngineerEnemy created at (${x}, ${y})`);
    }
    update(deltaTime, worldContext) {
      if (this.tunnelCooldownTimer > 0) {
        this.tunnelCooldownTimer -= deltaTime;
        if (this.tunnelCooldownTimer < 0) this.tunnelCooldownTimer = 0;
      }
      if (this.turretSpawnCooldownTimer > 0) {
        this.turretSpawnCooldownTimer -= deltaTime;
        if (this.turretSpawnCooldownTimer < 0) this.turretSpawnCooldownTimer = 0;
      }
      if (this.fireCooldownTimer > 0) {
        this.fireCooldownTimer -= deltaTime;
        if (this.fireCooldownTimer < 0) this.fireCooldownTimer = 0;
      }
      if (this.isReloading) {
        this.reloadTimer -= deltaTime;
        if (this.reloadTimer <= 0) {
          this.isReloading = false;
          this.ammoCount = this.clipSize;
          this.reloadTimer = 0;
          console.log(`Engineer ${this.id} finished reloading.`);
        }
      }
      if (this.state === "tunneling_underground") {
        this.tunnelPhaseTimer -= deltaTime;
        this.tunnelTrailTimer -= deltaTime;
        const undergroundProgress = 1 - Math.max(0, this.tunnelPhaseTimer / this.tunnelDuration);
        if (this.tunnelTrailTimer <= 0 && this.scene && typeof this.scene.createTunnelTrailParticle === "function") {
          this.tunnelTrailTimer = this.tunnelTrailInterval;
          const trailX = this.startX + (this.targetTunnelX - this.startX) * undergroundProgress;
          const trailY = this.startY + (this.targetTunnelY - this.startY) * undergroundProgress;
          this.scene.createTunnelTrailParticle(trailX, trailY);
        }
        if (this.tunnelPhaseTimer <= 0) {
          this.x = this.targetTunnelX;
          this.y = this.targetTunnelY;
          this.visible = true;
          this.collidable = true;
          if (this.scene && typeof this.scene.createTunnelExplosion === "function") {
            this.scene.createTunnelExplosion(this.x, this.y);
            if (typeof this.scene.createShockwaveEffect === "function") {
              this.scene.createShockwaveEffect(this.x, this.y);
            }
          }
          if (this.turretSpawnCooldownTimer <= 0 && Math.random() < this.turretSpawnChance) {
            this.spawnTurrets();
            this.turretSpawnCooldownTimer = this.turretSpawnCooldown;
          }
          this.setState("idle");
          console.log(`Engineer ${this.id} reappeared at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        } else {
          return;
        }
      }
      if (this.state !== "tunneling_underground" && this.state !== "stunned" && this.state !== "dead" && this.targetPlayer && !this.isReloading) {
        const dx = this.targetPlayer.x - this.x;
        const dy = this.targetPlayer.y - this.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq <= this.shootRange * this.shootRange && this.fireCooldownTimer <= 0 && this.ammoCount > 0) {
          this.shoot(dx, dy, distanceSq);
          this.fireCooldownTimer = this.fireCooldown;
        }
      }
      if (this.state !== "tunneling_underground") {
        this.visible = true;
        this.collidable = true;
      }
      super.update(deltaTime, worldContext);
    }
    // PursuePlayer modified to prevent tunneling while reloading
    pursuePlayer(deltaTime) {
      const canTunnel = this.state !== "stunned" && this.state !== "dead" && this.state !== "tunneling_underground" && !this.isReloading;
      if (!this.targetPlayer || !canTunnel) {
        if (this.state === "pursuing") {
          super.pursuePlayer(deltaTime);
        }
        return;
      }
      const dx = this.targetPlayer.x - this.x;
      const dy = this.targetPlayer.y - this.y;
      const distanceSq = dx * dx + dy * dy;
      const tunnelRangeSq = this.tunnelRange * this.tunnelRange;
      if (canTunnel && distanceSq <= tunnelRangeSq && this.tunnelCooldownTimer <= 0) {
        this.startTunneling();
        return;
      }
      super.pursuePlayer(deltaTime);
    }
    startTunneling() {
      const dx = this.targetPlayer ? this.targetPlayer.x - this.x : 0;
      const dy = this.targetPlayer ? this.targetPlayer.y - this.y : 0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      console.log(`Engineer ${this.id} initiating tunnel. Player distance: ${dist.toFixed(0)}`);
      console.log(`Engineer ${this.id} starting tunnel from (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
      if (this.scene && typeof this.scene.createTunnelExplosion === "function") {
        this.scene.createTunnelExplosion(this.x, this.y);
        if (typeof this.scene.createShockwaveEffect === "function") {
          this.scene.createShockwaveEffect(this.x, this.y);
        }
      }
      this.setState("tunneling_underground");
      this.startX = this.x;
      this.startY = this.y;
      this.tunnelTrailTimer = 0;
      this.tunnelPhaseTimer = this.tunnelDuration;
      this.tunnelCooldownTimer = this.tunnelCooldown;
      this.visible = false;
      this.collidable = false;
      this.velocityX = 0;
      this.velocityY = 0;
      let targetPos = null;
      if (this.scene && this.scene.worldManager && typeof this.scene.worldManager.findRandomValidPositionNear === "function") {
        targetPos = this.scene.worldManager.findRandomValidPositionNear(
          this.x,
          this.y,
          this.tunnelMinDistance,
          this.tunnelMaxDistance,
          this.targetPlayer.x,
          this.targetPlayer.y,
          this.tunnelPlayerAvoidRadius
        );
      }
      if (targetPos) {
        this.targetTunnelX = targetPos.x;
        this.targetTunnelY = targetPos.y;
        console.log(`Engineer ${this.id} target tunnel position: (${this.targetTunnelX.toFixed(0)}, ${this.targetTunnelY.toFixed(0)})`);
      } else {
        console.warn(`Engineer ${this.id}: Could not find valid tunnel position. Using fallback.`);
        const fallbackAngle = Math.random() * Math.PI * 2;
        this.targetTunnelX = this.x + Math.cos(fallbackAngle) * this.tunnelMinDistance;
        this.targetTunnelY = this.y + Math.sin(fallbackAngle) * this.tunnelMinDistance;
      }
    }
    shoot(targetDx, targetDy, targetDistanceSq) {
      if (!this.targetPlayer || !this.scene || typeof this.scene.createProjectile !== "function" || this.ammoCount <= 0 || this.isReloading) {
        console.warn(`Engineer ${this.id}: Cannot shoot - missing target/scene/method, out of ammo, or reloading.`);
        return;
      }
      const distance = Math.sqrt(targetDistanceSq);
      const dirX = distance > 0 ? targetDx / distance : 1;
      const dirY = distance > 0 ? targetDy / distance : 0;
      const direction = { x: dirX, y: dirY };
      const perpX = -dirY;
      const perpY = dirX;
      const offsetX = perpX * this.gunOffset * (this.nextGun === 0 ? -1 : 1);
      const offsetY = perpY * this.gunOffset * (this.nextGun === 0 ? -1 : 1);
      const spawnX = this.x + offsetX;
      const spawnY = this.y + offsetY;
      this.scene.createProjectile(
        spawnX,
        spawnY,
        direction,
        // Pass direction object
        this.projectileSpeed,
        this.projectileDamage,
        this.id,
        // Owner ID
        "enemy_projectile"
        // Type
        // Note: GameScreen.createProjectile doesn't currently use color, size, piercing, duration from here
      );
      this.ammoCount--;
      this.nextGun = 1 - this.nextGun;
      if (this.ammoCount <= 0) {
        this.isReloading = true;
        this.reloadTimer = this.reloadTime;
        console.log(`Engineer ${this.id} started reloading (${this.reloadTime}s).`);
      }
    }
    // HandleCollision remains the same
    handleCollision(otherEntity) {
      if (!this.collidable) return;
      if (otherEntity.type !== "player") {
        super.handleCollision(otherEntity);
      }
    }
    // Override takeDamage to check for drone spawning condition
    takeDamage(amount) {
      const oldHealth = this.health;
      super.takeDamage(amount);
      if (this.state !== "dead" && !this.hasSpawnedDrones && this.health <= this.maxHealth / 2) {
        this.spawnDrones();
        this.hasSpawnedDrones = true;
      }
    }
    spawnDrones() {
      console.log(`Engineer ${this.id} health below 50% (${this.health}/${this.maxHealth}), spawning drones!`);
      const numberOfDrones = 4 + Math.floor(Math.random() * 3);
      if (!this.scene || !Array.isArray(this.scene.enemies)) {
        console.error(`Engineer ${this.id}: Cannot spawn drones - scene or scene.enemies array not available.`);
        return;
      }
      for (let i = 0; i < numberOfDrones; i++) {
        const angle = i / numberOfDrones * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
        const spawnDist = 50 + Math.random() * 20;
        const spawnX = this.x + Math.cos(angle) * spawnDist;
        const spawnY = this.y + Math.sin(angle) * spawnDist;
        const newDrone = new DroneEnemy(spawnX, spawnY, { scene: this.scene });
        this.scene.enemies.push(newDrone);
        console.log(` -> Spawned Drone ${newDrone.id} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
      }
    }
    // Method to spawn multiple turrets
    spawnTurrets() {
      const numTurrets = 3 + Math.floor(Math.random() * 3);
      console.log(`Engineer ${this.id} attempting to spawn ${numTurrets} turrets.`);
      if (!this.scene || !Array.isArray(this.scene.enemies)) {
        console.error(`Engineer ${this.id}: Cannot spawn turrets - scene or scene.enemies array not available.`);
        return;
      }
      const baseSpawnDist = 150;
      const randomDistOffset = 100;
      for (let i = 0; i < numTurrets; i++) {
        const angle = i / numTurrets * Math.PI * 2 + (Math.random() * 0.6 - 0.3);
        const spawnDist = baseSpawnDist + Math.random() * randomDistOffset;
        const spawnX = this.x + Math.cos(angle) * spawnDist;
        const spawnY = this.y + Math.sin(angle) * spawnDist;
        const newTurret = new TurretEnemy(spawnX, spawnY, { scene: this.scene });
        this.scene.enemies.push(newTurret);
        console.log(` -> Spawned Turret ${newTurret.id} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
      }
    }
    // OnDeath remains the same
    onDeath() {
      if (this.state === "tunneling_underground") {
        this.visible = true;
        this.collidable = true;
        console.log(`Engineer ${this.id} died while tunneling underground. Resetting state.`);
      }
      super.onDeath();
      console.log(`EngineerEnemy ${this.id} has been defeated!`);
      if (this.scene && typeof this.scene.createExplosion === "function") {
        this.scene.createExplosion(this.x, this.y, this.size * 1.5, { color: this.color });
      }
      const dropChance = 0.5;
      if (Math.random() < dropChance) {
        if (this.scene && this.scene.powerupManager) {
          console.log(`EngineerEnemy ${this.id} dropping powerup at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
          this.scene.powerupManager.spawnPowerup(this.x, this.y);
        } else {
          console.warn(`EngineerEnemy ${this.id}: Cannot drop powerup - scene or powerupManager not found.`);
        }
      }
    }
    // SetState needs to reset visual effects when exiting tunneling states
    setState(newState) {
      const oldState = this.state;
      if (oldState !== newState) {
        this.state = newState;
        const exitingTunnel = oldState === "tunneling_underground";
        const enteringNonTunnel = newState !== "tunneling_underground";
        if (exitingTunnel && enteringNonTunnel) {
          this.collidable = true;
          this.visible = true;
        }
      }
    }
    // Removed draw override - rely on parent Entity draw method
    // Removed size property as it's derived from sprite now
    /**
     * Override the parent stun method to make the Engineer immune to stuns.
     * @param {number} duration - The duration the stun would normally last.
     */
    stun(duration) {
    }
  };

  // src/entities/EnemyManager.js
  var EnemyManager = class {
    constructor(scene) {
      this.scene = scene;
      this.enemies = [];
      this.maxEnemies = 50;
      this.spawnTimer = 0;
      this.spawnInterval = 10;
      this.spawnDistance = { min: 300, max: 600 };
      this.worldBounds = {
        width: 5e3,
        height: 5e3,
        centerX: 0,
        centerY: 0
      };
    }
    update(deltaTime) {
    }
    // Helper function to calculate a spawn position outside player view but within bounds
    _calculateSpawnPosition() {
      const player = this.scene.player;
      if (!player) {
        console.warn("EnemyManager: Player not found on scene, spawning at random world position.");
        const padding = 100;
        const minX2 = this.worldBounds.centerX - this.worldBounds.width / 2 + padding;
        const maxX2 = this.worldBounds.centerX + this.worldBounds.width / 2 - padding;
        const minY2 = this.worldBounds.centerY - this.worldBounds.height / 2 + padding;
        const maxY2 = this.worldBounds.centerY + this.worldBounds.height / 2 - padding;
        return {
          x: Phaser.Math.Between(minX2, maxX2),
          y: Phaser.Math.Between(minY2, maxY2)
        };
      }
      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(this.spawnDistance.min, this.spawnDistance.max);
      let spawnX = player.x + Math.cos(angle) * distance;
      let spawnY = player.y + Math.sin(angle) * distance;
      const halfWidth = this.worldBounds.width / 2;
      const halfHeight = this.worldBounds.height / 2;
      const minX = this.worldBounds.centerX - halfWidth;
      const maxX = this.worldBounds.centerX + halfWidth;
      const minY = this.worldBounds.centerY - halfHeight;
      const maxY = this.worldBounds.centerY + halfHeight;
      spawnX = Phaser.Math.Clamp(spawnX, minX + 50, maxX - 50);
      spawnY = Phaser.Math.Clamp(spawnY, minY + 50, maxY - 50);
      return { x: spawnX, y: spawnY };
    }
    // spawnSquad() { // Keep this method for potential future use, but don't call it automatically
    //     // Determine squad size (5-8 enemies)
    //     const squadSize = 5 + Math.floor(Math.random() * 4); // 5 + (0 to 3)
    //
    //     // Calculate a random center point for the squad within world bounds
    //     // Ensure the center is not too close to the edge to avoid immediate out-of-bounds spawns
    //     const padding = 100; // Padding from world edges
    //     const minX = this.worldBounds.centerX - this.worldBounds.width / 2 + padding;
    //     const maxX = this.worldBounds.centerX + this.worldBounds.width / 2 - padding;
    //     const minY = this.worldBounds.centerY - this.worldBounds.height / 2 + padding;
    //     const maxY = this.worldBounds.centerY + this.worldBounds.height / 2 - padding;
    //
    //     const squadCenterX = minX + Math.random() * (maxX - minX);
    //     const squadCenterY = minY + Math.random() * (maxY - minY);
    //
    //     console.log(`Spawning squad of ${squadSize} near (${squadCenterX.toFixed(0)}, ${squadCenterY.toFixed(0)})`);
    //
    //     // Spawn each enemy in the squad with slight position variations
    //     const squadSpawnRadius = 50; // Max distance from squad center
    //     for (let i = 0; i < squadSize; i++) {
    //         // Check if we've hit the max enemy limit during squad spawning
    //         if (this.scene.enemies.length >= this.maxEnemies) {
    //             console.log("Max enemy limit reached during squad spawn.");
    //             break; // Stop spawning this squad
    //         }
    //
    //         const angle = Math.random() * Math.PI * 2;
    //         const radius = Math.random() * squadSpawnRadius;
    //         const spawnX = squadCenterX + Math.cos(angle) * radius;
    //         const spawnY = squadCenterY + Math.sin(angle) * radius;
    //
    //         // Ensure spawn position is within world bounds (though center calculation helps)
    //         const clampedX = Phaser.Math.Clamp(spawnX, minX - padding, maxX + padding);
    //         const clampedY = Phaser.Math.Clamp(spawnY, minY - padding, maxY + padding);
    //
    //
    //         this.spawnEnemy(clampedX, clampedY); // Call the modified spawnEnemy
    //     }
    // }
    // Modified spawnEnemy: Accepts type, x, and y
    spawnEnemy(enemyType, x, y) {
      if (x === void 0 || y === void 0) {
        const pos = this._calculateSpawnPosition();
        x = pos.x;
        y = pos.y;
      }
      let enemy;
      const enemySize = 30 + Math.floor(Math.random() * 20);
      const collisionBounds = { x: 0, y: 0, width: enemySize, height: enemySize };
      switch (enemyType) {
        case "RangedEnemy":
          console.log(`Spawning RangedEnemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
          enemy = new RangedEnemy(x, y, {
            collisionBounds,
            scene: this.scene,
            color: 255
            // Blue for Ranged
          });
          break;
        // case 'SplitterEnemy': // Removed SplitterEnemy case
        //     console.log(`Spawning SplitterEnemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
        //     enemy = new SplitterEnemy(x, y, {
        //         collisionBounds: { x: 0, y: 0, width: 45, height: 45 },
        //         scene: this.scene,
        //         color: 0x00ff00 // Green for Splitter
        //     });
        //     break;
        case "EngineerEnemy":
          console.log(`Spawning EngineerEnemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
          enemy = new EngineerEnemy(x, y, {
            scene: this.scene
            // Specific options for Engineer are set within its constructor
          });
          break;
        case "Enemy":
        // Fallback to base Enemy
        default:
          console.log(`Spawning base Enemy at ${x.toFixed(0)}, ${y.toFixed(0)}`);
          const enemySpeed = 60 + Math.floor(Math.random() * 60);
          enemy = new Enemy(x, y, {
            moveSpeed: enemySpeed,
            collisionBounds,
            aggressiveness: 0.5 + Math.random() * 0.5,
            // 0.5-1.0 aggressiveness
            scene: this.scene,
            color: 16711680
            // Red for base Enemy
          });
          break;
      }
      if (enemy) {
        if (this.scene.enemies.length >= this.maxEnemies) {
          console.log("Max enemy limit reached. Cannot spawn:", enemyType);
          return null;
        }
        this.enemies.push(enemy);
        this.scene.enemies.push(enemy);
        return enemy;
      } else {
        console.error(`EnemyManager: Failed to create enemy of type ${enemyType}`);
        return null;
      }
    }
    // Removed the duplicated code block that caused syntax errors
    // Clean up enemies when resetting
    clearAllEnemies() {
      this.enemies = [];
      console.log("EnemyManager cleared its local enemy reference.");
    }
    // Set world bounds for spawn logic
    setWorldBounds(bounds2) {
      this.worldBounds = bounds2;
    }
    // Method for WaveManager to check remaining enemies
    getActiveEnemyCount() {
      if (!this.scene || !this.scene.enemies) {
        console.warn("getActiveEnemyCount: Scene or scene.enemies not available.");
        return 0;
      }
      return this.scene.enemies.filter((enemy) => enemy && enemy.state !== "dead").length;
    }
    destroy() {
      console.log("Destroying EnemyManager...");
      this.clearAllEnemies();
      this.scene = null;
    }
  };

  // src/entities/Item.js
  var Item = class extends Entity {
    constructor(x, y, options = {}) {
      const itemOptions = {
        type: "item",
        gravity: options.gravity || 0,
        // Items might not be affected by gravity by default
        friction: options.friction || 0.98,
        // Slight friction
        collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 16, height: 16 },
        // Example size
        sprite: options.sprite || null,
        // Allow passing a sprite
        animations: options.animations || {},
        // Allow passing animations
        ...options
        // Allow overriding defaults
      };
      super(x, y, itemOptions);
      this.bobbingEnabled = options.bobbingEnabled !== void 0 ? options.bobbingEnabled : true;
      this.bobbingAmplitude = options.bobbingAmplitude || 2;
      this.bobbingSpeed = options.bobbingSpeed || 2;
      this.bobbingPhase = Math.random() * Math.PI * 2;
      this.baseY = y;
    }
    update(deltaTime) {
      this.velocityY = 0;
      super.update(deltaTime);
      if (this.bobbingEnabled && this.state !== "dead") {
        this.bobbingPhase += this.bobbingSpeed * deltaTime;
        const bobOffset = Math.sin(this.bobbingPhase) * this.bobbingAmplitude;
        this.y = this.baseY + bobOffset;
      }
    }
    // Method called by the Player when collision occurs
    collect(player) {
      console.log(`Item ${this.id} collected by Player ${player.id}`);
      this.setState("dead");
    }
    // Override draw if needed, e.g., to draw differently than base Entity
    // draw(context) {
    //     super.draw(context); // Call parent draw or implement custom drawing
    // }
    // Override handleCollision if items react uniquely to collisions
    // handleCollision(otherEntity) {
    //     console.log(`Item ${this.id} collided with ${otherEntity.type}`);
    //     // Example: Item gets collected by player
    //     if (otherEntity.type === 'player') {
    //         this.collect(otherEntity); // Call the collect method
    //         // Potentially add to player inventory, score, etc. // Moved to collect()
    //     }
    // }
    // Override onDeath for specific item removal logic
    onDeath() {
      super.onDeath();
      console.log(`Item ${this.id} collected or destroyed.`);
    }
  };

  // src/entities/Plasma.js
  var Plasma = class extends Item {
    constructor(x, y, options = {}) {
      const plasmaOptions = {
        type: "plasma",
        // Specific type identifier for collision handling
        bobbingAmplitude: 8,
        // Increased bobbing amplitude (8 pixels up/down)
        bobbingSpeed: 2.5,
        // Moderate bobbing speed
        friction: 1,
        // No friction, just bob in place
        collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 24, height: 24 },
        // Slightly bigger than default
        // Override any provided options
        ...options
      };
      super(x, y, plasmaOptions);
      this.glowIntensity = 1;
      this.glowDirection = 1;
      this.glowSpeed = 0.5;
      this.value = options.value || 1;
    }
    // Override update to add pulsing glow effect
    update(deltaTime) {
      super.update(deltaTime);
      this.glowIntensity += this.glowDirection * this.glowSpeed * deltaTime;
      if (this.glowIntensity >= 1) {
        this.glowIntensity = 1;
        this.glowDirection = -1;
      } else if (this.glowIntensity <= 0.6) {
        this.glowIntensity = 0.6;
        this.glowDirection = 1;
      }
    }
    // Override collect to apply plasma-specific collection logic
    collect(player) {
      console.log(`Plasma collected by Player ${player.id}`);
      if (player.hasOwnProperty("plasmaCount")) {
        player.plasmaCount += this.value;
      }
      this.setState("dead");
      this.health = 0;
      super.collect(player);
    }
  };

  // src/ui/MiniMap.js
  var MiniMap = class {
    constructor(worldManager, player, sceneContext) {
      this.worldManager = worldManager;
      this.player = player;
      this.sceneContext = sceneContext;
      this.miniMapElement = document.getElementById("mini-map");
      this.miniMapContentElement = document.getElementById("mini-map-content");
      this.mapWidth = 0;
      this.mapHeight = 0;
      this._dimensionsRead = false;
      const loadedChunksDiameter = this.worldManager.renderDistance * 2 + 1;
      this.mapViewWorldWidth = loadedChunksDiameter * this.worldManager.chunkSize * this.worldManager.tileSize;
      this.mapViewWorldHeight = this.mapViewWorldWidth;
      this.entityDots = /* @__PURE__ */ new Map();
      if (!this.miniMapElement || !this.miniMapContentElement) {
        console.error("MiniMap elements not found in the DOM!");
        return;
      }
    }
    show() {
      if (this.miniMapElement) {
        this.miniMapElement.style.display = "block";
      }
    }
    hide() {
      if (this.miniMapElement) {
        this.miniMapElement.style.display = "none";
      }
    }
    /**
     * Converts world coordinates to minimap coordinates.
     * Assumes world coordinates range needs to be mapped to mapWidth/mapHeight.
     * This needs refinement based on actual world size/view.
     * For now, let's assume a fixed large world area we are viewing a part of.
     * A better approach might involve knowing the total world dimensions.
     */
    getMapCoordinates(worldX, worldY) {
      const viewCenterX = this.player.x;
      const viewCenterY = this.player.y;
      const viewWidth = this.mapViewWorldWidth;
      const viewHeight = this.mapViewWorldHeight;
      const viewOffsetX = viewCenterX - viewWidth / 2;
      const viewOffsetY = viewCenterY - viewHeight / 2;
      const relativeX = worldX - viewOffsetX;
      const relativeY = worldY - viewOffsetY;
      const mapX = relativeX / viewWidth * this.mapWidth;
      const mapY = relativeY / viewHeight * this.mapHeight;
      const clampedX = Math.max(0, Math.min(this.mapWidth, mapX));
      const clampedY = Math.max(0, Math.min(this.mapHeight, mapY));
      return { x: clampedX, y: clampedY };
    }
    updateDot(entity, className) {
      if (!entity || typeof entity.x === "undefined" || typeof entity.y === "undefined") {
        return;
      }
      const entityId = entity.id || entity;
      let dotElement = this.entityDots.get(entityId);
      if (!dotElement) {
        dotElement = document.createElement("div");
        dotElement.classList.add("map-dot", className);
        this.miniMapContentElement.appendChild(dotElement);
        this.entityDots.set(entityId, dotElement);
      }
      const { x: mapX, y: mapY } = this.getMapCoordinates(entity.x, entity.y);
      dotElement.style.left = `${mapX}px`;
      dotElement.style.top = `${mapY}px`;
    }
    removeDot(entity) {
      const entityId = entity.id || entity;
      const dotElement = this.entityDots.get(entityId);
      if (dotElement) {
        dotElement.remove();
        this.entityDots.delete(entityId);
      }
    }
    clearAllDots() {
      this.entityDots.forEach((dot) => dot.remove());
      this.entityDots.clear();
    }
    // Method to remove dots whose entities no longer exist
    cleanupDots(activeEntitiesMap) {
      const dotsToRemove = [];
      this.entityDots.forEach((dotElement, entityId) => {
        if (!activeEntitiesMap.has(entityId)) {
          dotsToRemove.push(entityId);
        }
      });
      dotsToRemove.forEach((entityId) => {
        this.removeDot({ id: entityId });
      });
    }
    update() {
      if (!this.miniMapElement || this.miniMapElement.style.display === "none") {
        return;
      }
      if (!this._dimensionsRead && this.miniMapElement.offsetWidth > 0) {
        this.mapWidth = this.miniMapElement.offsetWidth;
        this.mapHeight = this.miniMapElement.offsetHeight;
        this._dimensionsRead = true;
      }
      if (!this._dimensionsRead || this.mapWidth <= 0) {
        return;
      }
      this.updateDot(this.player, "map-player");
      const activeEnemies = /* @__PURE__ */ new Map();
      const enemies = this.sceneContext.enemies || [];
      enemies.forEach((enemy) => {
        const enemyId = enemy.id || enemy;
        if (enemy.state !== "dead") {
          activeEnemies.set(enemyId, enemy);
          const dotClass = "map-enemy";
          this.updateDot(enemy, dotClass);
        }
      });
      const activePlasma = /* @__PURE__ */ new Map();
      if (this.sceneContext && typeof this.sceneContext.getPlasmas === "function") {
        const plasmas = this.sceneContext.getPlasmas() || [];
        plasmas.forEach((plasma) => {
          const plasmaId = plasma.id || plasma;
          if (plasma.health > 0) {
            activePlasma.set(plasmaId, plasma);
            this.updateDot(plasma, "map-plasma");
          }
        });
      } else {
      }
      const allActiveEntities = new Map([
        [this.player.id || this.player, this.player],
        ...activeEnemies,
        ...activePlasma
      ]);
      this.cleanupDots(allActiveEntities);
    }
    // Example for drawing static regions (if needed)
    // drawRegions() {
    //     const regions = this.worldManager.getRegions(); // Assuming WorldManager provides region data
    //     regions.forEach(region => {
    //         const regionElement = document.createElement('div');
    //         regionElement.classList.add('map-region');
    //         const { x: mapX, y: mapY } = this.getMapCoordinates(region.x, region.y);
    //         const mapWidth = (region.width / /* world scale */) * this.mapWidth;
    //         const mapHeight = (region.height / /* world scale */) * this.mapHeight;
    //         regionElement.style.left = `${mapX}px`;
    //         regionElement.style.top = `${mapY}px`;
    //         regionElement.style.width = `${mapWidth}px`;
    //         regionElement.style.height = `${mapHeight}px`;
    //         regionElement.style.backgroundColor = region.color || 'rgba(100, 100, 100, 0.4)';
    //         this.miniMapContentElement.appendChild(regionElement);
    //     });
    // }
  };

  // src/entities/RailgunProjectile.js
  var RailgunProjectile = class extends Projectile {
    constructor(x, y, direction, speed, damage, ownerId, chargeRatio, options = {}) {
      const railgunOptions = {
        type: "player_railgun_projectile",
        collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 8, height: 8 },
        maxLifetime: options.maxLifetime || 1.5,
        ...options
      };
      super(x, y, direction, speed, damage, ownerId, railgunOptions.type, railgunOptions);
      this.chargeRatio = chargeRatio;
    }
    // Override handleCollision for non-piercing behavior
    handleCollision(otherEntity) {
      if (otherEntity.id === this.ownerId) {
        return;
      }
      if (otherEntity.type.includes("projectile") || otherEntity.type === "plasma" || otherEntity.type === "powerup") {
        return;
      }
      console.log(`[RailgunProjectile ${this.id}] Collision with ID: ${otherEntity.id}, Type: '${otherEntity.type}'`);
      if (otherEntity.type === "enemy" || otherEntity.type === "ranged_enemy" || otherEntity.type === "engineer" || otherEntity.type === "drone_enemy") {
        console.log(`Railgun Projectile ${this.id} hit Enemy ${otherEntity.id}`);
        otherEntity.takeDamage(this.damage);
        this.destroy();
      } else if (otherEntity.id !== this.ownerId) {
        this.destroy();
      }
    }
    // Override destroy if specific cleanup is needed for railgun projectiles
    // destroy() {
    //     super.destroy();
    // }
    // Override onDeath if specific effects are needed on destruction (e.g., fade out)
    // onDeath() {
    //     super.onDeath();
    // }
  };

  // src/entities/Powerup.js
  var Powerup = class {
    /**
     * Creates a new Powerup instance.
     * @param {Phaser.Scene} scene - The scene this power-up belongs to.
     * @param {number} x - The x-coordinate of the power-up.
     * @param {number} y - The y-coordinate of the power-up.
     * @param {string} type - The type of power-up (e.g., 'speed_boost', 'damage_increase').
     * @param {object} [options={}] - Optional configuration for the powerup.
     * @param {number} [options.maxStacks=1] - Maximum number of times this powerup can stack.
     */
    constructor(scene, x, y, type, options = {}) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.type = type;
      this.maxStacks = options.maxStacks || 1;
    }
    /**
     * Activates the power-up effect on the target entity (usually the player).
     * @param {object} target - The entity to apply the power-up effect to.
     */
    activate(target) {
      console.log(`Applying ${this.type} power-up effect`);
      console.warn(`Powerup type "${this.type}" activated, but no specific effect is defined.`);
    }
    // Deactivate method removed as powerups are infinite
    // Optional: Update method if the power-up needs per-frame logic
    // update(time, delta) {
    //     // Update logic
    // }
  };

  // src/entities/WaveManager.js
  var WaveManager = class {
    constructor(scene, enemyManager, options = {}) {
      this.scene = scene;
      this.enemyManager = enemyManager;
      this.endlessMode = options.endlessMode || false;
      this.currentWave = 0;
      this.waveActive = false;
      this.enemiesToSpawn = 0;
      this.enemiesRemainingInWave = 0;
      this.timeBetweenWaves = 5e3;
      this.waveTimer = null;
      this.countdownActive = false;
      this.countdownValue = 0;
      this.availableEnemyTypes = ["Enemy", "RangedEnemy", "Splitter"];
    }
    generateWaveConfig(waveNumber) {
      const baseCount = 5;
      const countIncreasePerWave = 2;
      const countRandomness = 3;
      let count = baseCount + (waveNumber - 1) * countIncreasePerWave;
      count += Phaser.Math.Between(-countRandomness, countRandomness);
      count = Math.max(3, count);
      let possibleTypes = ["Enemy"];
      if (waveNumber >= 3) {
        possibleTypes.push("RangedEnemy");
      }
      if (waveNumber >= 5) {
        possibleTypes.push("Splitter");
      }
      const types = [];
      for (let i = 0; i < count; i++) {
        let selectedType = "Enemy";
        const roll = Math.random();
        const splitterChance = waveNumber >= 5 ? Math.min(0.3, 0.05 + (waveNumber - 5) * 0.02) : 0;
        const rangedChance = waveNumber >= 3 ? Math.min(0.4, 0.1 + (waveNumber - 3) * 0.03) : 0;
        if (possibleTypes.includes("Splitter") && roll < splitterChance) {
          selectedType = "Splitter";
        } else if (possibleTypes.includes("RangedEnemy") && roll < splitterChance + rangedChance) {
          selectedType = "RangedEnemy";
        } else {
          selectedType = "Enemy";
        }
        types.push(selectedType);
      }
      console.log(`Generated Wave ${waveNumber} Config: Count=${count}, PossibleTypes=${possibleTypes.join(",")}`);
      return { count, types };
    }
    startNextWave() {
      this.currentWave++;
      this.waveActive = true;
      this.countdownActive = false;
      this.countdownValue = 0;
      console.log(`Starting Wave ${this.currentWave}`);
      const isBossWave = this.currentWave === 8;
      if (isBossWave) {
        console.log(`Starting Boss Wave ${this.currentWave}: Spawning the Engineer!`);
        this.enemiesToSpawn = 1;
        this.enemiesRemainingInWave = 1;
        this.enemyManager.spawnEnemy("EngineerEnemy");
      } else {
        console.log(`Starting Regular Wave ${this.currentWave}`);
        const config2 = this.generateWaveConfig(this.currentWave);
        this.enemiesToSpawn = config2.count;
        this.enemiesRemainingInWave = config2.count;
        const typesToSpawn = config2.types;
        for (let i = 0; i < this.enemiesToSpawn; i++) {
          const enemyType = typesToSpawn[i];
          this.enemyManager.spawnEnemy(enemyType);
        }
      }
      if (this.scene && typeof this.scene.updateWaveUI === "function") {
        this.scene.updateWaveUI(this.currentWave);
      } else {
        console.warn("WaveManager: Scene or updateWaveUI method not found!");
      }
    }
    update(time, delta) {
      if (this.countdownActive) {
        this.countdownValue -= delta;
        if (this.countdownValue <= 0) {
          this.countdownActive = false;
          this.countdownValue = 0;
          this.startNextWave();
        }
        return;
      }
      if (!this.waveActive) {
        return;
      }
      if (this.enemiesRemainingInWave <= 0) {
        const activeEnemies = this.enemyManager.getActiveEnemyCount ? this.enemyManager.getActiveEnemyCount() : 0;
        if (activeEnemies <= 0) {
          this.endWave();
        }
      }
    }
    enemyDefeated() {
      if (this.waveActive) {
        this.enemiesRemainingInWave--;
        console.log(`Enemy defeated, ${this.enemiesRemainingInWave} remaining in wave ${this.currentWave}`);
      }
    }
    endWave() {
      if (!this.waveActive) return;
      console.log(`Wave ${this.currentWave} Complete!`);
      this.waveActive = false;
      this.enemiesToSpawn = 0;
      if (this.currentWave === 8 && !this.endlessMode) {
        console.log("Reached Wave 8 end (non-endless). Transitioning to Game Over screen.");
        const POINTS_PER_KILL2 = 10;
        const PENALTY_PER_DEATH2 = 50;
        const POINTS_PER_SECOND2 = 1;
        const BOSS_KILL_MULTIPLIER2 = 2.5;
        const baseScore = this.scene.kills * POINTS_PER_KILL2 + Math.floor(this.scene.elapsedTime * POINTS_PER_SECOND2) - this.scene.deaths * PENALTY_PER_DEATH2;
        const finalScore = this.scene.bossKilled ? Math.floor(baseScore * BOSS_KILL_MULTIPLIER2) : baseScore;
        console.log(`Objective Complete. Base Score: ${baseScore}, Boss Killed: ${this.scene.bossKilled}, Final Score: ${finalScore}`);
        this.scene.scene.start("GameOverScene", {
          waveReached: this.currentWave,
          endlessMode: this.endlessMode,
          // Pass endless mode status
          outOfLives: false,
          // Indicate success (objective complete)
          // --- Pass Score Data ---
          finalScore,
          kills: this.scene.kills,
          deaths: this.scene.deaths,
          timeSurvived: Math.floor(this.scene.elapsedTime),
          // Pass time in seconds
          bossKilled: this.scene.bossKilled
          // --- End Pass Score Data ---
        });
      } else {
        if (this.currentWave === 8 && this.endlessMode) {
          console.log("Reached Wave 8 end (endless mode). Starting countdown for next wave.");
        }
        this.countdownActive = true;
        this.countdownValue = this.timeBetweenWaves;
        console.log(`Starting countdown: ${this.timeBetweenWaves / 1e3} seconds.`);
        if (this.scene && typeof this.scene.startInterWaveCountdown === "function") {
          this.scene.startInterWaveCountdown(this.timeBetweenWaves / 1e3);
        }
      }
    }
    // Added semicolon for linter (Line 190)
    // Call this method when an enemy is destroyed
    reportEnemyDestroyed() {
      this.enemyDefeated();
    }
    // Added semicolon for linter (Line 194)
    getCurrentWave() {
      return this.currentWave;
    }
    // Added semicolon for linter (Line 198)
    getCountdownTime() {
      return this.countdownActive ? Math.ceil(this.countdownValue / 1e3) : null;
    }
    // Added semicolon for linter (Line 204)
    // New method to jump to a specific wave
    jumpToWave(waveNumber) {
      console.log(`Attempting to jump to wave ${waveNumber}`);
      this.countdownActive = false;
      this.countdownValue = 0;
      if (this.scene && this.scene.enemies) {
        console.log(`Clearing ${this.scene.enemies.length} existing enemies...`);
        for (let i = this.scene.enemies.length - 1; i >= 0; i--) {
          const enemy = this.scene.enemies[i];
          if (enemy && enemy.state !== "dead") {
            enemy.health = 0;
            enemy.state = "dead";
          }
        }
        console.log("Existing enemies marked for removal.");
      } else {
        console.warn("Could not clear enemies: Scene or enemies array not found.");
      }
      this.currentWave = waveNumber - 1;
      this.waveActive = false;
      this.enemiesRemainingInWave = 0;
      if (this.scene && typeof this.scene.hideCountdownUI === "function") {
        this.scene.hideCountdownUI();
      }
      this.startNextWave();
    }
    // Added semicolon for linter (Line 238)
  };
  var WaveManager_default = WaveManager;

  // src/scenes/GameScreen.js
  var POINTS_PER_KILL = 10;
  var PENALTY_PER_DEATH = 50;
  var POINTS_PER_SECOND = 1;
  var BOSS_KILL_MULTIPLIER = 2.5;
  var GameScreen = class extends Phaser.Scene {
    constructor() {
      super("GameScreen");
      this.worldManager = null;
      this.player = null;
      this.playerVisual = null;
      this.playerShadow = null;
      this.inputHandler = null;
      this.enemies = [];
      this.debugGraphics = null;
      this.enemyManager = null;
      this.enemyVisuals = /* @__PURE__ */ new Map();
      this.enemyShadows = /* @__PURE__ */ new Map();
      this.items = [];
      this.itemVisuals = /* @__PURE__ */ new Map();
      this.itemShadows = /* @__PURE__ */ new Map();
      this.plasmaCounterContainerElement = null;
      this.plasmaCountElement = null;
      this.plasmaIconVisual = null;
      this.healthBarFillElement = null;
      this.healthBarContainerElement = null;
      this.miniMap = null;
      this.tileCoordsElement = null;
      this.projectiles = [];
      this.projectileVisuals = /* @__PURE__ */ new Map();
      this.powerupCountersContainerElement = null;
      this.powerupCounterElements = {};
      this.isShakingContinuously = false;
      this.waveManager = null;
      this.waveCounterElement = null;
      this.clearPlasmaButtonElement = null;
      this.bossHealthBarContainerElement = null;
      this.bossHealthBarFillElement = null;
      this.bossHealthBarMarkerElement = null;
      this.earthquakeZones = [];
      this.gameLivesCounterElement = null;
      this.countdownDisplayElement = null;
      this.deathLivesText = null;
      this.score = 0;
      this.kills = 0;
      this.deaths = 0;
      this.startTime = 0;
      this.elapsedTime = 0;
      this.bossKilled = false;
      this.instructionsContainer = null;
      this.instructionsOverlay = null;
      this.endlessMode = false;
      this.startingWave = 1;
    }
    init(data) {
      this.endlessMode = data.endlessMode || false;
      this.startingWave = data.startingWave || 1;
      console.log(`GameScreen initialized. Endless Mode: ${this.endlessMode}, Starting Wave: ${this.startingWave}`);
    }
    preload() {
      let graphics = this.add.graphics({ x: 0, y: 0 });
      graphics.fillStyle(16777215, 1);
      graphics.fillCircle(8, 8, 8);
      graphics.generateTexture("white_dot", 16, 16);
      graphics.destroy();
      this.load.image("plasma_img", "assets/plasma.png");
      this.load.image("bullet", "assets/bullet.png");
      this.load.image("plasma_bullet", "assets/Plasma_Bullet.png");
      this.load.image("hero_sprite", "assets/hero.png");
      this.load.image("enemy_sprite", "assets/enemy.png");
      this.load.image("engineer_sprite", "assets/engineer.png");
      this.load.image("turret_sprite", "assets/turret.png");
      this.load.image("drone_sprite", "assets/drone.png");
      this.load.image("ranged_sprite", "assets/ranged_enemy.png");
    }
    create() {
      const TILE_SIZE = 50;
      const CHUNK_SIZE = 16;
      const RENDER_DISTANCE = 2;
      this.worldManager = new WorldManager(this, {
        tileSize: TILE_SIZE,
        chunkSize: CHUNK_SIZE,
        renderDistance: RENDER_DISTANCE
        // seed: 12345 // Optional: Set a specific seed for consistent testing
      });
      this.inputHandler = new InputHandler(this);
      const startX = this.cameras.main.width / 2;
      const startY = this.cameras.main.height / 2;
      this.player = new Player(startX, startY, this.inputHandler, this.worldManager, {
        collisionBounds: { x: 0, y: 0, width: TILE_SIZE, height: TILE_SIZE },
        scene: this
        // Pass scene reference during creation
      });
      this.player.scene = this;
      this.playerVisual = this.add.image(this.player.x, this.player.y, "hero_sprite");
      this.playerVisual.setScale(3.75);
      this.playerVisual.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.playerVisual.setDepth(1);
      this.playerShadow = this.add.graphics();
      this.playerShadow.setDepth(0.9);
      this.cameras.main.startFollow(this.playerVisual);
      this.cameras.main.setZoom(1);
      this.cameras.main.setBackgroundColor("#2d2d2d");
      this.debugGraphics = this.add.graphics();
      this.debugGraphics.setDepth(5);
      this.enemyManager = new EnemyManager(this);
      this.worldManager.player = this.player;
      this.worldManager.update(this.player.x, this.player.y);
      this.plasmaCounterContainerElement = document.getElementById("plasma-counter");
      this.plasmaCountElement = document.getElementById("plasma-count");
      if (this.plasmaCounterContainerElement && this.plasmaCountElement) {
        this.plasmaCounterContainerElement.style.display = "flex";
        this.plasmaCountElement.innerText = this.player.plasmaCount;
        const iconX = 22;
        const iconY = 52;
        this.plasmaIconVisual = this.add.image(iconX, iconY, "plasma_img");
        this.plasmaIconVisual.setScale(1.5);
        this.plasmaIconVisual.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.plasmaIconVisual.setDepth(11);
        this.plasmaIconVisual.setScrollFactor(0);
        this.plasmaIconVisual.postFX.addGlow(65535, 1, 0, false, 0.1, 10);
      }
      this.healthBarContainerElement = document.getElementById("health-bar-container");
      this.healthBarFillElement = document.getElementById("health-bar-fill");
      if (this.healthBarContainerElement) {
        this.healthBarContainerElement.style.display = "block";
      } else {
        console.error("Health bar container element not found in HTML!");
      }
      if (!this.healthBarFillElement) {
        console.error("Health bar fill element not found in HTML!");
      }
      this.tileCoordsElement = document.getElementById("tile-coords-display");
      if (this.tileCoordsElement) {
        this.tileCoordsElement.style.display = "block";
      } else {
        console.error("Tile coordinates display element not found in HTML!");
      }
      if (this.worldManager && this.player && this.enemyManager) {
        this.miniMap = new MiniMap(this.worldManager, this.player, this);
        this.miniMap.show();
      } else {
        console.error("Failed to initialize MiniMap: Required components missing.");
      }
      this.powerupCountersContainerElement = document.getElementById("powerup-counters");
      if (this.powerupCountersContainerElement) {
        this.powerupCountersContainerElement.style.display = "flex";
        const speedBoostContainer = document.getElementById("powerup-counter-speed_boost");
        const speedBoostText = document.getElementById("powerup-count-speed_boost");
        if (speedBoostContainer && speedBoostText) {
          this.powerupCounterElements["speed_boost"] = {
            container: speedBoostContainer,
            text: speedBoostText
          };
        } else {
          console.warn("Speed Boost counter elements not found in HTML.");
        }
        const fireRateBoostContainer = document.getElementById("powerup-counter-fire_rate_boost");
        const fireRateBoostText = document.getElementById("powerup-count-fire_rate_boost");
        if (fireRateBoostContainer && fireRateBoostText) {
          this.powerupCounterElements["fire_rate_boost"] = { container: fireRateBoostContainer, text: fireRateBoostText };
        } else {
          console.warn("Fire Rate Boost counter elements not found in HTML.");
        }
        const healthIncreaseContainer = document.getElementById("powerup-counter-health_increase");
        const healthIncreaseText = document.getElementById("powerup-count-health_increase");
        if (healthIncreaseContainer && healthIncreaseText) {
          this.powerupCounterElements["health_increase"] = { container: healthIncreaseContainer, text: healthIncreaseText };
        } else {
          console.warn("Health Increase counter elements not found in HTML.");
        }
      } else {
        console.error("Powerup counters container element not found in HTML!");
      }
      this.waveCounterElement = document.getElementById("wave-counter-display");
      if (this.waveCounterElement) {
        this.waveCounterElement.style.display = "block";
      } else {
        console.error("Wave counter display element not found in HTML!");
      }
      this.scale.on("resize", this.handleResize, this);
      this.scale.refresh();
      this.waveManager = new WaveManager_default(this, this.enemyManager, { endlessMode: this.endlessMode });
      if (this.startingWave > 1) {
        console.log(`Jumping to starting wave: ${this.startingWave}`);
        this.waveManager.jumpToWave(this.startingWave);
      } else {
        console.log("Starting first wave normally.");
        this.waveManager.startNextWave();
      }
      this.clearPlasmaButtonElement = document.getElementById("clear-plasma-button");
      if (this.clearPlasmaButtonElement) {
        this.clearPlasmaButtonElement.style.display = "block";
        this.clearPlasmaButtonElement.addEventListener("click", () => {
          this.clearAllPlasma();
        });
      } else {
        console.error("Clear Plasma button element not found in HTML!");
      }
      this.bossHealthBarContainerElement = document.getElementById("boss-health-bar-container");
      this.bossHealthBarFillElement = document.getElementById("boss-health-bar-fill");
      this.bossHealthBarMarkerElement = document.getElementById("boss-health-bar-marker");
      if (!this.bossHealthBarContainerElement || !this.bossHealthBarFillElement || !this.bossHealthBarMarkerElement) {
        console.error("Boss health bar elements not found in HTML!");
      }
      this.gameLivesCounterElement = document.getElementById("game-lives-counter");
      if (this.gameLivesCounterElement) {
        this.gameLivesCounterElement.style.display = "block";
        this.gameLivesCounterElement.innerText = `Lives: ${this.player.lives}`;
      } else {
        console.error("In-Game Lives counter element ('game-lives-counter') not found in HTML!");
      }
      this.countdownDisplayElement = document.getElementById("countdown-display");
      if (!this.countdownDisplayElement) {
        console.error("Countdown display element not found in HTML!");
      }
      this.createInstructionsUI();
      this.startTime = this.time.now;
      this.score = 0;
      this.kills = 0;
      this.deaths = 0;
      this.bossKilled = false;
      this.input.keyboard.on("keydown-H", () => {
        this.createInstructionsUI();
      });
    }
    update(time, delta) {
      if (!this.player || !this.worldManager || !this.inputHandler || !this.playerVisual) return;
      this.elapsedTime = (this.time.now - this.startTime) / 1e3;
      const dtSeconds = delta / 1e3;
      this.inputHandler.update();
      this.player.update(dtSeconds, this);
      this.playerVisual.x = this.player.x;
      this.playerVisual.y = this.player.y;
      this.playerShadow.clear();
      if (this.player.state !== "dead" && this.playerVisual) {
        const visualWidth = this.playerVisual.displayWidth;
        const visualHeight = this.playerVisual.displayHeight;
        const shadowOffsetY = 8;
        const shadowScaleX = 0.8;
        const shadowScaleY = 0.4;
        const shadowAlpha = 0.3;
        const shadowX = this.player.x;
        const shadowY = this.player.y + visualHeight * 0.4 + shadowOffsetY;
        const shadowRadiusX = visualWidth / 2 * shadowScaleX;
        const shadowRadiusY = visualHeight / 4 * shadowScaleY;
        if (shadowRadiusX > 0 && shadowRadiusY > 0) {
          this.playerShadow.fillStyle(0, shadowAlpha);
          this.playerShadow.fillEllipse(shadowX, shadowY, shadowRadiusX * 2, shadowRadiusY * 2);
        }
      }
      if (this.enemyManager && this.worldManager) {
        const currentBounds = this.worldManager.getLoadedBounds();
        if (currentBounds) {
          this.enemyManager.setWorldBounds(currentBounds);
        }
        this.enemyManager.update(dtSeconds);
      }
      const worldContext = {
        player: this.player,
        enemies: this.enemies,
        projectiles: this.projectiles
        // Pass the projectiles list
      };
      this.enemies.forEach((enemy) => {
        if (enemy.state !== "dead") {
          enemy.update(dtSeconds, worldContext);
          if (!this.enemyVisuals.has(enemy.id)) {
            console.log(`[GameScreen] Creating sprite visual for new enemy ID: ${enemy.id}, Type: ${enemy.constructor.name}`);
            let textureKey = "enemy_sprite";
            switch (enemy.constructor.name) {
              case "Player":
                textureKey = "hero_sprite";
                break;
              // Should not happen here, but safety
              case "Enemy":
                textureKey = "enemy_sprite";
                break;
              case "EngineerEnemy":
                textureKey = "engineer_sprite";
                break;
              case "TurretEnemy":
                textureKey = "turret_sprite";
                break;
              case "DroneEnemy":
                textureKey = "drone_sprite";
                break;
              case "RangedEnemy":
                textureKey = "ranged_sprite";
                break;
              // Add cases for other enemy types like Splitter if they have sprites
              // case 'SplitterEnemy': textureKey = 'splitter_sprite'; break;
              default:
                console.warn(`No specific sprite key found for enemy type: ${enemy.constructor.name}. Using default.`);
            }
            const enemyVisual = this.add.image(enemy.x, enemy.y, textureKey);
            enemyVisual.setScale(3.75);
            enemyVisual.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            enemyVisual.setDepth(0.95);
            this.enemyVisuals.set(enemy.id, enemyVisual);
            console.log(`[GameScreen] Sprite visual created and added for enemy ID: ${enemy.id} using key ${textureKey}`);
          }
          const visual = this.enemyVisuals.get(enemy.id);
          if (visual) {
            visual.setPosition(enemy.x, enemy.y);
            let shadow = this.enemyShadows.get(enemy.id);
            if (!shadow) {
              shadow = this.add.graphics();
              shadow.setDepth(visual.depth - 0.01);
              this.enemyShadows.set(enemy.id, shadow);
            }
            shadow.clear();
            if (enemy.state !== "dead" && visual) {
              const visualWidth = visual.displayWidth;
              const visualHeight = visual.displayHeight;
              const shadowOffsetY = 8;
              const shadowScaleX = 0.8;
              const shadowScaleY = 0.4;
              const shadowAlpha = 0.3;
              const shadowX = enemy.x;
              const shadowY = enemy.y + visualHeight * 0.4 + shadowOffsetY;
              const shadowRadiusX = visualWidth / 2 * shadowScaleX;
              const shadowRadiusY = visualHeight / 4 * shadowScaleY;
              if (shadowRadiusX > 0 && shadowRadiusY > 0) {
                shadow.fillStyle(0, shadowAlpha);
                shadow.fillEllipse(shadowX, shadowY, shadowRadiusX * 2, shadowRadiusY * 2);
              }
            }
          }
        }
      });
      this.updateEnemyVisuals();
      this.projectiles.forEach((projectile) => {
        projectile.update(dtSeconds);
        const visual = this.projectileVisuals.get(projectile.id);
        if (visual) {
          visual.setPosition(projectile.x, projectile.y);
        }
      });
      if (this.player.state !== "dead") {
        this.enemies.forEach((enemy) => {
          if (enemy.state !== "dead") {
            if (this.player.checkCollision(enemy, dtSeconds)) {
              if (this.player.isAttacking && !this.player.enemiesHitThisAttack.has(enemy.id)) {
                this.player.handleCollision(enemy);
                enemy.handleCollision(this.player);
              } else if (!this.player.isAttacking) {
                this.player.handleCollision(enemy);
                enemy.handleCollision(this.player);
              }
            }
          }
        });
        this.items.forEach((item) => {
          if (this.player.checkCollision(item, dtSeconds)) {
            this.player.handleCollision(item);
          }
        });
      }
      this.projectiles.forEach((projectile) => {
        if (projectile.state === "dead") return;
        if (projectile.ownerId !== this.player.id && this.player.state !== "dead") {
          if (projectile.checkCollision(this.player, dtSeconds)) {
            this.createImpactEffect(this.player.x, this.player.y);
            this.cameras.main.shake(100, 0.01);
            projectile.handleCollision(this.player);
          }
        }
        this.enemies.forEach((enemy) => {
          if (projectile.state === "dead" || enemy.state === "dead" || projectile.ownerId === enemy.id) {
            return;
          }
          if (projectile.checkCollision(enemy, dtSeconds)) {
            projectile.handleCollision(enemy);
          }
        });
      });
      const allEntities = [this.player, ...this.enemies].filter((e) => e && e.state !== "dead");
      const resolutionIterations = 3;
      for (let iter = 0; iter < resolutionIterations; iter++) {
        for (let i = 0; i < allEntities.length; i++) {
          for (let j = i + 1; j < allEntities.length; j++) {
            const entityA = allEntities[i];
            const entityB = allEntities[j];
            if (entityA.checkCollision(entityB, 0)) {
              this.resolveCollision(entityA, entityB);
            }
          }
        }
      }
      this.items.forEach((item) => {
        item.update(dtSeconds);
        if (!this.itemVisuals.has(item.id)) {
          let itemVisual;
          if (item.type === "plasma") {
            itemVisual = this.add.image(item.x, item.y, "plasma_img");
            itemVisual.setScale(1.5);
            itemVisual.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            itemVisual.postFX.addGlow(65535, 1, 0, false, 0.1, 10);
          } else {
            itemVisual = this.add.circle(
              item.x,
              item.y,
              item.collisionBounds.width / 2,
              13421772,
              // Default grey color
              1
            );
          }
          itemVisual.setDepth(0.8);
          this.itemVisuals.set(item.id, itemVisual);
        }
        const visual = this.itemVisuals.get(item.id);
        if (visual) {
          visual.setPosition(item.x, item.y);
          let shadow = this.itemShadows.get(item.id);
          if (!shadow) {
            shadow = this.add.graphics();
            shadow.setDepth(0.75);
            this.itemShadows.set(item.id, shadow);
          }
          shadow.clear();
          const bounds2 = item.getAbsoluteBounds();
          const shadowOffsetY = 3;
          const shadowScaleX = 0.6;
          const shadowScaleY = 0.3;
          const shadowAlpha = 0.3;
          const shadowX = item.x;
          const shadowY = item.y + bounds2.height / 2 + shadowOffsetY;
          const shadowRadiusX = bounds2.width / 2 * shadowScaleX;
          const shadowRadiusY = shadowRadiusX * shadowScaleY;
          if (shadowRadiusX > 0 && shadowRadiusY > 0) {
            shadow.fillStyle(0, shadowAlpha);
            shadow.fillEllipse(shadowX, shadowY, shadowRadiusX * 2, shadowRadiusY * 2);
          }
        }
      });
      this.debugGraphics.clear();
      this.enemies = this.enemies.filter((enemy) => {
        if (enemy.state === "dead") {
          console.log(`Enemy ${enemy.id} died, spawning plasma.`);
          const plasmaDrop = new Plasma(enemy.x, enemy.y);
          this.items.push(plasmaDrop);
          if (this.waveManager) {
            this.waveManager.reportEnemyDestroyed();
          }
          this.kills++;
          console.log(`Kill registered. Total kills: ${this.kills}`);
          if (enemy instanceof EngineerEnemy) {
            this.bossKilled = true;
            console.log("Boss killed! Score multiplier will be applied.");
          }
          const visual = this.enemyVisuals.get(enemy.id);
          if (visual) {
            visual.destroy();
            this.enemyVisuals.delete(enemy.id);
          }
          if (enemy.stunEffect) {
            enemy.stunEffect.destroy();
            enemy.stunEffect = null;
          }
          const shadow = this.enemyShadows.get(enemy.id);
          if (shadow) {
            shadow.destroy();
            this.enemyShadows.delete(enemy.id);
          }
          return false;
        }
        return true;
      });
      this.items = this.items.filter((item) => {
        if (item.health <= 0) {
          const visual = this.itemVisuals.get(item.id);
          if (visual) {
            visual.destroy();
            this.itemVisuals.delete(item.id);
          }
          const shadow = this.itemShadows.get(item.id);
          if (shadow) {
            shadow.destroy();
            this.itemShadows.delete(item.id);
          }
          return false;
        }
        return true;
      });
      this.projectiles = this.projectiles.filter((projectile) => {
        if (projectile.state === "dead") {
          const visual = this.projectileVisuals.get(projectile.id);
          if (visual) {
            visual.destroy();
            this.projectileVisuals.delete(projectile.id);
          }
          return false;
        }
        return true;
      });
      this.worldManager.update(this.player.x, this.player.y);
      if (this.plasmaCountElement && this.player) {
        this.plasmaCountElement.innerText = this.player.plasmaCount;
      }
      if (this.healthBarFillElement && this.player) {
        const hpPercent = Math.max(0, this.player.health / this.player.maxHealth);
        const widthPercentage = hpPercent * 100;
        this.healthBarFillElement.style.width = `${widthPercentage}%`;
      }
      if (this.tileCoordsElement && this.player) {
        this.tileCoordsElement.innerText = `Tile: ${this.player.currentTileX}, ${this.player.currentTileY}`;
      }
      if (this.miniMap) {
        this.miniMap.update();
      }
      this.updatePowerupCountersUI();
      if (this.waveManager) {
        this.waveManager.update(time, delta);
      }
      this.updateBossHealthBarUI();
      this.updateEarthquakeZones(dtSeconds);
      if (this.gameLivesCounterElement && this.player) {
        this.gameLivesCounterElement.innerText = `Lives: ${this.player.lives}`;
      }
      if (this.waveManager && this.countdownDisplayElement) {
        const countdownTime = this.waveManager.getCountdownTime();
        if (countdownTime !== null) {
          this.countdownDisplayElement.innerText = `Next Wave: ${countdownTime}`;
          this.countdownDisplayElement.style.display = "block";
        } else {
          this.countdownDisplayElement.style.display = "none";
        }
      }
      const baseScore = this.kills * POINTS_PER_KILL + Math.floor(this.elapsedTime * POINTS_PER_SECOND) - this.deaths * PENALTY_PER_DEATH;
      this.score = baseScore;
    }
    // End of update method
    // --- Collision Resolution Method ---
    resolveCollision(entityA, entityB) {
      if (!entityA || !entityB || entityA.state === "dead" || entityB.state === "dead") {
        return;
      }
      const boundsA = entityA.getAbsoluteBounds();
      const boundsB = entityB.getAbsoluteBounds();
      const overlapX = Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width) - Math.max(boundsA.x, boundsB.x);
      const overlapY = Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height) - Math.max(boundsA.y, boundsB.y);
      if (overlapX <= 0 || overlapY <= 0) {
        return;
      }
      let pushX = 0;
      let pushY = 0;
      const tolerance = 0.1;
      if (overlapX < overlapY) {
        const pushAmount = overlapX + tolerance;
        if (boundsA.x + boundsA.width / 2 < boundsB.x + boundsB.width / 2) {
          pushX = -pushAmount / 2;
        } else {
          pushX = pushAmount / 2;
        }
      } else {
        const pushAmount = overlapY + tolerance;
        if (boundsA.y + boundsA.height / 2 < boundsB.y + boundsB.height / 2) {
          pushY = -pushAmount / 2;
        } else {
          pushY = pushAmount / 2;
        }
      }
      if (!entityA.isStunned) {
        entityA.x += pushX;
        entityA.y += pushY;
      }
      if (!entityB.isStunned) {
        entityB.x -= pushX;
        entityB.y -= pushY;
      }
    }
    // --- End Collision Resolution Method ---
    // End of update method (Class continues below)
    // --- Player Death and Respawn Logic ---
    handlePlayerDeath() {
      if (this.respawnOverlay) {
        this.respawnOverlay.destroy();
        this.respawnOverlay = null;
      }
      if (this.deathText) {
        this.deathText.destroy();
        this.deathText = null;
      }
      if (this.deathLivesText) {
        this.deathLivesText.destroy();
        this.deathLivesText = null;
      }
      if (this.respawnButton) {
        this.respawnButton.destroy();
        this.respawnButton = null;
      }
      if (this.respawnButtonBrackets) {
        this.respawnButtonBrackets.destroy();
        this.respawnButtonBrackets = null;
      }
      const deathX = this.player.x;
      const deathY = this.player.y;
      this.deaths++;
      console.log(`Death registered. Total deaths: ${this.deaths}`);
      this.player.lives--;
      console.log(`Player lives remaining: ${this.player.lives}`);
      if (this.playerVisual) {
        this.playerVisual.setVisible(false);
      }
      if (this.playerShadow) {
        this.playerShadow.setVisible(false);
      }
      if (this.healthBarContainerElement) this.healthBarContainerElement.style.display = "none";
      if (this.plasmaCounterContainerElement) this.plasmaCounterContainerElement.style.display = "none";
      if (this.plasmaIconVisual) this.plasmaIconVisual.setVisible(false);
      if (this.miniMap) this.miniMap.hide();
      if (this.tileCoordsElement) this.tileCoordsElement.style.display = "none";
      if (this.powerupCountersContainerElement) this.powerupCountersContainerElement.style.display = "none";
      if (this.waveCounterElement) this.waveCounterElement.style.display = "none";
      if (this.clearPlasmaButtonElement) this.clearPlasmaButtonElement.style.display = "none";
      if (this.bossHealthBarContainerElement) this.bossHealthBarContainerElement.style.display = "none";
      if (this.gameLivesCounterElement) this.gameLivesCounterElement.style.display = "none";
      if (this.countdownDisplayElement) this.countdownDisplayElement.style.display = "none";
      if (this.player.lives > 0) {
        console.log("Player has lives remaining, showing respawn option.");
        const { width, height } = this.cameras.main;
        const centerX = width / 2;
        const centerY = height / 2;
        const theme = {
          primaryColor: "#FF6B00",
          // Martian Orange
          secondaryColor: "#00E0FF",
          // Tech Cyan
          textColor: "#E0E0E0",
          // Light Grey/White
          backgroundColor: "#201510",
          // Dark Reddish Brown
          overlayAlpha: 0.85,
          fontFamily: 'Consolas, "Courier New", monospace',
          // Tech font
          titleFontSize: "80px",
          // Slightly larger for impact
          buttonFontSize: "42px",
          strokeColor: "#111111",
          buttonBgColor: "#443020",
          // Darker Brown/Orange
          buttonHoverBgColor: "#664530",
          buttonTextColor: "#00E0FF",
          // Cyan text on buttons
          buttonHoverTextColor: "#FFFFFF",
          gameOverColor: "#FF4444"
          // Distinct red for failure
        };
        this.respawnOverlay = this.add.graphics({ fillStyle: { color: Phaser.Display.Color.HexStringToColor(theme.backgroundColor).color, alpha: theme.overlayAlpha } });
        this.respawnOverlay.fillRect(0, 0, width, height);
        this.respawnOverlay.setScrollFactor(0);
        this.respawnOverlay.setDepth(10);
        this.deathText = this.add.text(centerX, centerY - 100, `// UNIT OFFLINE //`, {
          // Adjusted Y position slightly up
          fontSize: theme.titleFontSize,
          fill: theme.gameOverColor,
          fontFamily: theme.fontFamily,
          fontStyle: "bold",
          stroke: theme.strokeColor,
          strokeThickness: 6,
          align: "center",
          shadow: { offsetX: 2, offsetY: 2, color: "#111", blur: 4, fill: true }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
        this.deathLivesText = this.add.text(centerX, centerY - 30, `LIVES REMAINING: ${this.player.lives}`, {
          // Positioned below death text
          fontSize: "32px",
          // Slightly smaller than button/title
          fill: theme.textColor,
          // Use standard text color
          fontFamily: theme.fontFamily,
          stroke: theme.strokeColor,
          strokeThickness: 3,
          align: "center"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);
        const buttonBaseStyle = {
          fontSize: theme.buttonFontSize,
          fontFamily: theme.fontFamily,
          fill: theme.buttonTextColor,
          backgroundColor: theme.buttonBgColor,
          padding: { x: 30, y: 18 },
          align: "center"
        };
        const buttonHoverStyle = {
          fill: theme.buttonHoverTextColor,
          backgroundColor: theme.buttonHoverBgColor
        };
        this.respawnButton = this.add.text(centerX, centerY + 50, "REACTIVATE", buttonBaseStyle).setOrigin(0.5).setScrollFactor(0).setDepth(11).setInteractive({ useHandCursor: true });
        const addBrackets = (button) => {
          const bracketColor = Phaser.Display.Color.HexStringToColor(theme.secondaryColor).color;
          const bracketThickness = 2;
          const bracketLength = 20;
          const bracketOffset = 10;
          const bounds2 = button.getBounds();
          const graphics = this.add.graphics({ x: button.x, y: button.y }).setScrollFactor(0).setDepth(button.depth);
          const relLeft = -bounds2.width / 2;
          const relTop = -bounds2.height / 2;
          const relRight = bounds2.width / 2;
          const relBottom = bounds2.height / 2;
          graphics.lineStyle(bracketThickness, bracketColor, 0.8);
          graphics.beginPath();
          graphics.moveTo(relLeft - bracketOffset, relTop - bracketOffset + bracketLength);
          graphics.lineTo(relLeft - bracketOffset, relTop - bracketOffset);
          graphics.lineTo(relLeft - bracketOffset + bracketLength, relTop - bracketOffset);
          graphics.strokePath();
          graphics.beginPath();
          graphics.moveTo(relRight + bracketOffset - bracketLength, relTop - bracketOffset);
          graphics.lineTo(relRight + bracketOffset, relTop - bracketOffset);
          graphics.lineTo(relRight + bracketOffset, relTop - bracketOffset + bracketLength);
          graphics.strokePath();
          graphics.beginPath();
          graphics.moveTo(relLeft - bracketOffset, relBottom + bracketOffset - bracketLength);
          graphics.lineTo(relLeft - bracketOffset, relBottom + bracketOffset);
          graphics.lineTo(relLeft - bracketOffset + bracketLength, relBottom + bracketOffset);
          graphics.strokePath();
          graphics.beginPath();
          graphics.moveTo(relRight + bracketOffset - bracketLength, relBottom + bracketOffset);
          graphics.lineTo(relRight + bracketOffset, relBottom + bracketOffset);
          graphics.lineTo(relRight + bracketOffset, relBottom + bracketOffset - bracketLength);
          graphics.strokePath();
          return graphics;
        };
        this.respawnButtonBrackets = addBrackets(this.respawnButton);
        this.respawnButton.on("pointerover", () => {
          this.respawnButton.setStyle({ ...buttonBaseStyle, ...buttonHoverStyle });
          if (this.respawnButtonBrackets) this.respawnButtonBrackets.setAlpha(1);
        });
        this.respawnButton.on("pointerout", () => {
          this.respawnButton.setStyle(buttonBaseStyle);
          if (this.respawnButtonBrackets) this.respawnButtonBrackets.setAlpha(0.8);
        });
        this.respawnButton.on("pointerdown", () => {
          console.log("Reactivate button clicked.");
          this.respawnPlayer();
        });
      } else {
        if (this.respawnOverlay) {
          this.respawnOverlay.destroy();
          this.respawnOverlay = null;
        }
        console.log("Player out of lives. Game Over.");
        const finalWave = this.waveManager ? this.waveManager.getCurrentWave() : 1;
        const baseScore = this.kills * POINTS_PER_KILL + Math.floor(this.elapsedTime * POINTS_PER_SECOND) - this.deaths * PENALTY_PER_DEATH;
        const finalScore = this.bossKilled ? Math.floor(baseScore * BOSS_KILL_MULTIPLIER) : baseScore;
        console.log(`Game Over. Base Score: ${baseScore}, Boss Killed: ${this.bossKilled}, Final Score: ${finalScore}`);
        this.scene.start("GameOverScene", {
          waveReached: finalWave,
          endlessMode: this.endlessMode,
          // Pass endless mode status
          outOfLives: true,
          // Indicate game over was due to running out of lives
          // --- Pass Score Data ---
          finalScore,
          kills: this.kills,
          deaths: this.deaths,
          timeSurvived: Math.floor(this.elapsedTime),
          // Pass time in seconds
          bossKilled: this.bossKilled
          // --- End Pass Score Data ---
        });
      }
    }
    respawnPlayer() {
      console.log(`GameScreen: Reactivating unit near (0, 0).`);
      if (this.respawnOverlay) {
        this.respawnOverlay.destroy();
        this.respawnOverlay = null;
      }
      if (this.deathText) {
        this.deathText.destroy();
        this.deathText = null;
      }
      if (this.deathLivesText) {
        this.deathLivesText.destroy();
        this.deathLivesText = null;
      }
      if (this.respawnButton) {
        this.respawnButton.destroy();
        this.respawnButton = null;
      }
      if (this.respawnButtonBrackets) {
        this.respawnButtonBrackets.destroy();
        this.respawnButtonBrackets = null;
      }
      this.player.health = this.player.maxHealth;
      this.player.state = "idle";
      this.player.plasmaCount = 0;
      const TILE_SIZE = this.worldManager.tileSize;
      const SAFETY_RADIUS_TILES = 5;
      const SAFETY_RADIUS_PIXELS = SAFETY_RADIUS_TILES * TILE_SIZE;
      const MAX_SEARCH_RADIUS_TILES = 20;
      let respawnX = 0;
      let respawnY = 0;
      let foundSafeSpot = false;
      searchLoop:
        for (let radius = 0; radius <= MAX_SEARCH_RADIUS_TILES; radius++) {
          const step = TILE_SIZE;
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              if (radius > 0 && Math.abs(dx) < radius && Math.abs(dy) < radius) {
                continue;
              }
              const potentialX = dx * step;
              const potentialY = dy * step;
              let isSafe = true;
              for (const enemy of this.enemies) {
                if (enemy.state === "dead") continue;
                const distanceSq = (enemy.x - potentialX) ** 2 + (enemy.y - potentialY) ** 2;
                if (distanceSq < SAFETY_RADIUS_PIXELS ** 2) {
                  isSafe = false;
                  break;
                }
              }
              if (isSafe) {
                respawnX = potentialX;
                respawnY = potentialY;
                foundSafeSpot = true;
                console.log(`GameScreen: Found safe respawn spot at (${respawnX.toFixed(0)}, ${respawnY.toFixed(0)}) after checking radius ${radius}.`);
                break searchLoop;
              }
            }
          }
        }
      if (!foundSafeSpot) {
        console.warn(`GameScreen: Could not find a safe respawn spot within ${MAX_SEARCH_RADIUS_TILES} tiles of (0,0). Respawning at (0,0) anyway.`);
        respawnX = 0;
        respawnY = 0;
      }
      console.log(`GameScreen: Setting respawn position: (${respawnX.toFixed(0)}, ${respawnY.toFixed(0)})`);
      this.player.x = respawnX;
      this.player.y = respawnY;
      this.player.velocityX = 0;
      this.player.velocityY = 0;
      if (this.playerVisual) {
        this.playerVisual.setPosition(respawnX, respawnY);
        this.playerVisual.setVisible(true);
      }
      if (this.playerShadow) {
        this.playerShadow.setVisible(true);
      }
      if (this.healthBarContainerElement) this.healthBarContainerElement.style.display = "block";
      if (this.plasmaCounterContainerElement) this.plasmaCounterContainerElement.style.display = "flex";
      if (this.plasmaIconVisual) this.plasmaIconVisual.setVisible(true);
      if (this.miniMap) this.miniMap.show();
      if (this.tileCoordsElement) this.tileCoordsElement.style.display = "block";
      if (this.powerupCountersContainerElement) this.powerupCountersContainerElement.style.display = "flex";
      if (this.waveCounterElement) {
        this.waveCounterElement.style.display = "block";
        if (this.waveManager) {
          this.updateWaveUI(this.waveManager.getCurrentWave());
        }
      }
      if (this.clearPlasmaButtonElement) this.clearPlasmaButtonElement.style.display = "block";
      if (this.gameLivesCounterElement) this.gameLivesCounterElement.style.display = "block";
      if (this.plasmaCountElement) {
        this.plasmaCountElement.innerText = this.player.plasmaCount;
      }
      if (this.playerHpText) {
        this.playerHpText.setText(`HP: ${this.player.health}/${this.player.maxHealth}`);
        this.playerHpText.setFill("#00FF00");
      }
      if (this.gameLivesCounterElement && this.player) {
        this.gameLivesCounterElement.innerText = `Lives: ${this.player.lives}`;
      }
      if (this.playerVisual) {
        this.playerVisual.setAlpha(0.5);
        this.tweens.add({
          targets: this.playerVisual,
          alpha: 1,
          duration: 150,
          // Flash duration
          ease: "Linear",
          yoyo: true,
          repeat: 5,
          // Number of flashes (total duration = duration * (repeat + 1))
          onComplete: () => {
            if (this.playerVisual) {
              this.playerVisual.setAlpha(1);
            }
          }
        });
      }
      console.log("GameScreen: Player respawned.");
    }
    // Method for MiniMap to get plasma items
    getPlasmas() {
      return this.items.filter((item) => item instanceof Plasma);
    }
    // Update enemy visuals including stun effects and flashing (Adapted for Sprites)
    updateEnemyVisuals() {
      this.enemies.forEach((enemy) => {
        if (enemy.state === "dead") return;
        const visual = this.enemyVisuals.get(enemy.id);
        if (!visual || !(visual instanceof Phaser.GameObjects.Image)) return;
        if (enemy.isFlashing) {
          visual.setTint(16777215);
          visual.setAlpha(0.7 + 0.3 * Math.sin(this.time.now / 50));
          visual.setScale(3.75);
          if (enemy.stunEffect) {
            if (enemy.stunEffect.active) enemy.stunEffect.destroy();
            enemy.stunEffect = null;
          }
        } else {
          visual.clearTint();
          visual.setAlpha(1);
          visual.setScale(3.75);
          if (enemy.isStunned) {
            if (!enemy.stunEffect || !enemy.stunEffect.active) {
              this.createOrUpdateStunEffect(enemy);
            } else {
              enemy.stunEffect.setPosition(enemy.x, enemy.y - visual.displayHeight / 2 - 10);
            }
          } else {
            if (enemy.stunEffect && enemy.stunEffect.active) {
              enemy.stunEffect.destroy();
              enemy.stunEffect = null;
            }
          }
        }
      });
    }
    // Simplified createOrUpdateStunEffect method
    createOrUpdateStunEffect(enemy) {
      if (!enemy || enemy.state === "dead") return;
      if (enemy.stunEffect && enemy.stunEffect.active) {
        enemy.stunEffect.destroy();
        enemy.stunEffect = null;
      }
      if (!enemy.isStunned) return;
      const visual = this.enemyVisuals.get(enemy.id);
      const stunX = enemy.x;
      const stunY = enemy.y - (visual ? visual.displayHeight / 2 : 30) - 10;
      enemy.stunEffect = this.add.container(stunX, stunY);
      enemy.stunEffect.setDepth(2);
      const ring = this.add.circle(0, 0, 15, 15790320, 0);
      ring.setStrokeStyle(3, 15790320, 0.8);
      enemy.stunEffect.add(ring);
      const starCount = 3;
      const stars = [];
      for (let i = 0; i < starCount; i++) {
        const star = this.add.text(0, 0, "\u2736", {
          fontSize: "14px",
          color: "#FFFF00",
          stroke: "#000000",
          strokeThickness: 2
        });
        star.setOrigin(0.5);
        const angle = i * Math.PI * 2 / starCount;
        star.x = Math.cos(angle) * 10;
        star.y = Math.sin(angle) * 10;
        enemy.stunEffect.add(star);
        stars.push(star);
      }
      const ringTween = this.tweens.add({
        targets: ring,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.5,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      const starTweens = stars.map((star, index) => {
        return this.tweens.add({
          targets: star,
          angle: 360,
          // Use Phaser's angle property for rotation
          duration: 1500,
          repeat: -1,
          ease: "Linear",
          onUpdate: (tween) => {
            const currentAngleRad = index * Math.PI * 2 / starCount + Phaser.Math.DegToRad(star.angle);
            star.x = Math.cos(currentAngleRad) * 10;
            star.y = Math.sin(currentAngleRad) * 10;
          }
        });
      });
      enemy.stunEffect.setData("tweens", [ringTween, ...starTweens]);
      enemy.stunEffect.destroy = function(fromScene) {
        const tweens = this.getData("tweens");
        if (tweens) {
          tweens.forEach((tween) => tween.stop());
        }
        Phaser.GameObjects.Container.prototype.destroy.call(this, fromScene);
      };
    }
    // Create impact effect at hit location, potentially scaled by number of hits
    createImpactEffect(x, y, hits = 1) {
      const isDoubleHit = hits > 1;
      const baseColor = isDoubleHit ? 16776960 : 16777215;
      const baseAlpha = isDoubleHit ? 0.9 : 0.8;
      const baseScaleMultiplier = isDoubleHit ? 1.3 : 1;
      const baseDurationMultiplier = isDoubleHit ? 1.2 : 1;
      const impactCircle = this.add.circle(x, y, 20 * baseScaleMultiplier, baseColor, baseAlpha);
      impactCircle.setDepth(2);
      const ring = this.add.circle(x, y, 10 * baseScaleMultiplier, baseColor, 0);
      ring.setStrokeStyle(3 * baseScaleMultiplier, baseColor, baseAlpha);
      ring.setDepth(2);
      this.tweens.add({
        targets: impactCircle,
        alpha: 0,
        scale: 1.5 * baseScaleMultiplier * (1 + (hits - 1) * 0.2),
        // Combine base scale and multi-hit scale
        duration: 200 * baseDurationMultiplier,
        // Adjust duration
        ease: "Power2",
        onComplete: () => {
          if (impactCircle.active) impactCircle.destroy();
        }
      });
      this.tweens.add({
        targets: ring,
        scaleX: 4 * baseScaleMultiplier * (1 + (hits - 1) * 0.2),
        // Combine base scale and multi-hit scale
        scaleY: 4 * baseScaleMultiplier * (1 + (hits - 1) * 0.2),
        // Combine base scale and multi-hit scale
        alpha: 0,
        duration: 300 * baseDurationMultiplier,
        // Adjust duration
        ease: "Power2",
        onComplete: () => {
          if (ring.active) ring.destroy();
        }
      });
    }
    // --- Projectile Creation ---
    createProjectile(x, y, direction, speed, damage, ownerId, type = "projectile") {
      const projectile = new Projectile(x, y, direction, speed, damage, ownerId, type, {});
      this.projectiles.push(projectile);
      const visual = this.add.image(x, y, "bullet");
      visual.rotation = Math.atan2(direction.y, direction.x);
      visual.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      visual.setDepth(1.5);
      this.projectileVisuals.set(projectile.id, visual);
      console.log(`Created projectile ${projectile.id} of type ${type} at (${x.toFixed(0)}, ${y.toFixed(0)}) owned by ${ownerId}`);
      return projectile;
    }
    // --- NEW: Railgun Projectile Creation ---
    createRailgunProjectile(x, y, directionX, directionY, damage, speed, chargeRatio) {
      const direction = { x: directionX, y: directionY };
      const projectile = new RailgunProjectile(x, y, direction, speed, damage, this.player.id, chargeRatio, {});
      this.projectiles.push(projectile);
      const visual = this.add.image(x, y, "plasma_bullet");
      visual.rotation = Math.atan2(direction.y, direction.x);
      visual.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const scaleX = (1 + chargeRatio * 2) * 2;
      const scaleY = (0.5 + chargeRatio * 0.8) * 2;
      visual.setScale(scaleX, scaleY);
      const blueIntensity = 155 + Math.floor(100 * chargeRatio);
      const greenIntensity = 100 + Math.floor(155 * chargeRatio);
      const tintColor = Phaser.Display.Color.GetColor(255, greenIntensity, blueIntensity);
      visual.setTint(tintColor);
      const glowIntensity = 0.5 + chargeRatio * 0.5;
      visual.postFX.addGlow(tintColor, glowIntensity, 0, false, 0.1, 5 + chargeRatio * 5);
      visual.setDepth(1.6);
      this.projectileVisuals.set(projectile.id, visual);
      console.log(`Created RAILGUN projectile ${projectile.id} at (${x.toFixed(0)}, ${y.toFixed(0)}) with charge ${chargeRatio.toFixed(2)}`);
      return projectile;
    }
    // 2. Make the Dash Trail White
    createDashTrailEffect(x, y) {
      const trailMarker = this.add.circle(x, y, 15, 16777215, 0.4);
      trailMarker.setDepth(0.5);
      this.tweens.add({
        targets: trailMarker,
        alpha: 0,
        scale: 0.5,
        duration: 300,
        ease: "Power2",
        onComplete: () => {
          trailMarker.destroy();
        }
      });
    }
    // --- Speed Trail Effect ---
    createSpeedTrailEffect(x, y, stacks, velocityX, velocityY) {
      const maxStacks = 15;
      const intensity = Math.min(1, stacks / maxStacks);
      const baseAlpha = 0.3;
      const baseLength = 20;
      const baseWidth = 4;
      const baseDuration = 350;
      const trailAlpha = baseAlpha + intensity * 0.5;
      const trailLength = baseLength + intensity * 15;
      const trailWidth = baseWidth + intensity * 2;
      const trailDuration = baseDuration - intensity * 100;
      let angle = 0;
      let normX = 0;
      let normY = 0;
      const length = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
      if (length > 0) {
        angle = Math.atan2(velocityY, velocityX);
        normX = velocityX / length;
        normY = velocityY / length;
      }
      const perpX = -normY;
      const perpY = normX;
      const offsetDistance = 8;
      const createStreak = (offsetX, offsetY, lengthMultiplier, alphaMultiplier) => {
        const streakX = x + perpX * offsetX;
        const streakY = y + perpY * offsetY;
        const currentTrailLength = trailLength * lengthMultiplier;
        const currentTrailAlpha = trailAlpha * alphaMultiplier;
        const trailMarker = this.add.rectangle(
          streakX,
          streakY,
          currentTrailLength,
          // Use calculated length
          trailWidth,
          // Use width for height parameter
          16777215,
          // White color
          currentTrailAlpha
          // Use calculated alpha
        );
        trailMarker.setDepth(0.5);
        trailMarker.setRotation(angle);
        this.tweens.add({
          targets: trailMarker,
          alpha: 0,
          scaleX: 0.1,
          // Shrink the length as it fades
          duration: trailDuration,
          ease: "Power1",
          // Linear fade out
          onComplete: () => {
            trailMarker.destroy();
          }
        });
      };
      const sideLengthMultiplier = 0.6;
      const sideAlphaMultiplier = 0.7;
      createStreak(0, 0, 1, 1);
      createStreak(offsetDistance, offsetDistance, sideLengthMultiplier, sideAlphaMultiplier);
      createStreak(-offsetDistance, -offsetDistance, sideLengthMultiplier, sideAlphaMultiplier);
    }
    // 3. Enhanced Knockback - Apply it independently of physics
    // Add this helper method to GameScreen.js
    applyEnhancedKnockback(entity, directionX, directionY, force) {
      if (!entity || entity.state === "dead") return;
      console.log(`Applying enhanced knockback to ${entity.id} with force ${force}`);
      const length = Math.sqrt(directionX * directionX + directionY * directionY);
      if (length === 0) return;
      const normalizedX = directionX / length;
      const normalizedY = directionY / length;
      const knockbackDistance = force * 0.1;
      const knockbackDuration = 300;
      const targetX = entity.x + normalizedX * knockbackDistance;
      const targetY = entity.y + normalizedY * knockbackDistance;
      console.log(`Knockback from (${entity.x}, ${entity.y}) to (${targetX}, ${targetY})`);
      const tweenTarget = {
        x: entity.x,
        y: entity.y
      };
      this.tweens.add({
        targets: tweenTarget,
        // Tween this object, not a temp object
        x: targetX,
        y: targetY,
        duration: knockbackDuration,
        ease: "Power2Out",
        onUpdate: () => {
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
    // Add this to GameScreen.js, now accepting hits parameter
    applyHitStop(attacker, target, baseDamagePerHit, hits = 1) {
      const baseDuration = 50;
      const maxDuration = 150;
      const totalDamageFactor = baseDamagePerHit * hits;
      const damageScale = Math.min(1, totalDamageFactor / 100);
      const hitStopDuration = baseDuration + (maxDuration - baseDuration) * damageScale;
      const originalTimeScale = this.time.timeScale;
      this.time.timeScale = 0.05;
      this.time.delayedCall(hitStopDuration * 0.05, () => {
        this.tweens.add({
          targets: this.time,
          timeScale: originalTimeScale,
          duration: 100,
          ease: "Power1Out"
        });
      });
    }
    // --- Smoke Bomb Effect ---
    createSmokeBombEffect(x, y) {
      console.log(`Creating smoke bomb effect at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      const particleCount = 25;
      const duration = 800;
      const maxRadius = 80;
      for (let i = 0; i < particleCount; i++) {
        const greyShade = Phaser.Math.Between(50, 150);
        const particle = this.add.circle(x, y, Phaser.Math.Between(5, 15), `0x${greyShade.toString(16).repeat(3)}`, 0.7);
        particle.setDepth(1.8);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * maxRadius;
        const targetX = x + Math.cos(angle) * radius;
        const targetY = y + Math.sin(angle) * radius;
        this.tweens.add({
          targets: particle,
          x: targetX,
          y: targetY,
          scale: Phaser.Math.FloatBetween(2, 4),
          // Expand size
          alpha: 0,
          duration: duration * Phaser.Math.FloatBetween(0.7, 1),
          // Vary duration slightly
          ease: "Quad.easeOut",
          // Ease out for slowing down effect
          onComplete: () => {
            particle.destroy();
          }
        });
      }
    }
    // --- End Smoke Bomb Effect ---
    // --- Melee Hit Effect ---
    createMeleeHitEffect(x, y) {
      console.log(`Creating melee hit effect at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      const flash = this.add.circle(x, y, 25, 16711680, 0.7);
      flash.setDepth(2);
      const ring = this.add.circle(x, y, 10, 13369344, 0);
      ring.setStrokeStyle(4, 13369344, 0.8);
      ring.setDepth(2);
      const particleCount = 6;
      const particles = [];
      for (let i = 0; i < particleCount; i++) {
        const particle = this.add.rectangle(x, y, 5, 5, 16711680, 0.9);
        particle.setDepth(2);
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 120;
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;
        particles.push(particle);
        this.tweens.add({
          targets: particle,
          x: particle.x + velocityX,
          y: particle.y + velocityY,
          alpha: 0,
          scale: 0.2,
          // Shrink particles
          angle: Phaser.Math.Between(-180, 180),
          // Add rotation
          duration: 250,
          // Faster duration
          ease: "Power1",
          onComplete: () => {
            particle.destroy();
          }
        });
      }
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 0.5,
        // Shrink flash
        duration: 150,
        // Quick flash
        ease: "Power1",
        onComplete: () => {
          flash.destroy();
        }
      });
      this.tweens.add({
        targets: ring,
        scaleX: 3,
        // Smaller expansion than impact
        scaleY: 3,
        alpha: 0,
        duration: 250,
        // Faster expansion
        ease: "Quad.easeOut",
        onComplete: () => {
          ring.destroy();
        }
      });
      this.cameras.main.shake(80, 8e-3);
    }
    // --- End Melee Hit Effect ---
    // --- Bleed Damage Indicator ---
    createBleedDamageIndicator(x, y, damageAmount) {
      const damageText = this.add.text(x, y - 20, `-${damageAmount}`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ff0000",
        // Red color (Previously for bleed, now unused)
        stroke: "#000000",
        strokeThickness: 3,
        align: "center"
      });
      damageText.setOrigin(0.5);
      damageText.setDepth(3);
      this.tweens.add({
        targets: damageText,
        y: y - 50,
        // Move upwards
        alpha: 0,
        duration: 800,
        // Lasts a bit longer than standard impact
        ease: "Power1",
        onComplete: () => {
          if (damageText.active) damageText.destroy();
        }
      });
    }
    // --- End Bleed Damage Indicator ---
    // --- Bleed Particle Effect ---
    createBleedParticleEffect(x, y) {
      const particleCount = 3;
      const duration = 600;
      const gravity = 150;
      const horizontalSpread = 50;
      for (let i = 0; i < particleCount; i++) {
        const particle = this.add.circle(x, y, Phaser.Math.Between(2, 4), 16711680, 0.8);
        particle.setDepth(1.9);
        const initialVelocityX = Phaser.Math.FloatBetween(-horizontalSpread, horizontalSpread);
        const initialVelocityY = Phaser.Math.FloatBetween(-20, 20);
        this.tweens.add({
          targets: particle,
          props: {
            y: {
              value: `+=${gravity * (duration / 1e3)}`,
              // Approximate final Y based on duration
              ease: "Quad.easeIn"
              // Simulate acceleration due to gravity
            },
            x: {
              value: `+=${initialVelocityX * (duration / 1e3)}`,
              // Horizontal drift
              ease: "Linear"
            },
            alpha: {
              value: 0,
              duration: duration * 0.8,
              // Start fading later
              delay: duration * 0.2,
              ease: "Power1"
            },
            scale: {
              value: 0,
              // Shrink as it fades
              duration,
              ease: "Power1"
            }
          },
          duration,
          onComplete: () => {
            if (particle.active) particle.destroy();
          }
        });
      }
    }
    // --- End Bleed Particle Effect ---
    createSplitEffect(x, y, color) {
      console.log(`Creating split effect at (${x.toFixed(0)}, ${y.toFixed(0)})`);
      const particleCount = 20;
      const duration = 500;
      const maxRadius = 60;
      for (let i = 0; i < particleCount; i++) {
        const size = Phaser.Math.Between(3, 8);
        const particle = this.add.circle(x, y, size, color, 0.8);
        particle.setDepth(1.8);
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        const distance = Math.random() * maxRadius;
        const targetX = x + Math.cos(angle) * distance;
        const targetY = y + Math.sin(angle) * distance;
        this.tweens.add({
          targets: particle,
          x: targetX,
          y: targetY,
          angle: Phaser.Math.Between(-180, 180),
          scale: { from: 1, to: 0.2 },
          alpha: { from: 0.8, to: 0 },
          duration: duration * Phaser.Math.FloatBetween(0.7, 1),
          ease: "Power2",
          onComplete: () => {
            particle.destroy();
          }
        });
      }
      const flash = this.add.circle(x, y, 30, color, 0.6);
      flash.setDepth(1.7);
      this.tweens.add({
        targets: flash,
        scale: 2,
        alpha: 0,
        duration: 300,
        ease: "Power2",
        onComplete: () => {
          flash.destroy();
        }
      });
      this.cameras.main.shake(100, 8e-3);
    }
    // --- Powerup Selection Flow ---
    // Define available powerups here for GameScreen to access
    // This list MUST match the options in PowerupSelectionScreen.js for maxStacks lookup
    availablePowerups = [
      { type: "speed_boost", text: "Speed Boost (5% per stack, max 15)", maxStacks: 15 },
      // { type: 'bleeding', text: 'Bleeding Hit (5 + 2/stack DPS for 3s, max 5)', maxStacks: 5 }, // Removed Bleeding Powerup
      // { type: 'fire_rate_boost', text: 'Fire Rate Boost (8% per stack, max 5)', maxStacks: 5 }, // Removed
      { type: "health_increase", text: "Max Health +20 (per stack, max 5)", maxStacks: 5 }
    ];
    openPowerupSelection() {
      if (!this.scene.isActive("PowerupSelectionScreen")) {
        console.log("Pausing GameScreen and launching PowerupSelectionScreen...");
        this.physics.pause();
        this.scene.pause();
        this.scene.launch("PowerupSelectionScreen", { parentScene: this });
      } else {
        console.log("PowerupSelectionScreen is already active.");
      }
    }
    applySelectedPowerup(powerupType) {
      console.log(`GameScreen: Applying selected powerup - Type: ${powerupType}`);
      if (!this.player || !this.player.powerupManager) {
        console.error("Cannot apply powerup: Player or PowerupManager not found.");
        this.resumeGameScreen();
        return;
      }
      const powerupDefinition = this.availablePowerups.find((p) => p.type === powerupType);
      if (!powerupDefinition) {
        console.error(`Powerup definition not found for type: ${powerupType}`);
        this.resumeGameScreen();
        return;
      }
      const newPowerup = new Powerup(this, 0, 0, powerupDefinition.type, {
        maxStacks: powerupDefinition.maxStacks
      });
      this.player.powerupManager.addPowerup(newPowerup);
      console.log(`Powerup ${powerupType} applied to player.`);
    }
    resumeGameScreen() {
      console.log("Resuming GameScreen...");
      if (this.scene.isActive("PowerupSelectionScreen")) {
        this.scene.stop("PowerupSelectionScreen");
      }
      this.physics.resume();
      this.scene.resume();
      if (this.inputHandler) {
        this.inputHandler.clearStateOnResume();
      }
    }
    updatePowerupCountersUI() {
      if (!this.player || !this.player.powerupManager || !this.powerupCountersContainerElement) {
        return;
      }
      const activePowerups = this.player.powerupManager.activePowerups;
      for (const type in this.powerupCounterElements) {
        const elements = this.powerupCounterElements[type];
        const powerupData = activePowerups.get(type);
        if (powerupData && powerupData.stacks > 0) {
          elements.container.style.display = "flex";
          let textContent = "";
          switch (type) {
            case "speed_boost":
              textContent = `Speed x ${powerupData.stacks}`;
              break;
            // case 'bleeding': // Removed Bleeding UI Update Case
            //     textContent = `Bleed x ${powerupData.stacks}`;
            //     break;
            case "fire_rate_boost":
              textContent = `Fire Rate x ${powerupData.stacks}`;
              break;
            case "health_increase":
              textContent = `Max HP x ${powerupData.stacks}`;
              break;
            // Add cases for other powerup types here
            default:
              textContent = `${type.replace("_", " ")} x ${powerupData.stacks}`;
          }
          elements.text.innerText = textContent;
        } else {
          elements.container.style.display = "none";
        }
      }
    }
    // --- Wave UI Update ---
    updateWaveUI(waveNumber) {
      if (this.waveCounterElement) {
        this.waveCounterElement.innerText = `Wave: ${waveNumber}`;
      }
    }
    // --- End Wave UI Update ---
    // --- HTML Countdown UI Control Methods ---
    startInterWaveCountdown(durationSeconds) {
      if (this.countdownDisplayElement) {
        this.countdownDisplayElement.innerText = `Next Wave: ${durationSeconds}`;
        this.countdownDisplayElement.style.display = "block";
        console.log(`GameScreen: Displaying HTML countdown UI for ${durationSeconds} seconds.`);
      }
    }
    hideCountdownUI() {
      if (this.countdownDisplayElement) {
        this.countdownDisplayElement.style.display = "none";
        console.log("GameScreen: Hiding HTML countdown UI.");
      }
    }
    // --- End HTML Countdown UI Control Methods ---
    // --- End Powerup Selection Flow ---
    // --- Resize Handler ---
    handleResize(gameSize) {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    }
    // --- End Resize Handler ---
    shutdown() {
      console.log("Shutting down GameScreen...");
      if (this.healthBarContainerElement) {
        this.healthBarContainerElement.style.display = "none";
      }
      if (this.plasmaCounterContainerElement) {
        this.plasmaCounterContainerElement.style.display = "none";
      }
      if (this.plasmaIconVisual) {
        this.plasmaIconVisual.destroy();
        this.plasmaIconVisual = null;
      }
      if (this.inputHandler) {
        this.inputHandler.destroy();
        this.inputHandler = null;
      }
      if (this.worldManager) {
        this.worldManager.destroy();
        this.worldManager = null;
      }
      this.scale.off("resize", this.handleResize, this);
      if (this.enemyManager) {
        this.enemyManager.destroy();
        this.enemyManager = null;
      }
      if (this.miniMap) {
        this.miniMap.hide();
        this.miniMap.clearAllDots();
        this.miniMap = null;
      }
      if (this.tileCoordsElement) {
        this.tileCoordsElement.style.display = "none";
      }
      if (this.powerupCountersContainerElement) {
        this.powerupCountersContainerElement.style.display = "none";
      }
      if (this.waveCounterElement) {
        this.waveCounterElement.style.display = "none";
      }
      if (this.clearPlasmaButtonElement) {
        this.clearPlasmaButtonElement.style.display = "none";
      }
      if (this.bossHealthBarContainerElement) {
        this.bossHealthBarContainerElement.style.display = "none";
      }
      if (this.gameLivesCounterElement) {
        this.gameLivesCounterElement.style.display = "none";
      }
      if (this.deathLivesText) {
        this.deathLivesText.destroy();
        this.deathLivesText = null;
      }
      if (this.countdownDisplayElement) {
        this.countdownDisplayElement.style.display = "none";
      }
      if (this.waveManager) {
        this.waveManager = null;
      }
      this.player = null;
      this.playerVisual = null;
      this.playerShadow = null;
      if (this.playerShadow) this.playerShadow.destroy();
      this.debugGraphics = null;
      if (this.debugGraphics) this.debugGraphics.destroy();
      this.enemyVisuals.forEach((visual) => visual.destroy());
      this.enemyVisuals.clear();
      this.enemies = [];
      this.projectileVisuals.forEach((visual) => visual.destroy());
      this.projectileVisuals.clear();
      this.projectiles = [];
      this.earthquakeZones.forEach((zone) => {
        if (zone.visual) zone.visual.destroy();
      });
      this.earthquakeZones = [];
      if (this.instructionsContainer) this.instructionsContainer.destroy();
      if (this.instructionsOverlay) this.instructionsOverlay.destroy();
    }
    // --- Instructions UI Creation & Dismissal ---
    createInstructionsUI() {
      if (this.instructionsContainer) {
        console.log("Instructions UI is already visible.");
        return;
      }
      const padding = 15;
      const textWidth = 320;
      const { width: cameraWidth, height: cameraHeight } = this.cameras.main;
      const centerX = cameraWidth / 2;
      const centerY = cameraHeight / 2;
      const instructionsTextContent = `== MARS SURVIVAL PROTOCOL ==
Controls:
  [W][A][S][D] - Maneuver Rover
  [Left Click] - Fire Current Weapon (Blaster or Railgun)
  [E]          - Swap Weapons (Blaster <-> Railgun)

Weapons:
  Blaster: Standard rapid-fire energy weapon.
  Railgun: Powerful piercing shot. Consumes Plasma. Charge by holding Left Click.

Plasma Resource:
  Collect glowing blue Plasma dropped by deactivated hostiles.
  Plasma fuels your Railgun. Manage it wisely, Recruit!

Objective:
  Locate and neutralize the rogue Engineer unit. The fate of the Mars colony depends on you!

  [X] or [ESC] - Close this window`;
      const textStyle = {
        fontSize: "14px",
        fill: "#FFD700",
        // Gold/Yellow
        fontFamily: 'Consolas, "Courier New", monospace',
        align: "left",
        wordWrap: { width: textWidth, useAdvancedWrap: true },
        stroke: "#A0522D",
        // Sienna/Brown
        strokeThickness: 1,
        lineSpacing: 4
      };
      const tempText = this.add.text(0, 0, instructionsTextContent, textStyle).setVisible(false);
      const textHeight = tempText.height;
      tempText.destroy();
      const panelWidth = textWidth + padding * 2;
      const panelHeight = textHeight + padding * 2 + 10;
      const panelX = centerX - panelWidth / 2;
      const panelY = centerY - panelHeight / 2;
      this.instructionsOverlay = this.add.graphics({ fillStyle: { color: 0, alpha: 0.7 } });
      this.instructionsOverlay.fillRect(0, 0, cameraWidth, cameraHeight);
      this.instructionsOverlay.setScrollFactor(0);
      this.instructionsOverlay.setDepth(999);
      this.instructionsOverlay.setInteractive();
      console.log(`Instructions Overlay created. Size: (${cameraWidth}x${cameraHeight}), Depth: ${this.instructionsOverlay.depth}`);
      this.instructionsContainer = this.add.container(panelX, panelY);
      this.instructionsContainer.setScrollFactor(0);
      this.instructionsContainer.setDepth(1e3);
      console.log(`Instructions Container created at (${this.instructionsContainer.x.toFixed(0)}, ${this.instructionsContainer.y.toFixed(0)}), Depth: ${this.instructionsContainer.depth}, Alpha: ${this.instructionsContainer.alpha}, Visible: ${this.instructionsContainer.visible}`);
      const panelGraphics = this.add.graphics();
      panelGraphics.fillStyle(1710618, 0.9);
      panelGraphics.fillRoundedRect(0, 0, panelWidth, panelHeight, 10);
      panelGraphics.lineStyle(3, 10506797, 1);
      panelGraphics.strokeRoundedRect(0, 0, panelWidth, panelHeight, 10);
      this.instructionsContainer.add(panelGraphics);
      console.log(`Panel Graphics added to container.`);
      const instructionsText = this.add.text(padding, padding, instructionsTextContent, textStyle);
      this.instructionsContainer.add(instructionsText);
      console.log(`Instructions Text added to container. Content: "${instructionsText.text.substring(0, 30)}..."`);
      const dismissButton = this.add.text(panelWidth - padding, padding * 0.75, "\u2716", {
        // Using '✖' symbol, adjusted position slightly
        fontSize: "22px",
        // Slightly larger 'X'
        fill: "#FF6B00",
        // Martian Orange
        fontFamily: "Arial, sans-serif",
        // Simple font for 'X'
        stroke: "#000000",
        strokeThickness: 2
      });
      dismissButton.setOrigin(1, 0);
      dismissButton.setInteractive({ useHandCursor: true });
      this.instructionsContainer.add(dismissButton);
      console.log(`Dismiss Button added to container at relative (${dismissButton.x.toFixed(0)}, ${dismissButton.y.toFixed(0)})`);
      dismissButton.on("pointerdown", () => {
        this.dismissInstructions();
      });
      dismissButton.on("pointerover", () => dismissButton.setFill("#FFFFFF"));
      dismissButton.on("pointerout", () => dismissButton.setFill("#FF6B00"));
      this.instructionsCloseKey = this.input.keyboard.addKey("X");
      this.instructionsEscKey = this.input.keyboard.addKey("ESC");
      this.instructionsCloseKey.on("down", () => {
        this.dismissInstructions();
      });
      this.instructionsEscKey.on("down", () => {
        this.dismissInstructions();
      });
      console.log(`UI elements added. Proceeding to pause physics.`);
      this.physics.pause();
      console.log(`createInstructionsUI function completed.`);
    }
    // Update the dismiss instructions method to clean up key listeners
    dismissInstructions() {
      if (this.instructionsContainer || this.instructionsOverlay) {
        console.log("Dismissing instructions and resuming GameScreen.");
        if (this.instructionsCloseKey) {
          this.instructionsCloseKey.removeAllListeners();
          this.instructionsCloseKey = null;
        }
        if (this.instructionsEscKey) {
          this.instructionsEscKey.removeAllListeners();
          this.instructionsEscKey = null;
        }
        const targetsToFade = [];
        if (this.instructionsContainer) targetsToFade.push(this.instructionsContainer);
        if (this.instructionsOverlay) targetsToFade.push(this.instructionsOverlay);
        if (targetsToFade.length > 0) {
          this.tweens.add({
            targets: targetsToFade,
            alpha: 0,
            duration: 200,
            ease: "Power1",
            onComplete: () => {
              if (this.instructionsContainer) {
                this.instructionsContainer.destroy();
                this.instructionsContainer = null;
              }
              if (this.instructionsOverlay) {
                this.instructionsOverlay.destroy();
                this.instructionsOverlay = null;
              }
              if (this.physics.world.isPaused) {
                console.log("Resuming physics.");
                this.physics.resume();
              } else {
                console.log("Physics was not paused when trying to resume.");
              }
            }
          });
        } else {
          if (this.instructionsContainer) this.instructionsContainer.destroy();
          if (this.instructionsOverlay) this.instructionsOverlay.destroy();
          this.instructionsContainer = null;
          this.instructionsOverlay = null;
          if (this.physics.world.isPaused) {
            console.log("Resuming physics (no fade).");
            this.physics.resume();
          } else {
            console.log("Physics was not paused when trying to resume (no fade).");
          }
        }
      }
    }
    // --- End Instructions UI ---
    // --- NEW: Continuous Screen Shake Methods ---
    startContinuousShake(intensity = 5e-3, duration = Infinity) {
      if (!this.isShakingContinuously && this.cameras && this.cameras.main) {
        console.log("Starting continuous screen shake...");
        this.isShakingContinuously = true;
        this.cameras.main.shake(duration, intensity, false);
      }
    }
    stopContinuousShake() {
      if (this.isShakingContinuously && this.cameras && this.cameras.main) {
        console.log("Stopping continuous screen shake...");
        this.isShakingContinuously = false;
        this.cameras.main.shake(0, 0, true);
      }
    }
    // --- End Continuous Screen Shake Methods ---
    // --- Update Boss Health Bar UI ---
    updateBossHealthBarUI() {
      if (!this.bossHealthBarContainerElement || !this.bossHealthBarFillElement) {
        return;
      }
      let boss = null;
      for (const enemy of this.enemies) {
        if (enemy instanceof EngineerEnemy && enemy.state !== "dead") {
          boss = enemy;
          break;
        }
      }
      if (boss) {
        this.bossHealthBarContainerElement.style.display = "block";
        this.bossHealthBarMarkerElement.style.display = "block";
        const hpPercent = Math.max(0, boss.health / boss.maxHealth);
        const widthPercentage = hpPercent * 100;
        this.bossHealthBarFillElement.style.width = `${widthPercentage}%`;
      } else {
        this.bossHealthBarContainerElement.style.display = "none";
        this.bossHealthBarMarkerElement.style.display = "none";
      }
    }
    // --- End Update Boss Health Bar UI ---
    // --- Clear Plasma Method ---
    clearAllPlasma() {
      console.log("Clearing all plasma items...");
      let clearedCount = 0;
      this.items.forEach((item) => {
        if (item instanceof Plasma) {
          item.health = 0;
          clearedCount++;
        }
      });
      console.log(`Marked ${clearedCount} plasma items for removal.`);
    }
    // --- End Clear Plasma Method ---
    // --- Boss Pointer Update Logic REMOVED ---
    // --- Tunnel Explosion Effect (Mars Dirt) ---
    createTunnelExplosion(x, y) {
      const particleCount = 25;
      const duration = 500;
      const maxRadius = 70;
      for (let i = 0; i < particleCount; i++) {
        const baseShade = Phaser.Math.Between(90, 150);
        const redTint = Phaser.Math.Between(20, 50);
        const color = Phaser.Display.Color.GetColor(baseShade + redTint, baseShade * 0.9, baseShade * 0.8);
        const particle = this.add.circle(x, y, Phaser.Math.Between(4, 8), color, 0.7);
        particle.setDepth(1.8);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * maxRadius;
        const targetX = x + Math.cos(angle) * radius;
        const targetY = y + Math.sin(angle) * radius;
        this.tweens.add({
          targets: particle,
          x: targetX,
          y: targetY,
          scale: 0.2,
          // Shrink less drastically than trail
          alpha: 0,
          duration: duration * Phaser.Math.FloatBetween(0.7, 1),
          // Vary duration
          ease: "Quad.easeOut",
          onComplete: () => {
            if (particle.active) particle.destroy();
          }
        });
      }
    }
    // --- End Tunnel Explosion Effect ---
    // --- Tunnel Trail Particle Effect ---
    createTunnelTrailParticle(x, y) {
      const duration = 300;
      const size = Phaser.Math.Between(4, 7);
      const greyShade = Phaser.Math.Between(80, 140);
      const color = Phaser.Display.Color.GetColor(greyShade, greyShade * 0.9, greyShade * 0.8);
      const particle = this.add.circle(x, y, size, color, 0.7);
      particle.setDepth(1.6);
      this.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0.6,
        // Shrink slightly less
        duration,
        ease: "Linear",
        onComplete: () => {
          if (particle.active) particle.destroy();
        }
      });
    }
    // --- End Tunnel Trail Particle Effect ---
    // --- Drone Explosion Effect ---
    createExplosionEffect(x, y, radius) {
      console.log(`Creating explosion effect at (${x.toFixed(0)}, ${y.toFixed(0)}) with radius ${radius}`);
      const particleCount = 30;
      const duration = 600;
      const maxParticleSpread = radius * 1.5;
      for (let i = 0; i < particleCount; i++) {
        const particleColorValue = Phaser.Math.RND.pick([16777215, 16776960, 16753920]);
        const particle = this.add.circle(x, y, Phaser.Math.Between(3, 7), particleColorValue, 0.9);
        particle.setDepth(1.9);
        const angle = Math.random() * Math.PI * 2;
        const spreadDistance = Math.random() * maxParticleSpread;
        const targetX = x + Math.cos(angle) * spreadDistance;
        const targetY = y + Math.sin(angle) * spreadDistance;
        this.tweens.add({
          targets: particle,
          x: targetX,
          y: targetY,
          scale: 0.1,
          // Shrink to almost nothing
          alpha: 0,
          duration: duration * Phaser.Math.FloatBetween(0.6, 1),
          // Vary duration
          ease: "Quad.easeOut",
          onComplete: () => {
            if (particle.active) particle.destroy();
          }
        });
      }
      const flash = this.add.circle(x, y, radius * 0.8, 16777130, 0.8);
      flash.setDepth(1.8);
      this.tweens.add({
        targets: flash,
        scale: 1.5,
        // Expand flash slightly
        alpha: 0,
        duration: 200,
        // Quick flash
        ease: "Expo.easeOut",
        onComplete: () => {
          if (flash.active) flash.destroy();
        }
      });
      this.cameras.main.shake(150, 0.012);
    }
    // --- End Drone Explosion Effect ---
    // --- Earthquake Zone Effect ---
    createShockwaveEffect(x, y) {
      const zoneRadius = 120;
      const zoneDuration = 80;
      const damageAmount = 5;
      const damageInterval = 2;
      const visualColor = 9127187;
      const visualAlpha = 0.3;
      const zoneVisual = this.add.graphics();
      zoneVisual.fillStyle(visualColor, visualAlpha);
      zoneVisual.fillCircle(x, y, zoneRadius);
      zoneVisual.setDepth(0.5);
      this.tweens.add({
        targets: zoneVisual,
        alpha: visualAlpha * 0.5,
        // Pulse between 0.3 and 0.15 alpha
        duration: 750,
        yoyo: true,
        repeat: -1,
        // Repeat indefinitely until destroyed
        ease: "Sine.easeInOut"
      });
      const earthquakeZone = {
        x,
        y,
        radius: zoneRadius,
        radiusSq: zoneRadius * zoneRadius,
        // Pre-calculate for efficiency
        durationTimer: zoneDuration,
        damageTickTimer: damageInterval,
        // Start ready to deal damage
        visual: zoneVisual,
        damageAmount,
        damageInterval,
        tween: zoneVisual.getData("tweens") ? zoneVisual.getData("tweens")[0] : null
        // Store tween reference if needed
      };
      this.earthquakeZones.push(earthquakeZone);
      console.log(`Created earthquake zone at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }
    // --- End Earthquake Zone Effect ---
    // --- Update Earthquake Zones ---
    updateEarthquakeZones(deltaTime) {
      if (!this.player || this.player.state === "dead") return;
      for (let i = this.earthquakeZones.length - 1; i >= 0; i--) {
        const zone = this.earthquakeZones[i];
        zone.durationTimer -= deltaTime;
        if (zone.durationTimer <= 0) {
          console.log(`Earthquake zone expired at (${zone.x.toFixed(0)}, ${zone.y.toFixed(0)})`);
          if (zone.visual) {
            const zoneTween = zone.visual.getData("tweens") ? zone.visual.getData("tweens")[0] : null;
            if (zoneTween) {
              zoneTween.stop();
            }
            zone.visual.destroy();
          }
          this.earthquakeZones.splice(i, 1);
          continue;
        }
        zone.damageTickTimer -= deltaTime;
        if (zone.damageTickTimer <= 0) {
          zone.damageTickTimer = zone.damageInterval;
          const dx = this.player.x - zone.x;
          const dy = this.player.y - zone.y;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq <= zone.radiusSq) {
            console.log(`Player hit by earthquake zone at (${zone.x.toFixed(0)}, ${zone.y.toFixed(0)}). Damage: ${zone.damageAmount}`);
            this.player.takeDamage(zone.damageAmount);
            this.cameras.main.shake(50, 5e-3);
          }
        }
      }
    }
    // --- End Update Earthquake Zones ---
  };

  // src/scenes/StartScene.js
  var StartScreen = class extends Phaser.Scene {
    constructor() {
      super("StartScreen");
    }
    preload() {
      this.load.image("background", "assets/background.png");
    }
    create() {
      const width = this.cameras.main.width;
      const height = this.cameras.main.height;
      this.bg = this.add.image(width / 2, height / 2, "background").setOrigin(0.5);
      this.resizeBackground(width, height);
      this.titleText = this.add.text(width / 2, height / 2, "RED REBELLION", {
        fontFamily: "Impact, fantasy",
        // More impactful font
        fontSize: "120px",
        // Larger size
        color: "#ff3333",
        align: "center",
        stroke: "#000000",
        strokeThickness: 6
      }).setOrigin(0.5);
      this.titleText.setInteractive({ useHandCursor: true });
      this.titleText.on("pointerover", () => {
        this.titleText.setColor("#ff6666");
        this.titleText.setScale(1.05);
      });
      this.titleText.on("pointerout", () => {
        this.titleText.setColor("#ff3333");
        this.titleText.setScale(1);
      });
      this.titleText.on("pointerdown", () => {
        this.tweens.add({
          targets: this.titleText,
          scale: 0.9,
          duration: 100,
          yoyo: true,
          ease: "Sine.easeInOut",
          onComplete: () => {
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
              if (!this.scene.get("GameScreen")) {
                this.scene.add("GameScreen", GameScreen, false);
              }
              this.scene.start("GameScreen");
            });
          }
        });
      });
      this.tweens.add({
        targets: this.titleText,
        y: height / 2 - 15,
        // Bob up slightly
        duration: 1800,
        // Slower, more subtle bobbing
        ease: "Sine.easeInOut",
        yoyo: true,
        repeat: -1
        // Repeat indefinitely
      });
      this.instructionText = this.add.text(width / 2, height / 2 + 80, "Click title to start", {
        fontFamily: "Arial, sans-serif",
        fontSize: "30px",
        color: "#cccccc",
        align: "center"
      }).setOrigin(0.5);
      this.scale.on("resize", this.handleResize, this);
    }
    resizeBackground(width, height) {
      if (!this.bg) return;
      const scaleX = width / this.bg.width;
      const scaleY = height / this.bg.height;
      this.bg.setPosition(width / 2, height / 2);
      this.bg.setScale(Math.max(scaleX, scaleY));
    }
    handleResize(gameSize) {
      const width = gameSize.width;
      const height = gameSize.height;
      this.resizeBackground(width, height);
      if (this.titleText) {
        this.titleText.setPosition(width / 2, height / 2);
        this.tweens.getTweensOf(this.titleText).forEach((tween) => {
          if (tween.props && tween.props.includes("y")) {
            tween.updateTo("y", height / 2 - 15, true);
          }
        });
      }
      if (this.instructionText) {
        this.instructionText.setPosition(width / 2, height / 2 + 80);
      }
    }
    shutdown() {
      this.scale.off("resize", this.handleResize, this);
      console.log("StartScreen shutdown complete, resize listener removed.");
    }
  };

  // src/scenes/PowerupSelectionScreen.js
  var PowerupSelectionScreen = class extends Phaser.Scene {
    constructor() {
      super("PowerupSelectionScreen");
      this.parentScene = null;
      this.options = [
        { type: "speed_boost", text: "Speed Boost (5% per stack, max 15)", maxStacks: 15 },
        // { type: 'bleeding', text: 'Bleeding Hit (5 + 2/stack DPS for 3s, max 5)', maxStacks: 5 }, // Removed Bleeding
        // { type: 'fire_rate_boost', text: 'Fire Rate Boost (8% per stack, max 5)', maxStacks: 5 }, // Removed
        { type: "health_increase", text: "Max Health +20 (per stack, max 5)", maxStacks: 5 }
      ];
      this.selectedPowerup = null;
    }
    init(data) {
      this.parentScene = data.parentScene;
      if (!this.parentScene) {
        console.error("PowerupSelectionScreen launched without parentScene reference!");
      }
    }
    create() {
      console.log("PowerupSelectionScreen Create");
      const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0, 0.7);
      overlay.setOrigin(0, 0);
      overlay.setScrollFactor(0);
      this.add.text(this.cameras.main.centerX, 100, "Choose a Powerup", {
        fontSize: "48px",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4
      }).setOrigin(0.5).setScrollFactor(0);
      const startY = 200;
      const spacingY = 80;
      this.options.forEach((option, index) => {
        const yPos = startY + index * spacingY;
        const buttonText = this.add.text(this.cameras.main.centerX, yPos, option.text, {
          fontSize: "32px",
          fill: "#cccccc",
          // Default greyish color
          backgroundColor: "#333333",
          padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
        buttonText.on("pointerover", () => {
          buttonText.setFill("#ffffff");
          buttonText.setBackgroundColor("#555555");
        });
        buttonText.on("pointerout", () => {
          buttonText.setFill("#cccccc");
          buttonText.setBackgroundColor("#333333");
        });
        buttonText.on("pointerdown", (pointer, localX, localY, event) => {
          event.stopPropagation();
          this.selectPowerup(option.type);
        });
      });
      this.input.keyboard.on("keydown-ESC", () => {
        this.closeScreen();
      });
    }
    // Duration parameter removed
    selectPowerup(type) {
      console.log(`Selected Powerup: ${type}`);
      if (this.parentScene && typeof this.parentScene.applySelectedPowerup === "function") {
        this.parentScene.applySelectedPowerup(type);
      } else {
        console.error("Cannot apply powerup - parentScene or applySelectedPowerup method missing.");
      }
      this.closeScreen();
    }
    closeScreen() {
      console.log("Closing PowerupSelectionScreen...");
      if (this.parentScene && typeof this.parentScene.resumeGameScreen === "function") {
        this.parentScene.resumeGameScreen();
      } else {
        console.error("Cannot resume parent scene - parentScene or resumeGameScreen method missing.");
      }
      this.scene.stop();
    }
    // No update needed for this simple selection screen
    // update(time, delta) {}
  };

  // src/scenes/GameOverScene.js
  var GameOverScene = class extends Phaser.Scene {
    constructor() {
      super({ key: "GameOverScene" });
    }
    init(data) {
      this.finalWave = data.waveReached || 0;
      this.outOfLives = data.outOfLives || false;
      this.finalScore = data.finalScore || 0;
      this.kills = data.kills || 0;
      this.deaths = data.deaths || 0;
      this.timeSurvived = data.timeSurvived || 0;
      this.bossKilled = data.bossKilled || false;
    }
    create() {
      const BOSS_KILL_MULTIPLIER2 = 2.5;
      const { width, height } = this.cameras.main;
      const centerX = width / 2;
      const centerY = height / 2;
      const theme = {
        primaryColor: "#FF6B00",
        // Martian Orange
        secondaryColor: "#00E0FF",
        // Tech Cyan
        textColor: "#E0E0E0",
        // Light Grey/White
        backgroundColor: "#201510",
        // Dark Reddish Brown
        overlayAlpha: 0.85,
        fontFamily: 'Consolas, "Courier New", monospace',
        // Tech font
        titleFontSize: "72px",
        bodyFontSize: "36px",
        buttonFontSize: "38px",
        strokeColor: "#111111",
        buttonBgColor: "#443020",
        // Darker Brown/Orange
        buttonHoverBgColor: "#664530",
        buttonTextColor: "#00E0FF",
        // Cyan text on buttons
        buttonHoverTextColor: "#FFFFFF",
        gameOverColor: "#FF4444",
        // Keep a distinct red for failure
        waveClearColor: "#66FF66"
        // Keep a distinct green for success
      };
      const overlay = this.add.graphics({ fillStyle: { color: Phaser.Display.Color.HexStringToColor(theme.backgroundColor).color, alpha: theme.overlayAlpha } });
      overlay.fillRect(0, 0, width, height);
      const titleText = this.outOfLives ? "SYSTEM FAILURE" : "OBJECTIVE COMPLETE";
      const titleColor = this.outOfLives ? theme.gameOverColor : theme.waveClearColor;
      this.add.text(centerX, centerY - 150, titleText, {
        fontSize: theme.titleFontSize,
        fill: titleColor,
        fontFamily: theme.fontFamily,
        fontStyle: "bold",
        stroke: theme.strokeColor,
        strokeThickness: 5,
        shadow: { offsetX: 2, offsetY: 2, color: "#111", blur: 4, fill: true }
      }).setOrigin(0.5);
      this.add.text(centerX, centerY - 80, `Reached Sector: ${this.finalWave}`, {
        // Changed "Wave" to "Sector"
        fontSize: theme.bodyFontSize,
        fill: theme.textColor,
        fontFamily: theme.fontFamily,
        stroke: theme.strokeColor,
        strokeThickness: 3
      }).setOrigin(0.5);
      const scoreYStart = centerY - 30;
      const scoreLineHeight = 40;
      this.add.text(centerX, scoreYStart, `Kills: ${this.kills} / Deaths: ${this.deaths}`, {
        fontSize: "24px",
        // Smaller font for details
        fill: theme.textColor,
        fontFamily: theme.fontFamily
      }).setOrigin(0.5);
      this.add.text(centerX, scoreYStart + scoreLineHeight, `Time Survived: ${this.timeSurvived}s`, {
        fontSize: "24px",
        fill: theme.textColor,
        fontFamily: theme.fontFamily
      }).setOrigin(0.5);
      if (this.bossKilled) {
        this.add.text(centerX, scoreYStart + scoreLineHeight * 2, `Boss Bonus: x${BOSS_KILL_MULTIPLIER2} Applied!`, {
          fontSize: "24px",
          fill: theme.secondaryColor,
          // Use a highlight color
          fontFamily: theme.fontFamily,
          fontStyle: "italic"
        }).setOrigin(0.5);
      }
      this.add.text(centerX, scoreYStart + scoreLineHeight * (this.bossKilled ? 4 : 2.5), `Final Score: ${this.finalScore}`, {
        fontSize: "42px",
        // Larger font for final score
        fill: theme.primaryColor,
        // Use primary theme color
        fontFamily: theme.fontFamily,
        fontStyle: "bold",
        stroke: theme.strokeColor,
        strokeThickness: 4
      }).setOrigin(0.5);
      const buttonBaseStyle = {
        fontSize: theme.buttonFontSize,
        fontFamily: theme.fontFamily,
        fill: theme.buttonTextColor,
        backgroundColor: theme.buttonBgColor,
        padding: { x: 30, y: 15 }
        // Increased padding
        // Add fixed width for alignment?
        // fixedWidth: 350,
        // align: 'center'
      };
      const buttonHoverStyle = {
        fill: theme.buttonHoverTextColor,
        backgroundColor: theme.buttonHoverBgColor
      };
      const buttonYOffset = 120;
      const buttonSpacing = 80;
      const addBrackets = (button) => {
        const bracketColor = Phaser.Display.Color.HexStringToColor(theme.secondaryColor).color;
        const bracketThickness = 2;
        const bracketLength = 20;
        const bracketOffset = 10;
        const bounds2 = button.getBounds();
        const graphics = this.add.graphics().setDepth(button.depth);
        graphics.lineStyle(bracketThickness, bracketColor, 0.8);
        graphics.beginPath();
        graphics.moveTo(bounds2.left - bracketOffset, bounds2.top - bracketOffset + bracketLength);
        graphics.lineTo(bounds2.left - bracketOffset, bounds2.top - bracketOffset);
        graphics.lineTo(bounds2.left - bracketOffset + bracketLength, bounds2.top - bracketOffset);
        graphics.strokePath();
        graphics.beginPath();
        graphics.moveTo(bounds2.right + bracketOffset - bracketLength, bounds2.top - bracketOffset);
        graphics.lineTo(bounds2.right + bracketOffset, bounds2.top - bracketOffset);
        graphics.lineTo(bounds2.right + bracketOffset, bounds2.top - bracketOffset + bracketLength);
        graphics.strokePath();
        graphics.beginPath();
        graphics.moveTo(bounds2.left - bracketOffset, bounds2.bottom + bracketOffset - bracketLength);
        graphics.lineTo(bounds2.left - bracketOffset, bounds2.bottom + bracketOffset);
        graphics.lineTo(bounds2.left - bracketOffset + bracketLength, bounds2.bottom + bracketOffset);
        graphics.strokePath();
        graphics.beginPath();
        graphics.moveTo(bounds2.right + bracketOffset - bracketLength, bounds2.bottom + bracketOffset);
        graphics.lineTo(bounds2.right + bracketOffset, bounds2.bottom + bracketOffset);
        graphics.lineTo(bounds2.right + bracketOffset, bounds2.bottom + bracketOffset - bracketLength);
        graphics.strokePath();
        return graphics;
      };
      const restartY = this.outOfLives ? centerY + buttonYOffset + buttonSpacing / 2 : centerY + buttonYOffset;
      const restartButton = this.add.text(centerX, restartY, "REINITIALIZE", {
        // Thematic text
        ...buttonBaseStyle
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const restartBrackets = addBrackets(restartButton);
      restartButton.on("pointerdown", () => {
        console.log("Restarting game from Wave 1...");
        this.scene.start("GameScreen", { startingWave: 1 });
      });
      restartButton.on("pointerover", () => restartButton.setStyle({ ...buttonBaseStyle, ...buttonHoverStyle }));
      restartButton.on("pointerout", () => restartButton.setStyle({ ...buttonBaseStyle }));
      const endlessButton = this.add.text(centerX, centerY + buttonYOffset + buttonSpacing, "CONTINUE EXPLORATION", {
        // Thematic text
        ...buttonBaseStyle
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const endlessBrackets = addBrackets(endlessButton);
      endlessButton.on("pointerdown", () => {
        console.log("Continuing to endless mode...");
        this.scene.start("GameScreen", { endlessMode: true, startingWave: this.finalWave + 1 });
      });
      endlessButton.on("pointerover", () => endlessButton.setStyle({ ...buttonBaseStyle, ...buttonHoverStyle }));
      endlessButton.on("pointerout", () => endlessButton.setStyle({ ...buttonBaseStyle }));
      if (this.outOfLives) {
        endlessButton.setVisible(false);
        endlessButton.disableInteractive();
        if (endlessBrackets) endlessBrackets.setVisible(false);
      }
    }
  };
  var GameOverScene_default = GameOverScene;

  // src/main.js
  var config = {
    type: Phaser.AUTO,
    // Use WebGL if available, otherwise Canvas
    // width and height are managed by the scale manager (RESIZE mode)
    parent: "phaser-game",
    // ID of the div to contain the game
    pixelArt: false,
    // Disable pixel art for smoother scaling
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        // No gravity needed for a start screen
        debug: true
      }
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      // Resize the game canvas to fill the container
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // Center the game canvas horizontally and vertically
      width: "100%",
      height: "100%",
      parent: "phaser-game",
      expandParent: true
    },
    // Add all scenes to the config so they are known by the Scene Manager
    scene: [StartScreen, GameScreen, PowerupSelectionScreen, GameOverScene_default]
    // Add GameOverScene here
  };
  var game = new Phaser.Game(config);
})();
