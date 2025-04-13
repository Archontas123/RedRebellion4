import { Item } from './Item.js';

export class Plasma extends Item {
    constructor(x, y, options = {}) {
        // Default plasma options
        const plasmaOptions = {
            type: 'plasma', // Specific type identifier for collision handling
            bobbingAmplitude: 8, // Increased bobbing amplitude (8 pixels up/down)
            bobbingSpeed: 2.5, // Moderate bobbing speed
            friction: 1, // No friction, just bob in place
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 24, height: 24 }, // Slightly bigger than default
            // Override any provided options
            ...options
        };

        super(x, y, plasmaOptions);
        
        // Plasma-specific properties
        this.glowIntensity = 1.0; // Full intensity to start
        this.glowDirection = 1; // 1 for increasing, -1 for decreasing
        this.glowSpeed = 0.5; // How quickly the glow pulses
        
        // Plasma collection value (could be randomized)
        this.value = options.value || 1; // Default to 1, could be more for special enemies
    }

    // Override update to add pulsing glow effect
    update(deltaTime) {
        // Call parent update for basic physics & bobbing
        super.update(deltaTime);
        
        // Update glow intensity for pulsing effect
        this.glowIntensity += this.glowDirection * this.glowSpeed * deltaTime;
        
        // Clamp and reverse at the extremes
        if (this.glowIntensity >= 1.0) {
            this.glowIntensity = 1.0;
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0.6) { // Don't go completely dark
            this.glowIntensity = 0.6;
            this.glowDirection = 1;
        }
    }

    // Override collect to apply plasma-specific collection logic
    collect(player) {
        console.log(`Plasma collected by Player ${player.id}`);
        
        // If the player has a plasmaCount property, increment it
        if (player.hasOwnProperty('plasmaCount')) {
            player.plasmaCount += this.value;
        }
        
        // Mark the item as 'dead' and set health to 0 for removal by GameScreen
        this.setState('dead');
        this.health = 0;
        
        // Call parent collect for any shared item collection logic
        super.collect(player);
    }
}