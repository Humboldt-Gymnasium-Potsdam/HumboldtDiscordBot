export class AssertionError extends Error {
    constructor(msg) {
        super(msg);
        this.name = "AssertionError";
    }
}

export function assertArgHasValue(v, name) {
    if(v === null) {
        throw new AssertionError(`${name} can't be null`);
    }

    if(v === undefined) {
        throw new AssertionError(`${name} can't be undefined`);
    }
}
