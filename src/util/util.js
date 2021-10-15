import url from "url";
import path from "path";

export function fileNameOfModule(meta) {
    return url.fileURLToPath(meta.url);
}

export function dirNameOfModule(meta) {
    return path.dirname(fileNameOfModule(meta));
}

export function safeGet(obj, ...propertyPath) {
    let currentTarget = obj;

    for(const part of propertyPath) {
        if(!(part in currentTarget)) {
            return null;
        }

        currentTarget = currentTarget[part];
    }

    return currentTarget;
}
