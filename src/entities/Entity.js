let nextEntityId = 0; // Simple counter for unique IDs

class Entity {
    constructor(x, y, options = {}) {
        // Core properties
        this.id = nextEntityId++;
        this.type = options.type || 'generic'; // e.g., 'player', 'enemy', 'item'
        this.x = x;
        this.y = y;
        this.velocityX = 0;
        this.velocityY = 0;

        // Physics properties
        this.accelerationX = 0;
        this.accelerationY = 0;
        this.friction = options.friction || 0.95; // Multiplier applied each frame
        this.gravity = options.gravity || 0; // Added to vertical velocity each frame
        this.maxVelocityX = options.maxVelocityX || 500; // Max speed horizontally
        this.maxVelocityY = options.maxVelocityY || 500; // Max speed vertically

        // Health properties
        this.maxHealth = options.maxHealth || 100;
        this.health = options.health || this.maxHealth;

        // State management
        this.state = options.state || 'idle'; // e.g., 'idle', 'moving', 'attacking', 'dead'

        // Collision properties
        // Default bounds, can be overridden by sprite/animation later
        this.collisionBounds = options.collisionBounds || { x: 0, y: 0, width: 10, height: 10 };

        // Sprite and Animation properties
        this.sprite = options.sprite || null; // A single static image (Image object)
        this.animations = options.animations || {}; // { 'idle': { frames: [img1, img2], speed: 0.1 }, 'run': {...} }
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.setAnimation(this.state); // Try setting initial animation based on state

        // Ensure collision bounds match sprite/animation if provided
        this.updateBoundsFromSprite();
    }

    // --- Health Methods ---
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.setState('dead');
            this.onDeath(); // Callback for death logic
        }
    }

    heal(amount) {
        this.health += amount;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    onDeath() {
        // Placeholder for death logic (e.g., remove entity, play animation)
        console.log(`Entity ${this.id} (${this.type}) died.`);
        // Often you'd set velocity to 0 or trigger a death animation here
        this.velocityX = 0;
        this.velocityY = 0;
        this.accelerationX = 0;
        this.accelerationY = 0;
    }

    // --- State Management ---
    setState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.setAnimation(newState); // Update animation when state changes
            // Add any other logic needed on state change
        }
    }

    // --- Animation Methods ---
    setAnimation(animationName) {
        if (this.animations[animationName] && this.currentAnimation !== this.animations[animationName]) {
            this.currentAnimation = this.animations[animationName];
            this.currentFrame = 0;
            this.frameTimer = 0;
            this.updateBoundsFromSprite(); // Update bounds if animation changes size
        } else if (!this.animations[animationName]) {
             // If the requested animation doesn't exist, maybe default to idle or clear it
             if (this.animations['idle']) {
                 this.setAnimation('idle');
             } else {
                 this.currentAnimation = null; // No animation found
             }
        }
    }

    updateAnimation(deltaTime) {
        if (!this.currentAnimation || !this.currentAnimation.frames || this.currentAnimation.frames.length === 0) {
            return; // No animation to update
        }

        this.frameTimer += deltaTime;
        const frameDuration = 1 / (this.currentAnimation.speed || 10); // Default speed: 10 fps

        if (this.frameTimer >= frameDuration) {
            this.frameTimer -= frameDuration; // Reset timer, keeping leftover time
            this.currentFrame = (this.currentFrame + 1) % this.currentAnimation.frames.length;
            this.updateBoundsFromSprite(); // Update bounds if frame size changes (less common)
        }
    }

    updateBoundsFromSprite() {
        let width = this.collisionBounds.width;
        let height = this.collisionBounds.height;

        if (this.currentAnimation && this.currentAnimation.frames && this.currentAnimation.frames[this.currentFrame]) {
            const frame = this.currentAnimation.frames[this.currentFrame];
            // Assuming frames are Image objects or have width/height properties
            if (frame.width && frame.height) {
                width = frame.width;
                height = frame.height;
            }
        } else if (this.sprite && this.sprite.width && this.sprite.height) {
            width = this.sprite.width;
            height = this.sprite.height;
        }

        // Update collision bounds size (keeping offset relative to x,y)
        this.collisionBounds.width = width;
        this.collisionBounds.height = height;
        // You might want to adjust collisionBounds.x/y here too if the origin isn't top-left
    }


    // --- Physics and Update ---
    update(deltaTime) {
        if (this.state === 'dead') return; // Don't update physics if dead

        // Apply acceleration
        this.velocityX += this.accelerationX * deltaTime;
        this.velocityY += this.accelerationY * deltaTime;

        // Apply gravity
        this.velocityY += this.gravity * deltaTime;

        // Apply friction (basic damping)
        this.velocityX *= Math.pow(this.friction, deltaTime * 60); // Scale friction effect by frame rate
        this.velocityY *= Math.pow(this.friction, deltaTime * 60);

        // Clamp velocity
        this.velocityX = Math.max(-this.maxVelocityX, Math.min(this.maxVelocityX, this.velocityX));
        this.velocityY = Math.max(-this.maxVelocityY, Math.min(this.maxVelocityY, this.velocityY));

        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Update state based on movement (simple example)
        if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
             if (this.state === 'idle') this.setState('moving');
        } else {
             if (this.state === 'moving') this.setState('idle');
             // Stop tiny movements
             // Stop tiny movements (Let friction handle this now)
             // this.velocityX = 0;
             // this.velocityY = 0;
        }

        // Update animation
        this.updateAnimation(deltaTime);

        // Update collision bounds position (relative offset is handled in constructor/updateBounds)
        // The bounds position is now implicitly this.x + this.collisionBounds.x, etc.
        // No need to update this.collisionBounds.x/y here unless your origin changes
    }

    // --- Collision Methods ---
    checkCollision(otherEntity, deltaTime) {
        if (this.state === 'dead' || otherEntity.state === 'dead') return false;

        // Calculate the movement vector for this frame
        const moveX = this.velocityX * deltaTime;
        const moveY = this.velocityY * deltaTime;

        // Use current position for overlap check first (simpler than full raycast if already overlapping)
        const bounds = this.getAbsoluteBounds();
        const otherBounds = otherEntity.getAbsoluteBounds();

        // Simple AABB overlap check
        const overlap = bounds.x < otherBounds.x + otherBounds.width &&
                        bounds.x + bounds.width > otherBounds.x &&
                        bounds.y < otherBounds.y + otherBounds.height &&
                        bounds.y + bounds.height > otherBounds.y;

        if (overlap) {
            return true; // Already overlapping
        }

        // If not overlapping and not moving, no collision via movement
        if (moveX === 0 && moveY === 0) return false;

        // --- Ray casting (optional refinement, AABB might be sufficient) ---
        // Define the ray (movement segment) from the entity's center
        const rayStartX = bounds.x + bounds.width / 2;
        const rayStartY = bounds.y + bounds.height / 2;
        const rayEndX = rayStartX + moveX;
        const rayEndY = rayStartY + moveY;

        // Check if the movement ray intersects any of the four sides of the other AABB
        if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x, otherBounds.y, otherBounds.x, otherBounds.y + otherBounds.height)) return true; // Left edge
        if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x + otherBounds.width, otherBounds.y, otherBounds.x + otherBounds.width, otherBounds.y + otherBounds.height)) return true; // Right edge
        if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x, otherBounds.y, otherBounds.x + otherBounds.width, otherBounds.y)) return true; // Top edge
        if (this.lineIntersect(rayStartX, rayStartY, rayEndX, rayEndY, otherBounds.x, otherBounds.y + otherBounds.height, otherBounds.x + otherBounds.width, otherBounds.y + otherBounds.height)) return true; // Bottom edge

        return false; // No collision detected
    }

    handleCollision(otherEntity) {
        // Placeholder for collision response logic
        // This should be overridden by subclasses (Player, Enemy, etc.)
        console.log(`Entity ${this.id} (${this.type}) collided with ${otherEntity.id} (${otherEntity.type})`);

        // Example basic response: Stop movement towards the other entity
        // This is very basic and often needs more sophisticated resolution
        // based on the direction of collision.
        // this.velocityX = 0;
        // this.velocityY = 0;
    }

    // Helper to get absolute bounds position
    getAbsoluteBounds() {
        return {
            x: this.x + this.collisionBounds.x,
            y: this.y + this.collisionBounds.y,
            width: this.collisionBounds.width,
            height: this.collisionBounds.height
        };
    }

    // Helper function for line segment intersection
    lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (den === 0) return false; // Parallel
        const t = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
        const u = -((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    // --- Drawing ---
    draw(context) {
        if (this.state === 'dead' && !(this.currentAnimation && this.currentAnimation.name === 'death')) {
             // Optionally hide if dead and no death animation playing
             // return;
        }

        let drawn = false;
        // Try drawing animation frame
        if (this.currentAnimation && this.currentAnimation.frames && this.currentAnimation.frames.length > 0) {
            const frame = this.currentAnimation.frames[this.currentFrame];
            if (frame) {
                // Assuming frame is an Image object or similar drawable
                // Adjust drawing position if sprite origin isn't top-left
                context.drawImage(frame, this.x, this.y, frame.width, frame.height);
                drawn = true;
            }
        }

        // Fallback to static sprite if no animation frame drawn
        if (!drawn && this.sprite) {
             context.drawImage(this.sprite, this.x, this.y, this.sprite.width, this.sprite.height);
             drawn = true;
        }

        // Fallback to basic rectangle if no sprite/animation drawn
        if (!drawn) {
            context.fillStyle = 'grey'; // Fallback color
            const bounds = this.getAbsoluteBounds(); // Draw using absolute bounds
            context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

             // Draw velocity vector for debugging
             context.strokeStyle = 'blue';
             context.beginPath();
             context.moveTo(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
             context.lineTo(bounds.x + bounds.width / 2 + this.velocityX * 0.1, bounds.y + bounds.height / 2 + this.velocityY * 0.1); // Scale vector for visibility
             context.stroke();
        }

        // Optional: Draw collision bounds for debugging
        // context.strokeStyle = 'lime';
        // context.strokeRect(this.getAbsoluteBounds().x, this.getAbsoluteBounds().y, this.getAbsoluteBounds().width, this.getAbsoluteBounds().height);
    }
}

// Export the class if using modules (adjust based on your project setup)
export { Entity }; // Use named export