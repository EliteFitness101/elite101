# ResoFlex Stream Engine — Elite101

## Ownership boundary
This service belongs to `EliteFitness101/elite101`. It is an independent consumer of approved processed assets in Supabase Storage bucket `resoflex-assets`, prefix `processed/`. ChatB2K remains the source/capture/verification pipeline. This service does not discover or capture BIGO hosts and does not publish Telegram channel posts.

## Runtime
Run `services/resoflex-stream-engine` on a dedicated Linux VPS with Docker. Do not run FFmpeg in Vercel Functions or Supabase Edge Functions. Expose port 8080 only behind a TLS reverse proxy and firewall; restrict `/control` to trusted callers.

Required server-side environment:
- `SUPABASE_URL`: URL of the approved Supabase project containing the stream schema and asset bucket.
- `SUPABASE_SERVICE_ROLE_KEY`: service role credential, VPS only.
- `STREAM_WEBHOOK_SECRET`: independent high-entropy secret, VPS and scheduler only.
- `TELEGRAM_RTMP_URL`: Telegram RTMPS ingest base URL.
- `TELEGRAM_STREAM_KEY`: rotated Telegram stream key, VPS only.
- Optional `ASSET_BUCKET`, `ASSET_PREFIX`, `WORKER_ID`, `POLL_SECONDS`.

Never commit secrets, print Authorization headers, or put service-role credentials in Vercel public environment variables. Fail closed when secrets are missing.

## Control API
POST `/control` with `Authorization: Bearer <STREAM_WEBHOOK_SECRET>` and JSON:
```json
{"action":"start","idempotency_key":"scheduled-2026-11-01T07:55:00+01:00","requested_by":"scheduler"}
```
Supported actions: start, stop, restart, health. GET `/health` is an unauthenticated liveness probe; restrict it at the network edge if operational metadata should be private.

## Database
Apply `supabase/migrations/20261101090000_resoflex_stream_engine.sql` to the intended project only after confirming the target project. It creates isolated schedule, job and session tables and service-role-only RPCs. It intentionally does not create pg_cron schedules or enable broadcasts automatically.

## Initial deployment checklist
1. Provision a dedicated Ubuntu 24.04 VPS; Docker Engine + Compose plugin; minimum 2 vCPU / 4 GB RAM and sufficient outbound bandwidth.
2. Rotate the exposed Telegram RTMPS key in Telegram Live Stream settings.
3. Generate a 32+ byte random webhook secret.
4. Apply the migration to the verified Elite101 data project and verify the bucket/prefix exists.
5. Configure secrets in the VPS secret store; do not commit an `.env` file.
6. Deploy the container behind HTTPS; test /health and authenticated enqueue with a non-live test.
7. Verify FFmpeg input playlist and audio/video codec compatibility.
8. Start a short live test, confirm Telegram's viewer-side live state, then enable a schedule only after explicit operational approval.
9. Configure a single scheduler owner. Do not create a second pg_cron job while another scheduler is active.

## Important implementation constraints
- Only assets under the approved processed prefix are considered.
- Idempotency is enforced by a unique database key.
- Job claim uses row locking with SKIP LOCKED.
- Only one live session is allowed by a partial unique index.
- This initial worker is a single-process broadcaster; production HA requires a distributed lease heartbeat and a fenced broadcast lock.
