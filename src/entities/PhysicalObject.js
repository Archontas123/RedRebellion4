import { Entity } from './Entity.js';

class PhysicalObject extends Entity {
    constructor(x, y, options = {}) {
        // Default type for physical objects
        options.type = options.type || 'physical_object';

        // Physical objects are typically static, override physics defaults
        options.friction = options.friction !== undefined ? options.friction : 1; // No friction needed
        options.gravity = options.gravity !== undefined ? options.gravity : 0;   // No gravity
        options.maxVelocityX = options.maxVelocityX !== undefined ? options.maxVelocityX : 0;
        options.maxVelocityY = options.maxVelocityY !== undefined ? options.maxVelocityY : 0;

        // Call the parent constructor
        super(x, y, options);

        // Physical objects don't typically have health or complex states
        delete this.maxHealth;
        delete this.health;
        this.state = 'static'; // Simple state

        // Ensure velocity is zero initially
        this.velocityX = 0;
        this.velocityY = 0;
        this.accelerationX = 0;
        this.accelerationY = 0;
    }

    // Override update method - physical objects don't move on their own
    update(deltaTime) {
        // No physics updates needed for static objects
        // We might still update animation if needed, but typically not for walls/obstacles
        // super.updateAnimation(deltaTime); // Uncomment if animated obstacles are needed
    }

    // Override takeDamage - physical objects are usually indestructible
    takeDamage(amount) {
        // Do nothing, or perhaps trigger a visual effect if desired
        // console.log(`PhysicalObject ${this.id} cannot take damage.`);
    }

    // Override heal - doesn't apply
    heal(amount) {
        // Do nothing
    }

    // Override setState - keep it simple
    setState(newState) {
        // Only allow specific states if needed, otherwise keep static
        if (newState === 'static') {
            this.state = newState;
        }
        // Do not call setAnimation automatically unless needed
    }

     // Override onDeath - doesn't apply
     onDeath() {
        // Do nothing
     }

    // Collision handling might be relevant (e.g., stopping other entities)
    // but the default Entity.handleCollision might suffice or need specific logic
    // handleCollision(otherEntity) {
    //     super.handleCollision(otherEntity); // Call parent or implement specific logic
    //     console.log(`PhysicalObject ${this.id} specific collision logic with ${otherEntity.type}`);
    // }

    // Drawing is inherited from Entity, which should work fine
    // draw(context) {
    //     super.draw(context);
    // }
}

// Export if using modules
export { PhysicalObject };