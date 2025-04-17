/**
 * Manages the HTML minimap UI element.
 */
export default class MiniMap {
    constructor(worldManager, player, sceneContext) { // Removed enemyManager, renamed plasmaManager
        this.worldManager = worldManager; // To get world bounds and potentially terrain info
        this.player = player;
        this.sceneContext = sceneContext; // Store the scene reference

        this.miniMapElement = document.getElementById('mini-map');
        this.miniMapContentElement = document.getElementById('mini-map-content');
        this.mapWidth = 0; // Initialize to 0
        this.mapHeight = 0; // Initialize to 0
        this._dimensionsRead = false; // Flag to read dimensions only once

        // Calculate the world area the minimap should represent based on render distance
        const loadedChunksDiameter = (this.worldManager.renderDistance * 2) + 1;
        this.mapViewWorldWidth = loadedChunksDiameter * this.worldManager.chunkSize * this.worldManager.tileSize;
        this.mapViewWorldHeight = this.mapViewWorldWidth; // Assuming square view for simplicity

        this.entityDots = new Map(); // Map to store DOM elements for entities { entityId: element }

        if (!this.miniMapElement || !this.miniMapContentElement) {
            console.error("MiniMap elements not found in the DOM!");
            return;
        }

        // Initial setup - potentially draw static elements like regions if needed
        // this.drawRegions();
    }

    show() {
        if (this.miniMapElement) {
            this.miniMapElement.style.display = 'block';
        }
    }

    hide() {
        if (this.miniMapElement) {
            this.miniMapElement.style.display = 'none';
        }
        // Clear dots when hiding? Optional.
        // this.clearAllDots();
    }

    /**
     * Converts world coordinates to minimap coordinates.
     * Assumes world coordinates range needs to be mapped to mapWidth/mapHeight.
     * This needs refinement based on actual world size/view.
     * For now, let's assume a fixed large world area we are viewing a part of.
     * A better approach might involve knowing the total world dimensions.
     */
    getMapCoordinates(worldX, worldY) {
        // Placeholder: Simple scaling based on a fixed assumed world view size.
        // This needs to be adjusted based on how your world coordinates work
        // and what portion of the world the minimap should represent.
        // Example: Map represents a 4000x4000 area centered on the player?
        // Or does it represent the entire generated world?

        // Let's assume the minimap represents a fixed area around the player for now.
        // We need the WorldManager to provide the relevant bounds or scale.
        // For a *very* basic start, let's just modulo coordinates (will wrap around)
        // A proper implementation needs world bounds from WorldManager.

        // The minimap represents a square area centered on the player,
        // with dimensions calculated based on the WorldManager's render distance.
        const viewCenterX = this.player.x;
        const viewCenterY = this.player.y;
        // Use the calculated view dimensions from the constructor
        const viewWidth = this.mapViewWorldWidth;
        const viewHeight = this.mapViewWorldHeight;

        const viewOffsetX = viewCenterX - viewWidth / 2;
        const viewOffsetY = viewCenterY - viewHeight / 2;
        const relativeX = worldX - viewOffsetX;
        const relativeY = worldY - viewOffsetY;

        const mapX = (relativeX / viewWidth) * this.mapWidth;
        const mapY = (relativeY / viewHeight) * this.mapHeight;

        const clampedX = Math.max(0, Math.min(this.mapWidth, mapX));
        const clampedY = Math.max(0, Math.min(this.mapHeight, mapY));

        // Add logging
        // console.log(`World: (${worldX.toFixed(0)}, ${worldY.toFixed(0)}), PlayerCenter: (${viewCenterX.toFixed(0)}, ${viewCenterY.toFixed(0)}), ViewOffset: (${viewOffsetX.toFixed(0)}, ${viewOffsetY.toFixed(0)}), Relative: (${relativeX.toFixed(0)}, ${relativeY.toFixed(0)}), Scaled: (${mapX.toFixed(2)}, ${mapY.toFixed(2)}), Clamped: (${clampedX.toFixed(2)}, ${clampedY.toFixed(2)})`);

        return { x: clampedX, y: clampedY };
    }

    updateDot(entity, className) {
        if (!entity || typeof entity.x === 'undefined' || typeof entity.y === 'undefined') {
            // console.warn("Invalid entity passed to updateDot:", entity);
            return;
        }
         // Use a unique ID for each entity if available, otherwise use the entity object itself (less safe)
        const entityId = entity.id || entity;

        let dotElement = this.entityDots.get(entityId);

        if (!dotElement) {
            // Create dot if it doesn't exist
            dotElement = document.createElement('div');
            dotElement.classList.add('map-dot', className); // Add generic and specific class
            this.miniMapContentElement.appendChild(dotElement);
            this.entityDots.set(entityId, dotElement);
        }

        // Update position
        const { x: mapX, y: mapY } = this.getMapCoordinates(entity.x, entity.y);
        dotElement.style.left = `${mapX}px`;
        dotElement.style.top = `${mapY}px`;

        // Ensure dot is visible if entity is active, hide if inactive (if applicable)
        // Example: dotElement.style.display = entity.active ? 'block' : 'none';
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
        this.entityDots.forEach(dot => dot.remove());
        this.entityDots.clear();
    }

    // Method to remove dots whose entities no longer exist
    cleanupDots(activeEntitiesMap) { // activeEntitiesMap should map entityId -> entity
        const dotsToRemove = [];
        this.entityDots.forEach((dotElement, entityId) => {
            if (!activeEntitiesMap.has(entityId)) {
                dotsToRemove.push(entityId);
            }
        });

        dotsToRemove.forEach(entityId => {
            this.removeDot({ id: entityId }); // Pass a dummy object with id or the original entity if stored differently
        });
    }


    update() {
        if (!this.miniMapElement || this.miniMapElement.style.display === 'none') {
            return; // Don't update if hidden
        }

        // Read dimensions once after the element is potentially visible
        if (!this._dimensionsRead && this.miniMapElement.offsetWidth > 0) {
            this.mapWidth = this.miniMapElement.offsetWidth;
            this.mapHeight = this.miniMapElement.offsetHeight;
            this._dimensionsRead = true;
            // console.log(`MiniMap dimensions read: ${this.mapWidth}x${this.mapHeight}`);
        }

        // Don't proceed if dimensions are still not valid
        if (!this._dimensionsRead || this.mapWidth <= 0) {
            // console.warn("MiniMap dimensions not yet available.");
            return;
        }

        // --- Update Player ---
        this.updateDot(this.player, 'map-player');

        // --- Update Enemies ---
        const activeEnemies = new Map();
        const enemies = this.sceneContext.enemies || []; // Ensure it's an array
        // console.log(`Minimap Update: Processing ${enemies.length} enemies.`); // Log enemy count
        enemies.forEach(enemy => { // Access enemies from the scene context
             const enemyId = enemy.id || enemy; // Assuming enemies have a unique ID
             if (enemy.state !== 'dead') { // Only update non-dead enemies
                 activeEnemies.set(enemyId, enemy);
                 // Assign different class based on enemy type
                 const dotClass = 'map-enemy'; // Always use map-enemy now
                 this.updateDot(enemy, dotClass);
             }
        });

        // --- Update Plasma ---
        const activePlasma = new Map();
         // Use sceneContext to call getPlasmas
         if (this.sceneContext && typeof this.sceneContext.getPlasmas === 'function') {
            const plasmas = this.sceneContext.getPlasmas() || []; // Ensure it's an array
            // console.log(`Minimap Update: Processing ${plasmas.length} plasmas.`); // Log plasma count
            plasmas.forEach(plasma => {
                const plasmaId = plasma.id || plasma; // Assuming plasma has a unique ID
                 if (plasma.health > 0) { // Assuming health > 0 means active
                    activePlasma.set(plasmaId, plasma);
                    this.updateDot(plasma, 'map-plasma');
                 }
            });
         } else {
             // console.warn("SceneContext or getPlasmas method not available.");
         }


        // --- Cleanup removed entities ---
        // Combine all active entities into one map for cleanup check
        const allActiveEntities = new Map([
            [this.player.id || this.player, this.player],
            ...activeEnemies,
            ...activePlasma
        ]);
        this.cleanupDots(allActiveEntities);

        // --- Update Regions (Optional) ---
        // If regions change dynamically or need updates
        // this.updateRegions();
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
}