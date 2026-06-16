# Fractal Demo Transcript

Source video: https://www.youtube.com/watch?v=MopzFfYr97A

Fetch auto captions from the repo root:

```bash
yt-dlp \
  --write-auto-subs \
  --skip-download \
  --sub-lang en \
  --sub-format vtt \
  --paths data/transcripts/fractal-demo \
  --output "fractal-demo.%(ext)s" \
  "https://www.youtube.com/watch?v=MopzFfYr97A"
```

Expected raw caption file:

```text
data/transcripts/fractal-demo/fractal-demo.en.vtt
```

After fetching captions, create the cleaned transcript here:

```text
data/transcripts/fractal-demo/transcript.md
```
