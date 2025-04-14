//@ts-check

/** @import {FastifyInstance} from "fastify" */
/** @import {ServerConfig} from "./config" */

import fs from "node:fs/promises";
import path from "node:path";

import Fastify from "fastify";
import parseDuration  from "parse-duration";
import compute from "@google-cloud/compute";

import { STATIC_DIR } from "./core.mjs";
import { ExpireTimer } from "./expire-timer.mjs";
import { readConfig } from "./config.mjs";

/**
 * @param {{config_path: string; timer_path: string; port: number;}} param0
 * @returns {Promise<FastifyInstance>}
 */
export async function startServer({config_path, timer_path, port}) {
    const expire_timer = new ExpireTimer();

    try {
        if(timer_path) {
            await expire_timer.load(timer_path);
        }
    } catch(e) {}

    const config = await readConfig(config_path);
    const server_config_by_id = new Map((config.servers || []).map((s) => [s.id, s]));

    const computeClient = new compute.InstancesClient();
    
    const INDEX_PAGE = await fs.readFile(path.join(STATIC_DIR, "index.html"), "utf-8");

    const fastify = Fastify({ logger: true });

    /** @param {ServerConfig} server_config */
    const setExpire = (server_config) => {
        const now = Date.now();
        const duration = parseDuration(server_config.duration) ?? 3600_000;

        expire_timer.setExpire(server_config.id, now + duration);
    };

    /** @param {string} server_id */
    const startServer = async (server_id) => {
        fastify.log.info(`Starting server '${server_id}'...`);
        const server_config = server_config_by_id.get(server_id);
        if(!server_config) {
            throw new Error(`Server '${server_id}' not found!`);
        }

        await computeClient.start(server_config.gcp);
        setExpire(server_config);

        fastify.log.info(`Server '${server_id}' has been started.`);
    };

    /** @param {string} server_id */
    const keepAliveServer = async (server_id) => {
        fastify.log.info(`Keeping server '${server_id}' alive...`);
        const server_config = server_config_by_id.get(server_id);
        if(!server_config) {
            throw new Error(`Server '${server_id}' not found!`);
        }

        if(expire_timer.expire.has(server_id)) {
            setExpire(server_config);
        }
    };

    const persistServer = async (server_id) => {
        fastify.log.info(`Persisting server '${server_id}'...`);
        const server_config = server_config_by_id.get(server_id);
        if(!server_config) {
            throw new Error(`Server '${server_id}' not found!`);
        }

        expire_timer.clearExpire(server_id);
        fastify.log.info(`Server '${server_id}' has been persisted.`);
    };

    /** @param {string} server_id */
    const stopServer = async (server_id) => {
        fastify.log.info(`Shutting down server '${server_id}'...`);
        const server_config = server_config_by_id.get(server_id);
        if(!server_config) {
            throw new Error(`Server '${server_id}' not found!`);
        }

        await computeClient.stop(server_config.gcp);
        expire_timer.clearExpire(server_id);

        fastify.log.info(`Server '${server_id}' has been shut down.`);
    };

    expire_timer.onExpire = async (server_id) => {
        await stopServer(server_id).catch((err) => {
            fastify.log.error(err);
        });
    };

    fastify.get("/", async (_req, reply) => {
        reply.header("Content-Type", "text/html");
        reply.send(INDEX_PAGE);
    });
    
    fastify.get("/status", async (req, reply) => {
        const statuses = await Promise.all(
            config.servers.map(async (server) => {
                const expire_time = expire_timer.expire.get(server.id) ?? null;
                return {
                    id: server.id,
                    name: server.name,
                    expire_time,
                };
            })
        );

        reply.status(200).send({servers: statuses});
    });
    
    fastify.post("/start/:server", async (req, reply) => {
        const server_id = (/** @type {{ server: string }} */ (req.params)).server;
        if(!server_config_by_id.has(server_id)) {
            reply.status(404).send({error: `Server not found.`});
            return;
        }

        try {
            await startServer(server_id);
        } catch(err) {
            fastify.log.error(err);
            reply.status(500).send({error: `Failed to start server.`});
            return;
        }

        reply.status(200).send({success: true});
    });
    
    fastify.post("/keep-alive/:server", async (req, reply) => {
        const server_id = (/** @type {{ server: string }} */ (req.params)).server;
        if(!server_config_by_id.has(server_id)) {
            reply.status(404).send({error: `Server not found.`});
            return;
        }

        try {
            await keepAliveServer(server_id);
        } catch(err) {
            fastify.log.error(err);
            reply.status(500).send({error: `Failed to keep server alive.`});
            return;
        }

        reply.status(200).send({success: true});
    });
    
    fastify.post("/persist/:server", async (req, reply) => {
        const server_id = (/** @type {{ server: string }} */ (req.params)).server;
        if(!server_config_by_id.has(server_id)) {
            reply.status(404).send({error: `Server not found.`});
            return;
        }

        try {
            await persistServer(server_id);
        } catch(err) {
            fastify.log.error(err);
            reply.status(500).send({error: `Failed to persist server.`});
            return;
        }
    });

    fastify.post("/stop/:server", async (req, reply) => {
        const server_id = (/** @type {{ server: string }} */ (req.params)).server;
        if(!server_config_by_id.has(server_id)) {
            reply.status(404).send({error: `Server not found.`});
            return;
        }

        try {
            await stopServer(server_id);
        } catch(err) {
            fastify.log.error(err);
            reply.status(500).send({error: `Failed to stop server.`});
            return;
        }

        reply.status(200).send({success: true});
    });

    fastify.listen({ port, host: "0.0.0.0" });
    expire_timer.start();

    return fastify;
}