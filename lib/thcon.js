'use babel';

import { BufferedProcess } from "atom";
import electron from "electron";

const DEBUG = true;

export default {
  thconListen: null,
  windowId: null,

  activate(state) {
    this.windowId = electron.remote.getCurrentWindow().id;

    if (process.platform === "win32") {
      atom.notifications.addWarning("Windows not supported", {
        description: "Windows support isn't ready in `thcon` yet, but I'm working on it.  Sorry!",
        dismissable: true,
      });
      return;
    }

    let onStdout = (line) => {
      try {
        let lowestWindowId = Math.min(...electron.remote.BrowserWindow.getAllWindows().map((w) => w.id));
        if (this.windowId !== lowestWindowId) {
          DEBUG && console.log(
            `[thcon-atom::on_stdout] This window (${this.windowId}) isn't the primary; ignoring message`
          );
          return;
        }

        let payload = JSON.parse(line);
        DEBUG && console.log("[thcon-atom::on_stdout] receieved JSON payload:", payload);

        let loadedThemes = new Set(atom.themes.getLoadedThemeNames());

        let coreThemes = payload["core.themes"];
        let missingThemes = coreThemes.filter((t) => !loadedThemes.has(t));
        if (missingThemes.length > 0) {
          missingThemes.forEach((t) =>
            console.warn(`Couldn't find loaded theme '${t}'.  You may need to install it.`)
          );
          console.error("Not applying themes because at least one is missing");
          return;
        }

        atom.config.set("core.themes", coreThemes);
      } catch (e) {
        DEBUG && console.log(`[thcon-atom::on_stdout] received non-JSON line: ${line}`);
      }
    };

    let onStderr = (line) => {
      DEBUG && console.log(`[thcon-atom::on_stderr] ${line}`);
    };

    let onExit = (exitCode) => {
      DEBUG && console.log(`[thcon-atom::on_close] thcon-listen exited with status ${exitCode}`);
    };


    this.thconListen = new BufferedProcess({
      command: "thcon-listen",
      args: ["--verbose", "--per-process", "atom"],
      stdout: onStdout,
      stderr: onStderr,
      exit: onExit,
    });
  },

  deactivate() {
    DEBUG && console.log("[thcon-atom::deactivate]");
    this.thconListen && this.thconListen.kill();
  }
};
