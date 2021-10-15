import * as fs from "./promiseFs.js";
import {safeGet} from "../util/util.js";

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

export function resolveElevatedPermissionRoles(config, ...permissions) {
    const roles = [];

    for(const permission of permissions) {
        const rolesForPermission = safeGet(config, "roles", "elevatedPermissions", permission);

        if(rolesForPermission !== null) {
            for(const role of rolesForPermission) {
                if(!(role in roles)) {
                    roles.push(role);
                }
            }
        }
    }

    return roles;
}

export function resolveTemplateString(config, ...pathAndArgs) {
    if(pathAndArgs < 2) {
        throw new Error("the path to the config property must consist at least of one segment followed by properties");
    }

    const path = pathAndArgs.slice(0, pathAndArgs.length - 1);
    const properties = pathAndArgs[pathAndArgs.length - 1];

    let template = safeGet(config, ...path);
    if(template === null) {
        return "";
    }

    for(const property of Object.keys(properties)) {
        template = template.replace("${" + property + "}", properties[property]);
    }

    return template;
}
