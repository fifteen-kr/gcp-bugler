// @ts-check

import fs from "node:fs/promises";
import path from "node:path";
import url from "node:url";

/** @type {string} */
export const STATIC_DIR = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", "static");