//@ts-check

import { ArgumentParser } from "argparse";

import {startServer} from "./server.mjs";

const parser = new ArgumentParser({
    description: "Simple web page for waking up servers running on GCP.",
});

parser.add_argument("-c", "--config", { help: "Path to the config file.", default: "config.toml" });
parser.add_argument("-t", "--timer", { help: "Path to the timer file.", default: "timer.json" });
parser.add_argument("-p", "--port", { help: "Port to listen on.", default: 8080 });

/** @type {{config: string, timer: string, port: number}} */
const args = parser.parse_args();

async function main() {
    await startServer({
        config_path: args.config,
        timer_path: args.timer,
        port: args.port,
    });
    
    console.log(`Server listening on port ${args.port}`);
}

main().catch((err) => {console.error(err); process.exit(1);})