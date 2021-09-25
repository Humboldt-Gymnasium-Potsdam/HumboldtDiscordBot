import * as fs from "./promise_fs.js";

const CONFIG_PATH = "./config.json";
const CONFIG_OVERRIDE_PATH = "./config.override.json";

function merge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object) {
            Object.assign(source[key], merge(target[key], source[key]));
        }
    }

    Object.assign(target || {}, source);
    return target;
}

function readJson(path) {
    return fs.readFile(path).then((buffer) => JSON.parse(buffer.toString("utf-8")));
}

function loadJsonOrEmpty(path) {
    return fs.exists(path).then((doesExist) => doesExist ? readJson(path) : {});
}

export function loadBotConfig() {
    const configPromise = loadJsonOrEmpty(CONFIG_PATH);
    const configOverridePromise = loadJsonOrEmpty(CONFIG_OVERRIDE_PATH);

    return Promise.all([configPromise, configOverridePromise])
        .then(([config, configOverride]) => merge(config, configOverride));
}
