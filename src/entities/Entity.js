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

        // Status Effects
        this.isStunned = false;
        this.stunTimer = 0;
        this.isFlashing = false;
        this.flashTimer = 0;
        this.flashColor = 'white'; // Default flash color

        // Collision properties
        // Default bounds, can be overridden by sprite/animation later
        this.collisionBounds = options.collisionBounds || { x: 0, y: 0, width: 10, height: 10 };

        // Sprite and Animation properties
        this.sprite = null; // Will be loaded by loadSprite
        this.spritePath = options.spritePath || null; // Path to the sprite image
        this.spriteLoaded = false;
        this.spriteWidth = options.width || 10; // Default width
        this.spriteHeight = options.height || 10; // Default height
        this.animations = options.animations || {}; // { 'idle': { frames: [img1, img2], speed: 0.1 }, 'run': {...} }
        this.currentAnimation = null;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.setAnimation(this.state); // Try setting initial animation based on state

        // Ensure collision bounds match sprite/animation if provided
        // Visual properties
        this.color = options.color || 'grey'; // Default fallback color

        // Load sprite if path provided
        if (this.spritePath) {
            this.loadSprite(this.spritePath);
        } else {
            // If no sprite path, use default bounds immediately
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
            this.updateBoundsFromSize(); // Update bounds based on loaded sprite size
            console.log(`Sprite loaded: ${path} (${this.spriteWidth}x${this.spriteHeight}) for Entity ${this.id}`);
        };
        this.sprite.onerror = () => {
            console.error(`Failed to load sprite: ${path} for Entity ${this.id}`);
            this.spriteLoaded = false;
            // Fallback to default size if loading fails
            this.updateBoundsFromSize();
        };
        this.sprite.src = path;
    }

    // --- Health Methods ---
    takeDamage(amount) {
        if (this.state === 'dead') return; // Cannot damage dead entities

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.setState('dead');
            this.onDeath(); // Callback for death logic
        } else {
            // Optional: Trigger a brief flash on taking damage
            this.flash('red', 0.1);
        }
    }

    heal(amount) {
        if (this.state === 'dead') return; // Cannot heal dead entities

        this.health += amount;
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    onDeath() {
        // Placeholder for death logic (e.g., remove entity, play animation)
        console.log(`Entity ${this.id} (${this.type}) died.`);
        this.setState('dead'); // Ensure state is set on death
        // Often you'd set velocity to 0 or trigger a death animation here
        this.velocityX = 0;
        this.velocityY = 0;
        this.accelerationX = 0;
        this.accelerationY = 0;
        this.isStunned = false; // Clear stun on death
        this.isFlashing = false; // Clear flash on death
    }

    // --- State Management ---
    setState(newState) {
        if (this.state !== newState && this.state !== 'dead') { // Don't change state if dead
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
        this.updateBoundsFromSize(); // Update bounds if frame size changes (less common)
        }
    }

    // Renamed and simplified: Update bounds based on spriteWidth/spriteHeight
    updateBoundsFromSize() {
        // Update collision bounds size (keeping offset relative to x,y)
        // Use the stored spriteWidth/Height which might come from options or loaded sprite
        this.collisionBounds.width = this.spriteWidth;
        this.collisionBounds.height = this.spriteHeight;
        // Center the collision bounds by default
        this.collisionBounds.x = -this.spriteWidth / 2;
        this.collisionBounds.y = -this.spriteHeight / 2;
    }


    // --- Physics and Update ---
    update(deltaTime) {
        if (this.state === 'dead') return; // Don't update physics if dead

        // Update Status Effects
        this.updateStun(deltaTime);
        this.updateFlash(deltaTime);

        // Apply physics only if not stunned
        if (!this.isStunned) {
            // Apply acceleration
            this.velocityX += this.accelerationX * deltaTime;
            this.velocityY += this.accelerationY * deltaTime;

            // Apply gravity
            this.velocityY += this.gravity * deltaTime;

            // Apply friction (basic damping)
            this.velocityX *= Math.pow(this.friction, deltaTime * 60); // Scale friction effect by frame rate
            this.velocityY *= Math.pow(this.friction, deltaTime * 60);
            if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) { // Only log if moving significantly
            }

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
                 // Stop tiny movements (Let friction handle this now)
            }
        } else {
            // If stunned, apply friction more aggressively to stop movement quickly
            this.velocityX *= Math.pow(0.5, deltaTime * 60); // Faster stop
            this.velocityY *= Math.pow(0.5, deltaTime * 60);
            // Update position based on residual velocity
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
        }


        // Update animation regardless of stun state (e.g., for hit/stun animation)
        this.updateAnimation(deltaTime);

        // Update collision bounds position (relative offset is handled in constructor/updateBounds)
        // The bounds position is now implicitly this.x + this.collisionBounds.x, etc.
    }

    // --- Status Effect Methods ---

    applyKnockback(directionX, directionY, force) {
        if (this.state === 'dead') return;

        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        if (length > 0) {
            const normalizedX = directionX / length;
            const normalizedY = directionY / length;
            // Apply as an impulse (instant velocity change)
            this.velocityX += normalizedX * force;
            this.velocityY += normalizedY * force;
            console.log(`[Knockback Applied] ID: ${this.id}, Force: ${force}, New Vel: (${this.velocityX.toFixed(2)}, ${this.velocityY.toFixed(2)})`);
        }
    }

    stun(duration) {
        if (this.state === 'dead') return;

        this.isStunned = true;
        this.stunTimer = Math.max(this.stunTimer, duration); // Take the longer duration if already stunned
        console.log(`Stunned ${this.id} for ${duration}s`);
        this.flash('white', duration); // Add a white flash for the duration of the stun
        // Optionally set state to 'stunned' if you have specific animations/logic
        // this.setState('stunned');
    }

    updateStun(deltaTime) {
        if (this.isStunned) {
            this.stunTimer -= deltaTime;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
                this.stunTimer = 0;
                console.log(`Stun ended for ${this.id}`);
                // Optionally revert state if you used a 'stunned' state
                // if (this.state === 'stunned') this.setState('idle');
            }
        }
    }

// Enhanced flash method for better visual feedback
flash(color, duration) {
    if (this.state === 'dead') return;

    this.isFlashing = true;
    this.flashColor = color;
    this.flashTimer = Math.max(this.flashTimer, duration); // Extend flash if already flashing
    
    // Enhanced flash properties
    this.flashIntensity = 1.0; // Start at full intensity
    this.flashDecayRate = 1.0 / duration; // Decay over the duration
    
    // Store original color for gradual return
    this.originalColor = this.originalColor || null;
}

// Update flash with decay for smoother transitions
updateFlash(deltaTime) {
    if (this.isFlashing) {
        this.flashTimer -= deltaTime;
        
        // Update flash intensity for smooth fade out
        if (this.flashIntensity > 0) {
            this.flashIntensity = Math.max(0, this.flashIntensity - (this.flashDecayRate * deltaTime));
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
        // console.log(`Entity ${this.id} (${this.type}) collided with ${otherEntity.id} (${otherEntity.type})`);

        // Example basic response: Stop movement towards the other entity
        // This is very basic and often needs more sophisticated resolution
        // based on the direction of collision.
        // this.velocityX = 0;
        // this.velocityY = 0;
    }

    // Helper to get absolute bounds position (centered based on x,y)
    getAbsoluteBounds() {
        // Assumes collisionBounds x/y are offsets from the center (this.x, this.y)
        return {
            x: this.x + this.collisionBounds.x, // x - width/2
            y: this.y + this.collisionBounds.y, // y - height/2
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
// Updated draw method for sprites, size increase, and image smoothing
draw(context) {
    if (this.state === 'dead' && !(this.currentAnimation && this.currentAnimation.name === 'death')) {
        // Optionally hide if dead and no death animation playing
        // return;
    }

    let drawn = false;
    // Reverted: Scaling is handled by Phaser GameObject's setScale method
    const drawWidth = this.spriteWidth; // Use natural width
    const drawHeight = this.spriteHeight; // Use natural height
    const drawX = this.x - drawWidth / 2; // Center the drawing at this.x
    const drawY = this.y - drawHeight / 2; // Center the drawing at this.y

    // --- Draw Enhanced Shadow ---
    // This shadow logic might not be used if Phaser handles shadows separately
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.beginPath();
    context.ellipse(
        this.x,                         // Center X of entity
        this.y + drawHeight * 0.4,      // Slightly below the entity center (using natural height)
        drawWidth / 2 * 0.8,            // Radius X based on natural width
        drawHeight / 4,                 // Radius Y based on natural height (flattened)
        0, 0, Math.PI * 2
    );
    context.fill();
    // --- End Draw Shadow ---

    // Disable image smoothing for pixel art
    context.imageSmoothingEnabled = false;

    // Try drawing animation frame
    if (this.currentAnimation && this.currentAnimation.frames && this.currentAnimation.frames.length > 0) {
        const frame = this.currentAnimation.frames[this.currentFrame];
        if (frame && frame.width && frame.height) { // Check if frame is valid image/canvas
            context.drawImage(frame, drawX, drawY, drawWidth, drawHeight);
            drawn = true;
        }
    }

    // Fallback to static sprite if no animation frame drawn or sprite is loaded
    if (!drawn && this.spriteLoaded && this.sprite) {
        context.drawImage(this.sprite, drawX, drawY, drawWidth, drawHeight);
        drawn = true;
    }

    // Fallback to basic rectangle if no sprite/animation drawn
    if (!drawn) {
        const bounds = this.getAbsoluteBounds(); // Use bounds for fallback rectangle
        context.fillStyle = this.color;
        context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height); // Use original bounds size for fallback

        // Draw velocity vector for debugging (optional)
        // context.strokeStyle = 'blue';
        // context.beginPath();
        // context.moveTo(this.x, this.y);
        // context.lineTo(this.x + this.velocityX * 0.1, this.y + this.velocityY * 0.1);
        // context.stroke();
    }

    // Re-enable image smoothing if needed elsewhere (optional, depends on game style)
    // context.imageSmoothingEnabled = true;

    // Draw enhanced flash effect if active
    if (this.isFlashing) {
        context.save();
        
        // Enhanced flash effect with intensity fade
        context.globalAlpha = 0.75 * this.flashIntensity;
        context.fillStyle = this.flashColor;
        context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        
        // Add a subtle glow/outline during flash
        context.globalAlpha = 0.5 * this.flashIntensity;
        context.lineWidth = 3;
        context.strokeStyle = this.flashColor;
        context.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
        
        context.restore(); // Restore context state
    }

    // --- Draw Stun Effect (if stunned) ---
    if (this.isStunned) {
        context.save();
        
        // Calculate positions for stars/swirls
        const centerX = bounds.x + bounds.width / 2;
        const topY = bounds.y - 15;
        const currentTime = Date.now() / 1000;
        const starCount = 3;
        
        // Draw stars that orbit around the entity's head
        for (let i = 0; i < starCount; i++) {
            const angle = currentTime * 2 + (i * Math.PI * 2 / starCount);
            const starX = centerX + Math.cos(angle) * 12;
            const starY = topY + Math.sin(angle) * 6;
            
            context.fillStyle = 'yellow';
            
            // Draw a simple star
            context.beginPath();
            context.arc(starX, starY, 3, 0, Math.PI * 2);
            context.fill();
        }
        
        context.restore();
    }
}
}

// Export the class if using modules (adjust based on your project setup)
export { Entity }; // Use named export
