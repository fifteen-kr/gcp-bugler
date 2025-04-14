# GCP-Bugler

GCP-Bugler provides two simple features:

- A simple web page for waking up servers running on GCP.
- Shut down the server after a certain period of inactivity.

Be warned that this project is intended for personal projects, and not for production use.

GCP-bugler does not provide any authentication mechanism. Use it behind a reverse proxy that provides authentication.

## Setup

1. Enable API access for your GCP project.
2. Create a service account with "Compute Instance Admin" role.
3. Download the JSON key file.

## API

### GET /status

Returns a JSON array of servers and their statuses.

### POST /start/:server

Wakes up the server with the given ID.

### POST /keep-alive/:server

Resets the inactivity timer for the server with the given ID.

### POST /persist/:server

Sets the server with the given ID to persist, preventing it from shutting down due to inactivity.

### POST /stop/:server

Shuts down the server with the given ID, clearing the inactivity timer.
