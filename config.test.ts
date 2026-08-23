import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_CONFIG, loadFooterConfig, userConfigPath } from "./config.ts";

function makeHome(): string {
	const home = mkdtempSync(join(tmpdir(), "cometix-home-"));
	mkdirSync(join(home, ".pi", "agent"), { recursive: true });
	return home;
}

test("returns defaults when no files or env are present", () => {
	const home = makeHome();
	const cwd = mkdtempSync(join(tmpdir(), "cometix-cwd-"));
	const result = loadFooterConfig({ cwd, homeDir: home, env: {} });

	assert.deepEqual(result.config, DEFAULT_CONFIG);
	assert.deepEqual(result.sources, ["defaults"]);
	assert.equal(result.warning, undefined);
});

test("applies user config over defaults", () => {
	const home = makeHome();
	writeFileSync(
		userConfigPath(home),
		JSON.stringify({
			iconMode: "emoji",
			showTps: false,
			gitTtlMs: 5000,
			icons: { emoji: { model: "X" } },
			colors: { cyan: 36 },
		}),
	);
	const cwd = mkdtempSync(join(tmpdir(), "cometix-cwd-"));
	const result = loadFooterConfig({ cwd, homeDir: home, env: {} });

	assert.equal(result.config.iconMode, "emoji");
	assert.equal(result.config.showTps, false);
	assert.equal(result.config.gitTtlMs, 5000);
	assert.equal(result.config.icons.emoji.model, "X");
	assert.equal(result.config.icons.emoji.dir, DEFAULT_CONFIG.icons.emoji.dir);
	assert.equal(result.config.colors.cyan, 36);
	assert.equal(result.config.colors.blue, DEFAULT_CONFIG.colors.blue);
	assert.ok(result.sources.includes(userConfigPath(home)));
});

test("project config wins over user config", () => {
	const home = makeHome();
	writeFileSync(userConfigPath(home), JSON.stringify({ iconMode: "emoji", showTps: false }));

	const project = mkdtempSync(join(tmpdir(), "cometix-proj-"));
	mkdirSync(join(project, ".pi"), { recursive: true });
	writeFileSync(join(project, ".pi", "pi-cometix-footer.json"), JSON.stringify({ iconMode: "nerd", enabled: false }));

	const nested = join(project, "src", "app");
	mkdirSync(nested, { recursive: true });
	const result = loadFooterConfig({ cwd: nested, homeDir: home, env: {} });

	assert.equal(result.config.iconMode, "nerd");
	assert.equal(result.config.showTps, false);
	assert.equal(result.config.enabled, false);
	assert.ok(result.sources.some((source) => source.endsWith("pi-cometix-footer.json")));
});

test("env wins over files", () => {
	const home = makeHome();
	writeFileSync(userConfigPath(home), JSON.stringify({ iconMode: "emoji", showTps: false, gitTtlMs: 1111 }));
	const cwd = mkdtempSync(join(tmpdir(), "cometix-cwd-"));
	const result = loadFooterConfig({
		cwd,
		homeDir: home,
		env: {
			PI_COMETIX_ICON_MODE: "nerd",
			PI_COMETIX_SHOW_TPS: "on",
			PI_COMETIX_ENABLED: "0",
			PI_COMETIX_GIT_TTL: "2500",
		},
	});

	assert.equal(result.config.iconMode, "nerd");
	assert.equal(result.config.showTps, true);
	assert.equal(result.config.enabled, false);
	assert.equal(result.config.gitTtlMs, 2500);
	assert.ok(result.sources.includes("env"));
});

test("records invalid JSON without crashing", () => {
	const home = makeHome();
	writeFileSync(userConfigPath(home), "{not json");
	const cwd = mkdtempSync(join(tmpdir(), "cometix-cwd-"));
	const result = loadFooterConfig({ cwd, homeDir: home, env: {} });

	assert.deepEqual(result.config, DEFAULT_CONFIG);
	assert.match(result.warning ?? "", /invalid JSON/);
});
