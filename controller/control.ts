import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { atomicWrite } from "./prepare.ts";
import type { EventState } from "./event.ts";

/** Local rehearsal control. The full operator command API will replace this. */
export async function control(stateDirectory: string, command: "start" | "stop"): Promise<void> {
  const statePath = resolve(stateDirectory, "event.json");
  const flagPath = resolve(stateDirectory, "run.flag");
  const state = JSON.parse(await readFile(statePath, "utf8")) as EventState;
  if (command === "start") {
    if (state.status !== "prepared") throw new Error("Only a prepared event may start");
    await atomicWrite(statePath, JSON.stringify({ ...state, status: "running" }, null, 2) + "\n");
    await writeFile(flagPath, "running\n", { flag: "wx" });
  } else {
    try { await unlink(flagPath); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await atomicWrite(statePath, JSON.stringify({ ...state, status: "stopped" }, null, 2) + "\n");
  }
}

if (process.argv[1]?.endsWith("/controller/control.ts")) {
  const [command, stateDirectory] = process.argv.slice(2);
  if ((command !== "start" && command !== "stop") || !stateDirectory) {
    console.error("Usage: node controller/control.ts <start|stop> <state-directory>");
    process.exitCode = 1;
  } else {
    control(stateDirectory, command).catch((error: unknown) => { console.error(error); process.exitCode = 1; });
  }
}
