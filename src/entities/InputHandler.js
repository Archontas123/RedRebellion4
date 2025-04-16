export class InputHandler {
    constructor(scene) { // Accept the scene reference
        this.scene = scene; // Store the scene reference
        this.keys = new Set();
        this.justPressed = new Set();
        this.lastKeys = new Set();

        // Mouse/Pointer state
        this.isPointerDown = false;
        this.wasPointerPressed = false;
        this.lastPointerDown = false;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);

        // Use scene-specific input listeners
        this.scene.input.keyboard.on('keydown', this._onKeyDown);
        this.scene.input.keyboard.on('keyup', this._onKeyUp);
        this.scene.input.on('pointerdown', this._onPointerDown);
        this.scene.input.on('pointerup', this._onPointerUp);
    }

    _onKeyDown(e) {
        this.keys.add(e.code);
    }

    _onKeyUp(e) {
        this.keys.delete(e.code);
    }

    _onPointerDown(pointer) {
        // Check if it's the left mouse button (button index 0)
        if (pointer.button === 0) {
            this.isPointerDown = true;
        }
    }

    _onPointerUp(pointer) {
        // Check if it's the left mouse button (button index 0)
        if (pointer.button === 0) {
            this.isPointerDown = false;
        }
    }


    // Call this at the beginning of each game loop update
    update() {
        // Keyboard state update
        this.justPressed.clear();
        for (const key of this.keys) {
            if (!this.lastKeys.has(key)) {
                this.justPressed.add(key);
            }
        }
        this.lastKeys = new Set(this.keys);

        // Pointer state update
        this.wasPointerPressed = this.isPointerDown && !this.lastPointerDown;
        this.lastPointerDown = this.isPointerDown;
    }

    isDown(keyCode) {
        return this.keys.has(keyCode);
    }

    wasPressed(keyCode) {
        return this.justPressed.has(keyCode);
    }

    // New methods for pointer state
    isLeftPointerDown() {
        return this.isPointerDown;
    }

    wasLeftPointerPressed() {
        return this.wasPointerPressed;
    }

    // Clean up event listeners when the handler is no longer needed
    destroy() {
        if (this.scene && this.scene.input) { // Check if scene and input exist
            this.scene.input.keyboard.off('keydown', this._onKeyDown);
            this.scene.input.keyboard.off('keyup', this._onKeyUp);
            this.scene.input.off('pointerdown', this._onPointerDown);
            this.scene.input.off('pointerup', this._onPointerUp);
        }
        this.keys.clear();
        this.justPressed.clear();
        this.lastKeys.clear();
        this.isPointerDown = false; // Also reset pointer state
        this.wasPointerPressed = false;
        this.lastPointerDown = false;
    }

    // New method to clear state, typically called when the scene resumes
    clearStateOnResume() {
        this.keys.clear();
        this.justPressed.clear();
        this.lastKeys.clear();
        this.isPointerDown = false;
        this.wasPointerPressed = false;
        this.lastPointerDown = false;
    }
}