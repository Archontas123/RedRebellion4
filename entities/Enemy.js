import { Entity } from './Entity.js';

class Enemy extends Entity {
    constructor(x, y, options = {}) {
        // Set default enemy options and merge with provided options
        const enemyOptions = {
            type: 'enemy',
            maxHealth: options.maxHealth || 50, // Default enemy health
            // Add other enemy-specific defaults if needed
            ...options, // Allow overriding defaults
        };

        super(x, y, enemyOptions);

        // Enemy-specific properties can be added here
        this.attackPower = options.attackPower || 10; // Example property
        this.aiState = 'idle'; // Example: 'idle', 'patrolling', 'chasing', 'attacking'
        this.target = null; // Reference to the player or other target
        this.detectionRadius = options.detectionRadius || 150; // How far the enemy can "see"
        this.attackRadius = options.attackRadius || 30; // How close to attack
    }

    // Override update to implement enemy AI and behavior
    update(deltaTime, world) { // Pass world context if needed (e.g., for pathfinding, player reference)
        super.update(deltaTime); // Call base class update for physics, animation

        if (this.state === 'dead') return;

        // --- Basic AI Logic ---
        // Find potential target (e.g., the player)
        // This requires access to the player object, often passed via 'world' or scene context
        if (world && world.player) {
            this.target = world.player; // Simple assignment, could be more complex logic
        } else {
            this.target = null; // No target found
        }

        if (this.target && this.target.state !== 'dead') {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.attackRadius) {
                this.aiState = 'attacking';
                // TODO: Implement attack logic (e.g., trigger attack animation, deal damage)
                this.velocityX = 0; // Stop moving when attacking
                this.velocityY = 0;
                this.setState('attacking'); // Use Entity state for animation
                // console.log(`${this.id} attacking ${this.target.id}`);

            } else if (distance <= this.detectionRadius) {
                this.aiState = 'chasing';
                // Move towards the target
                const angle = Math.atan2(dy, dx);
                const chaseSpeed = 50; // Adjust speed as needed
                this.velocityX = Math.cos(angle) * chaseSpeed;
                this.velocityY = Math.sin(angle) * chaseSpeed;
                this.setState('moving'); // Use Entity state for animation
                // console.log(`${this.id} chasing ${this.target.id}`);

            } else {
                this.aiState = 'idle'; // Target out of range
                // TODO: Implement idle behavior (e.g., patrolling, standing still)
                this.velocityX = 0; // Stop if idle
                this.velocityY = 0;
                 if (this.state !== 'idle') this.setState('idle'); // Use Entity state for animation
            }
        } else {
            this.aiState = 'idle'; // No target or target is dead
             this.velocityX = 0;
             this.velocityY = 0;
             if (this.state !== 'idle') this.setState('idle');
        }

        // --- End Basic AI Logic ---
    }

    // Override handleCollision for enemy-specific interactions
    handleCollision(otherEntity) {
        super.handleCollision(otherEntity); // Call base method if needed

        if (otherEntity.type === 'player') {
            // Example: Enemy bumps into player
            // console.log(`Enemy ${this.id} collided with Player ${otherEntity.id}`);
            // Maybe apply damage if attacking, or just push back
            if (this.aiState === 'attacking') {
                 // Apply damage periodically or on attack animation hit frame
            } else {
                // Simple push back (could be more sophisticated)
                // const pushForce = 5;
                // const dx = this.x - otherEntity.x;
                // const dy = this.y - otherEntity.y;
                // const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                // this.velocityX += (dx / dist) * pushForce;
                // this.velocityY += (dy / dist) * pushForce;
            }
        } else if (otherEntity.type === 'wall' || otherEntity.type === 'obstacle') {
            // Handle collision with environment
            // console.log(`Enemy ${this.id} collided with ${otherEntity.type}`);
            // Basic stop - physics engine might handle this better
            // this.x -= this.velocityX * deltaTime; // Revert position (crude)
            // this.y -= this.velocityY * deltaTime;
            // this.velocityX = 0;
            // this.velocityY = 0;
        }
        // Add more collision cases as needed (e.g., enemy vs enemy, enemy vs item)
    }

    // Override onDeath for specific enemy death behavior
    onDeath() {
        super.onDeath(); // Call base class death logic (e.g., set state)
        console.log(`Enemy ${this.id} has been vanquished!`);
        // Add specific enemy death effects:
        // - Drop loot
        // - Play death sound/animation
        // - Remove from game world (often handled by the scene/manager)
        this.setState('dead'); // Ensure state is set
        // Consider setting a flag or timer for removal instead of immediate disappearance
        // this.isRemovable = true;
    }

    // Example: Specific attack method
    attack(target) {
        if (this.state !== 'dead' && target && target.takeDamage) {
            console.log(`Enemy ${this.id} attacks ${target.id} for ${this.attackPower} damage.`);
            target.takeDamage(this.attackPower);
            // Trigger attack animation, cooldown, etc.
            this.setAnimation('attack'); // Assuming an 'attack' animation exists
        }
    }
}

// Export the class
export { Enemy };