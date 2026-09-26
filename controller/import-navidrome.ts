import { readFile } from "node:fs/promises";
import { importNavidromePlaylist, saveManifest } from "./navidrome.ts";
import type { Manifest } from "./prepare.ts";

const [playlistId, musicDirectory, eventSettingsPath, manifestPath] = process.argv.slice(2);
if (!playlistId || !musicDirectory || !eventSettingsPath || !manifestPath) {
  console.error("Usage: node controller/import-navidrome.ts <playlist-id> <music-directory> <event-settings.json> <manifest.json>");
  process.exitCode = 1;
} else {
  const endpoint = process.env.NAVIDROME_URL;
  const username = process.env.NAVIDROME_USER;
  const password = process.env.NAVIDROME_PASSWORD;
  if (!endpoint || !username || !password) {
    console.error("Set NAVIDROME_URL, NAVIDROME_USER, and NAVIDROME_PASSWORD");
    process.exitCode = 1;
  } else {
    const run = async () => {
      const settings = JSON.parse(await readFile(eventSettingsPath, "utf8")) as Pick<Manifest, "id" | "eventBrief" | "startsAt" | "plannedEnd">;
      const manifest = await importNavidromePlaylist({ endpoint, username, password }, playlistId, musicDirectory, settings);
      await saveManifest(manifest, manifestPath);
      console.log(`Imported ${manifest.tracks.length} approved tracks into ${manifestPath}`);
    };
    run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
  }
}
