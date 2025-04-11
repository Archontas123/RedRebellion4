export class InputHandler {
    constructor() {
        this.keys = new Set();
        this.justPressed = new Set();
        this.lastKeys = new Set();

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    _onKeyDown(e) {
        this.keys.add(e.code);
    }

    _onKeyUp(e) {
        this.keys.delete(e.code);
    }

    // Call this at the beginning of each game loop update
    update() {
        this.justPressed.clear();
        for (const key of this.keys) {
            if (!this.lastKeys.has(key)) {
                this.justPressed.add(key);
            }
        }
        // Update lastKeys *after* checking for justPressed
        this.lastKeys = new Set(this.keys);
    }

    isDown(keyCode) {
        return this.keys.has(keyCode);
    }

    wasPressed(keyCode) {
        return this.justPressed.has(keyCode);
    }

    // Clean up event listeners when the handler is no longer needed
    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}