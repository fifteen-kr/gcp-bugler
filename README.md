# gcp-bugler
GCP-bugler provides two simple features:

- A simple web page for waking up servers running on GCP.
- Shut down the server after a certain period of inactivity.

Be warned that this project is intended for personal projects, and not for production use.

GCP-bugler does not provide any authentication mechanism. Use it behind a reverse proxy that provides authentication.

## API

### GET /status

Returns a JSON array of servers and their statuses.

### POST /start/:server

Wakes up the server with the given ID.

### POST /keep-alive/:server

Resets the inactivity timer for the server with the given ID.

### POST /stop/:server

Shuts down the server with the given ID, clearing the inactivity timer.