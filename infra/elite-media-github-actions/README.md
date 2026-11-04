# Elite Media GitHub Actions FFmpeg runner

This path avoids Google Cloud Run. It uses GitHub-hosted `ubuntu-latest` runners to transcode completed Gemini MP4 jobs and write verified derivatives back to the existing Supabase project.

## Required repository Actions secrets

Configure these under **Settings → Secrets and variables → Actions → Repository secrets**:

- `SUPABASE_URL`: the existing Supabase project URL for project `vbqjvmnhdtdhmeeudqnn`.
- `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role key. Store it only as a GitHub Actions secret; never commit or paste it into chat.

The repository is public, and standard GitHub-hosted runners are free for public repositories. Gemini API usage and Supabase storage/egress remain subject to their own quotas and terms.

## Runtime

- Runs every 5 minutes and can also be started manually with an optional job UUID.
- Only processes jobs already marked `rendering` with `output.ffmpeg_render_pending=true`.
- Rechecks the Elite request's active trial/subscription before processing.
- Only reads the exact raw object path for the owned job.
- Defaults to 320p; accepts the job's 720p selection.
- Uses FFmpeg + ffprobe to verify H.264, dimensions and yuv420p.
- Uploads a separate derivative, performs public HEAD readback, upserts `content_asset_registry`, and marks the job `ready`.
- Keeps QA status `pending`; publication remains subject to human/platform QA.

The Edge Function changes that enqueue jobs are in the matching source files under `supabase/functions/`. Do not deploy those changes until the Actions secrets are present and the workflow has passed a manual smoke test.
