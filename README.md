# AI DJ

An autonomous music selector and occasional spoken host for a nightclub event, using Navidrome, GPT-6-Luna, Kokoro, Next.js, Liquidsoap, and Icecast. The controller and venue audio pipeline are runnable today; model selection, speech, and the operator web interface are still to come.

Preparation freezes a Navidrome playlist into a local event pool. The controller checks pool membership, repeats, and a 30-minute artist gap before publishing a queue. Liquidsoap plays approved local files through Icecast, reports actual starts, and continues through its loaded fallback queue if the controller disconnects. Preparation requires five hours of unique, playable audio after crossfade overlap.

## Prepare an event

Requires Node 26, pnpm, `ffprobe`, Docker Compose, and enough approved music for five hours. Create `event-settings.json`:

```json
{
  "id": "rehearsal-1",
  "eventBrief": "Warm house, then higher energy after 10pm",
  "startsAt": "2026-10-01T20:00:00+01:00",
  "plannedEnd": "2026-10-02T00:00:00+01:00"
}
```

Import a Navidrome playlist. The importer downloads its original audio files into the music directory and writes a manifest without credentials. You can instead write the manifest yourself; each track needs `id`, `artistId`, `artist`, `title`, `durationMs`, and a `file` path relative to the music directory.

```sh
pnpm install
export NAVIDROME_URL=https://your-navidrome.example
export NAVIDROME_USER=your-user
export NAVIDROME_PASSWORD=your-password
pnpm import:navidrome PLAYLIST_ID /absolute/path/to/music ./event-settings.json ./event-manifest.json
pnpm prepare ./event-manifest.json /absolute/path/to/music /absolute/path/to/new-state
cp .env.example .env
```

Use a new state directory for each event. Set `MUSIC_DIR`, `STATE_DIR`, three distinct passwords, and `VENUE_UID`/`VENUE_GID` in `.env`. On Linux, `id -u` and `id -g` provide the IDs; both services need write access to the state directory. Set `ICECAST_PORT` and `CONTROLLER_PORT` if the defaults conflict.

```sh
docker compose up -d --build
```

The controller listens on `127.0.0.1:8787` by default. Every request requires `Authorization: Bearer <OPERATOR_PASSWORD>`. For example, queue a track before starting, then inspect the state:

```sh
export OPERATOR_PASSWORD=the-value-you-set-in-.env
curl -X POST http://127.0.0.1:8787/queue \
  -H "Authorization: Bearer $OPERATOR_PASSWORD" \
  -H 'Content-Type: application/json' \
  -d '{"trackId":"navidrome-track-id","source":"operator"}'
curl -X POST http://127.0.0.1:8787/start -H "Authorization: Bearer $OPERATOR_PASSWORD"
curl http://127.0.0.1:8787/state -H "Authorization: Bearer $OPERATOR_PASSWORD"
mpv http://127.0.0.1:8000/live.mp3
```

The venue player should consume the Icecast URL on the dedicated audio machine. `/force-next` accepts `{"trackId":"..."}`; `/replace` accepts an `index` and `trackId`; `/reorder` accepts an `order` array of current queue indices. `/steer` accepts an `instruction`, `/mute` accepts `muted`, and `/extend` accepts a later `plannedEndMs`. `/stop` cuts playback immediately. These commands use `POST` with JSON bodies and the same bearer token. Operator choices may override artist spacing with `{"operatorOverride":{"allowArtistSpacing":true}}`. Repeat overrides are not available through the live venue pipeline yet.

The local schedule contains the validated queue followed by eligible unused fallback tracks. Liquidsoap reloads it on edits, records played paths in `played.txt`, and writes `now-playing.json`; the controller copies actual playback into `event.json`. The stream ends when the unique prepared tracks are exhausted. On a mixer restart, played paths are filtered from the schedule. Stop the event before shutting down services if it should stay silent on the next start.

Run `pnpm test`, `pnpm typecheck`, and `docker compose config --quiet` after changes. Liquidsoap can be checked with `docker run --rm -v "$PWD/audio/radio.liq:/radio.liq:ro" savonet/liquidsoap:v2.4.5 --check /radio.liq`.

Remaining v1 work: autonomous model selection, Kokoro speech and ducking, a password-protected operator UI, planned end/fade behavior, and a full venue rehearsal with real audio. The Navidrome importer has mock-backed tests but has not yet been run against this venue's server.

- [Agreed design and acceptance checks](docs/design-interview.md)
- [Domain glossary](CONTEXT.md)
- [Decision: approved event pool](docs/adr/0001-event-pool-selection.md)
- [Decision: offline venue preparation](docs/adr/0002-prepare-music-for-offline-playback.md)
- [Decision: independent playback controller](docs/adr/0003-separate-controller-from-web-interface.md)
