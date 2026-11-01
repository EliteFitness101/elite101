# ResoFlex Stream Engine

Independent Elite101 RTMPS worker. Requires Docker Compose, a Linux VPS, a verified Supabase project, approved processed assets, and a rotated Telegram stream key.

1. Copy `.env.example` to `.env` on the VPS and fill values using the server secret store.
2. Apply the migration in `../../supabase/migrations/20261101090000_resoflex_stream_engine.sql` to the verified Supabase project.
3. Build and run: `docker compose up -d --build`.
4. Check local liveness: `curl http://127.0.0.1:8080/health`.
5. Place a TLS reverse proxy in front of the control API. Never expose port 8080 directly to the public internet.
6. Test queueing with a unique idempotency key before authorizing a live stream.

No stream starts automatically at deploy time. Scheduling is deliberately disabled until the VPS, Telegram credential rotation, storage contents, and live viewer-side test are verified.
