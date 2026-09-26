import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepare } from "./prepare.ts";

const minute = 60_000;

test("preparation freezes local files and a non-looping fallback order", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "ai-dj-"));
  context.after(async () => { const { rm } = await import("node:fs/promises"); await rm(root, { recursive: true, force: true }); });
  const music = join(root, "music");
  const state = join(root, "state");
  await mkdir(music);
  const tracks = [];
  for (let index = 0; index < 6; index++) {
    const file = `${index}.mp3`;
    await writeFile(join(music, file), "test fixture");
    tracks.push({ id: `track-${index}`, artistId: `artist-${index}`, artist: `Artist ${index}`, title: `Track ${index}`, durationMs: 60 * minute, file });
  }
  const manifest = join(root, "manifest.json");
  await writeFile(manifest, JSON.stringify({ id: "night", eventBrief: "House", startsAt: "2026-09-26T20:00:00Z", plannedEnd: "2026-09-27T00:00:00Z", tracks }));
  const result = await prepare(manifest, music, state, async () => 60 * minute);
  assert.equal(result.pool.length, 6);
  assert.equal((await readFile(join(state, "fallback.m3u"), "utf8")).trim().split("\n").length, 6);
  assert.equal(JSON.parse(await readFile(join(state, "event.json"), "utf8")).status, "prepared");

  const outside = join(root, "outside.mp3");
  await writeFile(outside, "fixture");
  await symlink(outside, join(music, "escape.mp3"));
  tracks[0].file = "escape.mp3";
  await writeFile(manifest, JSON.stringify({ id: "night", eventBrief: "House", startsAt: "2026-09-26T20:00:00Z", plannedEnd: "2026-09-27T00:00:00Z", tracks }));
  await assert.rejects(() => prepare(manifest, music, state, async () => 60 * minute), /leaves music directory/);
});
