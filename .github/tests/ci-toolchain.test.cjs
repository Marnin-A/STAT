const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolve } = require("node:path");
const root = resolve(__dirname, "../..");
const workflow = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

for (const name of ["test", "conformance"]) {
  test(name + " selects pnpm only from packageManager and uses supported action runtimes", () => {
    const job = workflow.split(/\n(?=  [\w-]+:\n)/).find(block => block.startsWith("  " + name + ":"));
    assert.ok(job, name + " job must exist");
    assert.match(pkg.packageManager, /^pnpm@10\.\d+\.\d+$/);
    const setup = job.match(/- uses: pnpm\/action-setup@[^\n]+(?:\n(?!      -)[^\n]*)*/)?.[0];
    assert.ok(setup, "pnpm must be installed before cache setup");
    assert.doesNotMatch(setup, /\bversion:/, "duplicate pnpm version conflicts with packageManager");
    assert.match(setup, /pnpm\/action-setup@v5/);
    assert.match(job, /actions\/checkout@v5/);
    assert.match(job, /actions\/setup-node@v5/);
    assert.match(job, /node-version: 22/);
    assert.match(job, /runs-on: ubuntu-24\.04/);
    assert.ok(job.indexOf("pnpm/action-setup@") < job.indexOf("actions/setup-node@"));
  });
}
