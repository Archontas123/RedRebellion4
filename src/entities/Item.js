// entities/Item.js
import { Entity } from './Entity.js';

class Item extends Entity {
    constructor(x, y, options = {}) {
        // Default item options
        const itemOptions = {
            type: 'item',
            gravity: options.gravity || 0, // Items might not be affected by gravity by default
            friction: options.friction || 0.98, // Slight friction
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 16, height: 16 }, // Example size
            sprite: options.sprite || null, // Allow passing a sprite
            animations: options.animations || {}, // Allow passing animations
            ...options, // Allow overriding defaults
        };

        super(x, y, itemOptions);

        // Bobbing properties
        this.bobbingEnabled = options.bobbingEnabled !== undefined ? options.bobbingEnabled : true; // Enable by default
        this.bobbingAmplitude = options.bobbingAmplitude || 2; // Pixels to move up/down
        this.bobbingSpeed = options.bobbingSpeed || 2; // Controls frequency of bobbing
        this.bobbingPhase = Math.random() * Math.PI * 2; // Start at a random point in the cycle
        this.baseY = y; // Store the original y position to bob around
    }

    update(deltaTime) {
        // Call the parent update first for basic physics, state, animation updates
        // Note: If the parent's update modifies y based on velocityY,
        // the bobbing might interfere or combine with it.
        // We reset velocityY each frame for pure bobbing.
        this.velocityY = 0; // Reset vertical velocity if only bobbing controls it
        super.update(deltaTime); // Apply friction, update animation frame etc.

        if (this.bobbingEnabled && this.state !== 'dead') {
            // Calculate bobbing offset using a sine wave
            this.bobbingPhase += this.bobbingSpeed * deltaTime;
            const bobOffset = Math.sin(this.bobbingPhase) * this.bobbingAmplitude;

            // Apply the bobbing offset relative to the base Y position
            // We directly set 'y' instead of using velocity to avoid conflict with gravity/other forces
            // if they were enabled on the item.
            this.y = this.baseY + bobOffset;
        }

        // If you wanted frame-based bobbing animation, you would ensure
        // a 'bobbing' animation is defined in this.animations and set:
        // if (this.state === 'idle' || this.state === 'moving') { // Or appropriate states
        //     this.setAnimation('bobbing');
        // }
        // The parent's updateAnimation call in super.update() would handle the frame switching.
    }

    // Method called by the Player when collision occurs
    collect(player) {
        console.log(`Item ${this.id} collected by Player ${player.id}`);
        // Placeholder logic:
        // - Add item to player inventory (future)
        // - Increase score (future)
        // - Play sound effect (future)

        // Mark the item as 'dead' so it can be removed
        this.setState('dead');
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
        super.onDeath(); // Call parent onDeath if needed
        console.log(`Item ${this.id} collected or destroyed.`);
        // Add logic here to remove the item from the game world/scene
    }
}

// Export the class if using modules
export { Item };