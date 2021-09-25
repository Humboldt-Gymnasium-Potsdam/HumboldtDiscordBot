import * as fs from "./promise_fs.js";

const CONFIG_PATH = "./config.json";
const CONFIG_OVERRIDE_PATH = "./config.override.json";

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
        .then(([config, configOverride]) => Object.assign(config, configOverride));
}
