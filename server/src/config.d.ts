export interface ServerGCPConfig {
    project: string;
    zone: string;
    instance: string;
}

export interface ServerConfig {
    id: string;
    name: string;
    duration: string; // "1d", "4h 20m", etc... (parsed by `parse-duration`)
    gcp: ServerGCPConfig;
}

export interface Config {
    servers: ServerConfig[];
}