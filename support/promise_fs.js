import * as fs from "fs";
import * as util from "util";

export const constants = fs.constants;

export const readFile = util.promisify(fs.readFile);
export const access = util.promisify(fs.access);

export async function exists(path) {
    return await access(path, constants.F_OK);
}
