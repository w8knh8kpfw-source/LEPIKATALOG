"use strict";
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const files = ["index.html", "track.html", "privacy.html"];
let failed = false;

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\bsrc\s*=/i.test(match[1]));

  for (let index = 0; index < scripts.length; index++) {
    const result = spawnSync(process.execPath, ["--check"], {
      input: scripts[index][2],
      encoding: "utf8"
    });

    if (result.status !== 0) {
      failed = true;
      process.stderr.write("\nSyntax error in " + file + " inline script #" + (index + 1) + ":\n");
      process.stderr.write(result.stderr || result.stdout || "Unknown syntax error\n");
    }
  }
  console.log(file + ": " + scripts.length + " inline script(s) checked");
}

if (failed) process.exit(1);
console.log("All inline JavaScript syntax checks passed.");
