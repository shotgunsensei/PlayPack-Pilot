"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const hook = process.env.POST_MERGE_TEST_HOOK || path.join(root, "scripts/post-merge.sh");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/manual-source-side-effects.yml"), "utf8");
const bash = process.platform === "win32"
  ? "C:\\Program Files\\Git\\bin\\bash.exe"
  : "/bin/bash";

function sterileEnv(extra = {}) {
  const allowed = new Set(["SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "TEMP", "TMP", "COMSPEC", "PATHEXT"]);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => allowed.has(key.toUpperCase())));
  return { ...env, ...extra };
}

function inspectExecution() {
  const tempRoot = path.resolve(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(tempRoot, "post-merge-guard-"));
  assert.equal(path.dirname(path.resolve(fixture)), tempRoot);
  assert.ok(path.basename(fixture).startsWith("post-merge-guard-"));
  const bin = path.join(fixture, "bin");
  const marker = path.join(fixture, "effects.txt");
  fs.mkdirSync(bin);
  for (const command of ["pnpm", "npm", "npx", "corepack", "node", "psql", "docker", "git"]) {
    fs.writeFileSync(path.join(bin, command),
      "#!/bin/bash\nprintf '%s\\n' '" + command + " invoked' >> \"$MERGE_GUARD_MARKER\"\nexit 0\n",
      { mode: 0o755 });
  }
  try {
    const result = spawnSync(bash, [hook], {
      cwd: fixture,
      env: sterileEnv({
        PATH: bin,
        MERGE_GUARD_MARKER: marker,
        DATABASE_URL: "synthetic-database-value-must-not-be-expanded",
        ADMIN_KEY: "synthetic-editor-value-must-not-be-expanded",
        COREPACK_ENABLE_NETWORK: "0",
      }),
      encoding: "utf8",
      timeout: 5000,
    });
    return {
      status: result.status,
      error: result.error?.code,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      effects: fs.existsSync(marker) ? fs.readFileSync(marker, "utf8") : "",
    };
  } finally {
    // The exact resolved test directory was checked above before recursive cleanup.
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

test("the registered post-merge hook parses as shell source", () => {
  const config = fs.readFileSync(path.join(root, ".replit"), "utf8");
  assert.match(config, /\[postMerge\]\s+path = "scripts\/post-merge\.sh"/);
  const result = spawnSync(bash, ["-n", hook], { env: sterileEnv(), encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 0, result.error?.message || result.stderr);
});

test("a source merge cannot invoke package, database or other command ports", () => {
  const result = inspectExecution();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.effects, "", "Merge hook invoked an external command");
});

test("the hook retains explicit manual commands without expanding configuration", () => {
  const result = inspectExecution();
  assert.match(result.stdout, /pnpm install --frozen-lockfile/);
  assert.match(result.stdout, /pnpm build/);
  assert.match(result.stdout, /versioned migration and rollback/);
  assert.match(result.stdout, /explicit database approval/);
  assert.doesNotMatch(result.stdout, /db push/);
  assert.doesNotMatch(result.stdout + result.stderr, /synthetic-(database|editor)-value/);
});

test("source-side-effect workflow can run only by manual dispatch", () => {
  assert.match(workflow, /^on:\n  workflow_dispatch:\s*\n\npermissions:/m);
  assert.doesNotMatch(workflow, /pull_request|push:|schedule:|workflow_run|repository_dispatch/);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /timeout-minutes: 5/);
  assert.match(workflow, /persist-credentials: false/);
});

test("workflow has no dependency acquisition, credentials, database or provider action", () => {
  const uses = [...workflow.matchAll(/uses:\s*(\S+)/g)].map((match) => match[1]);
  const commands = [...workflow.matchAll(/^\s*run:\s*(.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(uses, ["actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683"]);
  assert.deepEqual(commands, ["bash -n scripts/post-merge.sh", "node --test tests/post-merge-safety.test.cjs"]);
  assert.doesNotMatch(workflow, /secrets\.|environment:|id-token:|write-all|setup-node|actions\/cache|services:/);
  assert.match(workflow, /not full application CI/);
});

