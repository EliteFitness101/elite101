# Elite Media FFmpeg renderer (Cloud Run)

This is an additive transcoding service for the existing Elite Media job and entitlement model. It does not replace the Gemini generation provider. The generation worker must first upload the provider's original MP4 to:

`digital-product-media/elite-media/{user_id}/{job_id}/source.mp4`

Then call `POST /render` with `Authorization: Bearer <ELITE_RENDER_SHARED_SECRET>` and JSON `{"job_id":"<uuid>","resolution":"320p"}`. Resolution defaults to 320p; 720p is optional.

The service:
- verifies the job and active trial/subscription against Supabase before processing;
- accepts only a job ID, never an arbitrary URL or storage path;
- validates source and output MP4 `ftyp` signatures;
- transcodes with FFmpeg and validates codec, pixel format and exact output dimensions with ffprobe;
- writes the derivative to the existing `digital-product-media` bucket and performs a public URL HEAD readback;
- returns the storage path, public URL, byte size and SHA-256 for the Edge Function to register in `content_asset_registry` and complete the existing job.

## Cloud Run deployment configuration

Use a dedicated Cloud Run service in the existing approved Google Cloud project. Set secrets from Secret Manager:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ELITE_RENDER_SHARED_SECRET`

The same random `ELITE_RENDER_SHARED_SECRET` must be stored as a Supabase Edge Function secret before the Edge Function calls this service. Do not put secret values in source control. Configure Cloud Run ingress/authentication and IAM deliberately; this service additionally enforces the shared bearer secret.

Suggested resource starting point: 1 vCPU, 1 GiB memory, concurrency 1, request timeout 900 seconds, min instances 0. Validate actual memory/timeout and Supabase Storage limits with representative MP4s before production traffic. Do not expose the service as production-ready until deployment, authenticated render, object readback and registry/playback checks all pass.

Build from this directory with the included Dockerfile. `GET /healthz` is a non-secret liveness check; it is not a render certification.
