import {randomUUID} from "crypto";

export class CallbackManager {
    constructor() {
        this.activeCallbacks = new Map();
    }

    registerCallback(fn, timeoutMs) {
        const expirationMs = Date.now() + timeoutMs;

        const callbackUUID = this.makeCallbackUUID();

        this.activeCallbacks.set(callbackUUID, { callback: fn, expires: expirationMs });
        return callbackUUID;
    }

    invoke(uuid, ...args) {
        const { callback } = this.activeCallbacks.get(uuid);
        this.activeCallbacks.delete(uuid);

        if(callback == null) {
            throw new Error(`Tried to invoke nonexistent callback with UUID ${uuid}`);
        }

        this.performCleanup();

        return callback(...args);
    }

    has(uuid) {
        return this.activeCallbacks.has(uuid);
    }

    makeCallbackUUID() {
        this.performCleanup();

        let callbackUUID;

        do {
            callbackUUID = randomUUID();
        } while (this.activeCallbacks.has(callbackUUID));

        return callbackUUID;
    }

    performCleanup() {
        for(const uuid of this.activeCallbacks.keys()) {
            const { expires } = this.activeCallbacks.get(uuid);

            if(expires >= Date.now()) {
                this.activeCallbacks.delete(uuid);
            }
        }
    }
}
