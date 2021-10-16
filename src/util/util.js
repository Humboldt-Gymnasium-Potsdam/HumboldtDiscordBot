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
        if(currentTarget === null || currentTarget === undefined) {
            return null;
        }

        if(!(part in currentTarget)) {
            return null;
        }

        currentTarget = currentTarget[part];
    }

    return currentTarget;
}

export function formatError(error) {
    if (!(error instanceof Error)) {
        return `=> ${error.toString()}`;
    } else {
        if (!error.stack) {
            return `=> ${error.message}`;
        }

        let buffer = `${error.message ?? "<no error message>"}\n`;
        for (const stack of error.stack.split("\n")) {
            buffer += `=> ${stack}\n`;
        }

        return buffer;
    }
}

export function computeArrayPatches(array, patches) {
    const result = {
        add: [],
        remove: []
    };

    for(const {value, belongs} of patches) {
        const isCurrent = value in array;

        if(isCurrent && !belongs) {
            result.remove.push(value);
        } else if(!isCurrent && belongs) {
            result.add.push(value);
        }
    }

    return result;
}
