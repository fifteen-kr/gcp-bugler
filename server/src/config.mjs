//@ts-check

/** @import {Config} from "./config"} */

import fs from "node:fs/promises";
import toml from "toml";

/**
 * @param {string} config_path
 * @returns {Promise<Config>}
 */
export async function readConfig(config_path) {
    const config = await fs.readFile(config_path, "utf-8");
    return toml.parse(config);
}