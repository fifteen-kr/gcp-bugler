//@ts-check

import fs from "node:fs/promises";

/**
 * A simple manager for expiring resources. The expiration time is stored in a file.
 */
export class ExpireTimer {
    /** @type {string|null} */
    file_path = null;

    /** @type {Map<string, number>} */
    expire = new Map();

    /** @type {NodeJS.Timeout|null} */
    #timer_id = null;

    /** @type {((key: string) => void)|null} */
    onExpire = null;

    /** @param {string} file_path */
    async load(file_path) {
        if(this.#timer_id != null) {
            throw new Error("Cannot load while timer is running.");
        }

        try {
            /** @type {Array<[string, number]>} */
            const data = JSON.parse(await fs.readFile(file_path, "utf-8"));
            this.expire = new Map(data);
        } catch(err) {
            if(!(err instanceof Error)) {
                throw err;
            }

            if(!('code' in err) || err.code !== 'ENOENT') {
                throw err;
            }

            this.expire.clear();
        }

        this.file_path = file_path;
    }

    /** @param {string|null} file_path */
    async save(file_path = this.file_path) {
        if (file_path == null) {
            return;
        }

        await fs.writeFile(file_path, JSON.stringify([...this.expire]));
    }

    /**
     * @param {string} key 
     * @param {number} time 
     */
    setExpire(key, time) {
        this.expire.set(key, time);
        void this.save();
    }

    /**
     * @param {string} key 
     */
    clearExpire(key) {
        this.expire.delete(key);
        void this.save();
    }

    start() {
        if (this.#timer_id != null) {
            return;
        }

        this.#timer_id = setInterval(() => this.tick(), 5_000);
    }

    stop() {
        if (this.#timer_id == null) {
            return;
        }

        clearInterval(this.#timer_id);
        this.#timer_id = null;
    }

    tick() {
        const now = Date.now();

        /** @type {string[]} */
        const expired = [];

        for (const [key, time] of this.expire) {
            if (time <= now) {
                expired.push(key);
            }
        }

        if (expired.length === 0) {
            return;
        }

        for (const key of expired) {
            this.expire.delete(key);
            this.onExpire?.(key);
        }

        void this.save();
    }
}