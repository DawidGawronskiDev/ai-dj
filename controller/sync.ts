import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { commitIncoming, recordPlaybackStart, type EventState } from "./event.ts";
import { atomicWrite } from "./prepare.ts";

interface MixerMarker {
  filename: string;
  startedAt: number;
}

interface CommitMarker {
  filename: string;
  at: number;
}

export async function syncOnce(stateDirectory: string): Promise<boolean> {
  const statePath = resolve(stateDirectory, "event.json");
  const markerPath = resolve(stateDirectory, "now-playing.json");
  const committedPath = resolve(stateDirectory, "committed.json");
  const state = JSON.parse(await readFile(statePath, "utf8")) as EventState;
  if (state.status === "stopped" || state.status === "paused") return false;
  let updated = state;
  let changed = false;
  let marker: MixerMarker;
  try {
    marker = JSON.parse(await readFile(markerPath, "utf8")) as MixerMarker;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
  if (typeof marker.filename !== "string" || !Number.isFinite(marker.startedAt)) throw new Error("Invalid mixer marker");
  const startedAtMs = Math.round(marker.startedAt * 1000);
  if (updated.current?.startedAtMs !== startedAtMs || !updated.pool.some((track) => track.localPath === marker.filename && track.id === updated.current?.trackId)) {
    const track = updated.pool.find((item) => item.localPath === marker.filename);
    if (!track) throw new Error(`Mixer played file outside event pool: ${marker.filename}`);
    updated = recordPlaybackStart(updated, track.id, startedAtMs);
    changed = true;
  }
  try {
    const commit = JSON.parse(await readFile(committedPath, "utf8")) as CommitMarker;
    if (typeof commit.filename !== "string" || !Number.isFinite(commit.at)) throw new Error("Invalid mixer commit marker");
    const first = updated.upcoming[0];
    const currentPath = updated.pool.find((track) => track.id === updated.current?.trackId)?.localPath;
    if (first && !first.committed && currentPath === commit.filename &&
        commit.at * 1000 >= (updated.current?.startedAtMs ?? Infinity) &&
        updated.pool.find((track) => track.id === first.trackId)?.localPath !== commit.filename) {
      updated = commitIncoming(updated);
      changed = true;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (changed) await atomicWrite(statePath, JSON.stringify(updated, null, 2) + "\n");
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const stateDirectory = process.argv[2];
  if (!stateDirectory) {
    console.error("Usage: node controller/sync.ts <state-directory> [--watch]");
    process.exitCode = 1;
  } else if (process.argv[3] === "--watch") {
    let active = false;
    setInterval(async () => {
      if (active) return;
      active = true;
      try { await syncOnce(stateDirectory); }
      catch (error) { console.error(error); }
      finally { active = false; }
    }, 1000);
  } else {
    syncOnce(stateDirectory).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
  }
}
