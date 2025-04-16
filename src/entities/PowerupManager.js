/**
 * Manages active power-ups for a target entity (e.g., the player).
 */
export default class PowerupManager {
    /**
     * Creates a new PowerupManager instance.
     * @param {Phaser.Scene} scene - The scene this manager belongs to.
     * @param {object} target - The entity whose power-ups are being managed (e.g., Player instance).
     */
    constructor(scene, target) {
        this.scene = scene;
        this.target = target;
        // Store active powerups with their instance and stack count
        this.activePowerups = new Map(); // Map<string, { instance: Powerup, stacks: number }>
    }

    /**
     * Adds and activates a power-up for the target.
     * If a power-up of the same type is already active and stackable, increments the stack count.
     * @param {Powerup} powerup - The Powerup instance to add.
     */
    addPowerup(powerup) {
        const type = powerup.type;
        const maxStacks = powerup.maxStacks || 1; // Default to 1 if not specified

        let currentPowerupData = this.activePowerups.get(type);

        if (currentPowerupData) {
            // Powerup exists, check if stackable and not at max stacks
            if (maxStacks > 1 && currentPowerupData.stacks < maxStacks) {
                currentPowerupData.stacks++;
                console.log(`Stacked ${type} power-up. Current stacks: ${currentPowerupData.stacks}`);
                // Re-apply effect with new stack count
                this.applyEffect(type, currentPowerupData.stacks);
            } else if (maxStacks === 1) {
                console.log(`${type} power-up is not stackable or already active.`);
                // Optionally refresh something if needed for non-stackable infinite powerups?
            } else {
                 console.log(`${type} power-up is already at max stacks (${maxStacks}).`);
            }
        } else {
            // New powerup
            currentPowerupData = { instance: powerup, stacks: 1 };
            this.activePowerups.set(type, currentPowerupData);
            console.log(`Activated ${type} power-up. Stacks: 1`);
            // Apply effect for the first time
            this.applyEffect(type, 1);
        }
        // No timer logic needed for infinite powerups
    }
     /**
      * Applies the effect of a powerup based on its type and stack count.
      * @param {string} type - The type of the powerup.
      * @param {number} stacks - The current number of stacks.
      */
     applyEffect(type, stacks) {
         switch (type) {
             case 'speed_boost':
                 // We need access to the target (Player) to modify its speed
                 if (this.target && typeof this.target.updateSpeed === 'function') {
                     this.target.updateSpeed(stacks); // Pass the stack count to the player
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
             case 'health_increase':
                 if (this.target && typeof this.target.updateMaxHealth === 'function') {
                     this.target.updateMaxHealth(stacks); // Pass stack count
                 } else {
                      console.error("Target does not have an updateMaxHealth method.");
                 }
                 break;
                 break;
             // Add cases for other powerup types here
             default:
                 // Use the generic activate method from the powerup instance if specific logic isn't here
                 const powerupData = this.activePowerups.get(type);
                 if (powerupData && stacks === 1) { // Only call activate once on initial application
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
             case 'speed_boost':
                 if (this.target && typeof this.target.updateSpeed === 'function') {
                     this.target.updateSpeed(0); // Reset speed boost by passing 0 stacks
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
            case 'health_increase':
                 if (this.target && typeof this.target.updateMaxHealth === 'function') {
                     this.target.updateMaxHealth(0); // Reset health increase
                 }
                 break;
             // Add cases for other powerup types here
             default:
                 // Use the generic deactivate method from the powerup instance if available
                 const powerupData = this.activePowerups.get(type);
                 if (powerupData && typeof powerupData.instance.deactivate === 'function') {
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
            // Reset the effect before removing
            this.resetEffect(type);

            this.activePowerups.delete(type);
            // No timer to delete
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
        // Currently no per-frame logic needed here as powerups are infinite
        // and effects are applied on add/remove.
    }

    /**
    * Cleans up all active powerups and timers. Useful when the target is destroyed or the scene ends.
    */
    destroy() {
        // Reset effects and deactivate all remaining powerups
        this.activePowerups.forEach((powerupData, type) => {
            this.resetEffect(type);
            console.log(`Resetting effect for ${type} on destroy.`);
        });
        this.activePowerups.clear();
        // No timers to clear

        console.log("PowerupManager destroyed and cleaned up.");
    }
}