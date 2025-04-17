// src/entities/Splitter.js
import { Enemy } from './Enemy.js';

export class Splitter extends Enemy {
    constructor(x, y, options = {}) {
        // Default splitter enemy options, extending base enemy options
        const splitterOptions = {
            type: 'splitter_enemy',
            maxHealth: options.maxHealth || 65, // Slightly more health than regular enemies
            moveSpeed: options.moveSpeed || 70,
            collisionBounds: options.collisionBounds || { x: 0, y: 0, width: 45, height: 45 }, // Slightly larger
            aggressiveness: options.aggressiveness || 0.85, // More aggressive than regular enemies
            damageAmount: options.damageAmount || 15, // More damage than regular enemies
            color: 0x9932CC, // Purple color
            // Track if this is a parent or a child splitter
            isChild: options.isChild || false,
            size: options.size || 1.0, // Full size for parent, smaller for children
            ...options
        };

        super(x, y, splitterOptions);
        
        // Store color for visual updates
        this.color = splitterOptions.color;
        
        // Store size scale factor (1.0 for parent, smaller for children)
        this.size = splitterOptions.size;
        
        // Store isChild flag
        this.isChild = splitterOptions.isChild;
        
        // If this is already a child, it won't split again
        this.canSplit = !this.isChild;
    }

    // Override the onDeath method to create two smaller enemies when killed
    onDeath() {
        super.onDeath(); // Call parent onDeath method first
        
        // Only split if this is not already a child splitter
        if (this.canSplit && this.scene) {
            console.log(`Splitter ${this.id} is splitting into two smaller enemies!`); // Updated log message
            
            // Parameters for child splitters
            const childSize = 0.7; // 70% of parent size
            const childHealth = Math.round(this.maxHealth * 0.6); // 60% of parent health
            const childDamage = Math.round(this.damageAmount * 0.7); // 70% of parent damage
            const childSpeed = this.moveSpeed * 1.3; // 30% faster than parent
            
            // Calculate offset positions for the children (slightly apart from each other)
            const offset = 20; // pixels
            
            // Create first child (offset to the left/up)
            this.createChildSplitter(
                this.x - offset,
                this.y - offset,
                childSize,
                childHealth,
                childDamage,
                childSpeed
            );
            
            // Create second child (offset to the right/down)
            this.createChildSplitter(
                this.x + offset,
                this.y + offset,
                childSize,
                childHealth,
                childDamage,
                childSpeed
            );
            
            // Optional: Add a splitting effect
            this.createSplitEffect();
        }
    }
    
    // Helper method to create a child splitter
    createChildSplitter(x, y, size, health, damage, speed) {
        // Calculate smaller collision bounds based on size
        const childWidth = Math.round(this.collisionBounds.width * size);
        const childHeight = Math.round(this.collisionBounds.height * size);
        
        // Create the child enemy with same scene reference
        const childSplitter = new Splitter(x, y, {
            scene: this.scene,
            isChild: true, // Mark as a child so it won't split again
            size: size,
            maxHealth: health,
            health: health, // Set current health too
            damageAmount: damage,
            moveSpeed: speed,
            collisionBounds: { 
                x: 0, y: 0, 
                width: childWidth, 
                height: childHeight 
            }
        });
        
        // Add the child to both the local and scene enemy arrays
        if (this.scene.enemies) {
            this.scene.enemies.push(childSplitter);
        }
        if (this.scene.enemyManager && this.scene.enemyManager.enemies) {
            this.scene.enemyManager.enemies.push(childSplitter);
        }
        
        return childSplitter;
    }
    
    // Create visual effect for splitting
    createSplitEffect() {
        if (this.scene && typeof this.scene.createSplitEffect === 'function') {
            this.scene.createSplitEffect(this.x, this.y, this.color);
        }
    }
}