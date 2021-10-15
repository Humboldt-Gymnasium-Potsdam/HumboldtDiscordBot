import * as fs from "fs";
import * as util from "util";

export const constants = fs.constants;

export const readFile = util.promisify(fs.readFile);
export const writeFile = util.promisify(fs.writeFile);

export const access = util.promisify(fs.access);
export const mkdir = util.promisify(fs.mkdir);

export async function exists(path) {
    return await access(path, constants.F_OK).then(() => true).catch(() => false);
}
