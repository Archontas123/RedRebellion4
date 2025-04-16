/**
 * Represents a power-up that can be collected by the player.
 */
export default class Powerup {
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
        this.maxStacks = options.maxStacks || 1; // Default to 1 if not provided
        // Duration removed, powerups are infinite and stackable
        // isActive flag is managed by the PowerupManager/Player

        // TODO: Add sprite or visual representation for the power-up
        // this.sprite = scene.add.sprite(x, y, 'powerup-texture'); // Example
        // scene.physics.world.enable(this.sprite);
        // this.sprite.body.setAllowGravity(false);
    }

    /**
     * Activates the power-up effect on the target entity (usually the player).
     * @param {object} target - The entity to apply the power-up effect to.
     */
    activate(target) {
        console.log(`Applying ${this.type} power-up effect`);
        // this.isActive = true; // State managed by the entity holding the powerup

        // Apply specific effect based on type
        // Powerup logic removed. Add new powerup effects here in the future.
        console.warn(`Powerup type "${this.type}" activated, but no specific effect is defined.`);

        // Timer removed, powerups are infinite

        // TODO: Handle power-up collection (e.g., destroy the sprite)
        // this.sprite.destroy();
    }

    // Deactivate method removed as powerups are infinite

    // Optional: Update method if the power-up needs per-frame logic
    // update(time, delta) {
    //     // Update logic
    // }
}