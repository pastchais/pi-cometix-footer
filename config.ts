import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export type IconMode = "nerd" | "emoji";

export interface IconSet {
	model: string;
	dir: string;
	git: string;
	ctx: string;
	usage: string;
	cost: string;
	duration: string;
}

export interface ColorSet {
	cyan: number;
	yellow: number;
	green: number;
	blue: number;
	magenta: number;
	cost: number;
	duration: number;
	red: number;
	warn: number;
}

export interface FooterConfig {
	iconMode: IconMode;
	showTps: boolean;
	enabled: boolean;
	gitTtlMs: number;
	icons: {
		nerd: IconSet;
		emoji: IconSet;
	};
	colors: ColorSet;
}

export interface LoadFooterConfigResult {
	config: FooterConfig;
	sources: string[];
	warning?: string;
}

const cp = (n: number) => String.fromCodePoint(n);

const ICON_KEYS = ["model", "dir", "git", "ctx", "usage", "cost", "duration"] as const;
const COLOR_KEYS = ["cyan", "yellow", "green", "blue", "magenta", "cost", "duration", "red", "warn"] as const;

export const DEFAULT_CONFIG: FooterConfig = {
	iconMode: "nerd",
	showTps: true,
	enabled: true,
	gitTtlMs: 3000,
	icons: {
		nerd: {
			model: "\ue22c", // nf-fae-pi
			dir: "\ue285", // nf-fae-bigger
			git: cp(0xf02a2), // nf-md-git
			ctx: "\uf49b", // nf-md-counter
			usage: cp(0xf0a9e), // nf-md-chart_bar
			cost: cp(0xf01c1), // nf-md-currency_usd
			duration: cp(0xf0109), // nf-md-camera_timer
		},
		emoji: {
			model: "🤖",
			dir: "📁",
			git: "🌿",
			ctx: "⚡️",
			usage: "📊",
			cost: "💰",
			duration: "⏱️",
		},
	},
	colors: {
		cyan: 96,
		yellow: 93,
		green: 92,
		blue: 94,
		magenta: 95,
		cost: 33,
		duration: 95,
		red: 91,
		warn: 93,
	},
};

export const USER_CONFIG_FILENAME = "pi-cometix-footer.json";

export function userConfigPath(homeDir = homedir()): string {
	return join(resolve(homeDir), ".pi", "agent", USER_CONFIG_FILENAME);
}

export function findProjectConfigPath(cwd: string): string | undefined {
	let dir = resolve(cwd);
	while (true) {
		const candidate = join(dir, ".pi", USER_CONFIG_FILENAME);
		if (existsSync(candidate)) return candidate;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

export function loadFooterConfig(options?: {
	cwd?: string;
	homeDir?: string;
	env?: NodeJS.ProcessEnv;
}): LoadFooterConfigResult {
	const cwd = options?.cwd ?? process.cwd();
	const homeDir = options?.homeDir ?? homedir();
	const env = options?.env ?? process.env;
	const warnings: string[] = [];
	const sources: string[] = ["defaults"];

	let config = structuredClone(DEFAULT_CONFIG);

	const userPath = userConfigPath(homeDir);
	const userFile = readConfigFile(userPath);
	if (userFile.warning) warnings.push(userFile.warning);
	if (userFile.value) {
		config = applyPatch(config, userFile.value, userPath, warnings);
		sources.push(userPath);
	}

	const projectPath = findProjectConfigPath(cwd);
	if (projectPath) {
		const projectFile = readConfigFile(projectPath);
		if (projectFile.warning) warnings.push(projectFile.warning);
		if (projectFile.value) {
			config = applyPatch(config, projectFile.value, projectPath, warnings);
			sources.push(projectPath);
		}
	}

	config = applyEnv(config, env, warnings);
	if (env.PI_COMETIX_ICON_MODE || env.PI_COMETIX_SHOW_TPS || env.PI_COMETIX_ENABLED || env.PI_COMETIX_GIT_TTL) {
		sources.push("env");
	}

	return {
		config,
		sources,
		warning: warnings.length > 0 ? warnings.join("; ") : undefined,
	};
}

function readConfigFile(path: string): { value?: unknown; warning?: string } {
	if (!existsSync(path)) return {};
	try {
		const raw = readFileSync(path, "utf8");
		return { value: JSON.parse(raw) };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { warning: `invalid JSON at ${path}: ${message}` };
	}
}

function applyPatch(base: FooterConfig, raw: unknown, source: string, warnings: string[]): FooterConfig {
	if (!isObject(raw)) {
		warnings.push(`${source} must be a JSON object`);
		return base;
	}

	const next = structuredClone(base);

	if ("iconMode" in raw) {
		const value = parseIconMode(raw.iconMode);
		if (value) next.iconMode = value;
		else warnings.push(`${source}: iconMode must be "nerd" or "emoji"`);
	}
	if ("showTps" in raw) {
		const value = parseBoolean(raw.showTps);
		if (value !== undefined) next.showTps = value;
		else warnings.push(`${source}: showTps must be a boolean`);
	}
	if ("enabled" in raw) {
		const value = parseBoolean(raw.enabled);
		if (value !== undefined) next.enabled = value;
		else warnings.push(`${source}: enabled must be a boolean`);
	}
	if ("gitTtlMs" in raw) {
		const value = parseGitTtl(raw.gitTtlMs);
		if (value !== undefined) next.gitTtlMs = value;
		else warnings.push(`${source}: gitTtlMs must be a positive number`);
	}
	if ("icons" in raw) {
		if (!isObject(raw.icons)) {
			warnings.push(`${source}: icons must be an object`);
		} else {
			if ("nerd" in raw.icons) next.icons.nerd = mergeIconSet(next.icons.nerd, raw.icons.nerd, `${source}.icons.nerd`, warnings);
			if ("emoji" in raw.icons) next.icons.emoji = mergeIconSet(next.icons.emoji, raw.icons.emoji, `${source}.icons.emoji`, warnings);
		}
	}
	if ("colors" in raw) {
		next.colors = mergeColors(next.colors, raw.colors, `${source}.colors`, warnings);
	}

	return next;
}

function applyEnv(base: FooterConfig, env: NodeJS.ProcessEnv, warnings: string[]): FooterConfig {
	const next = structuredClone(base);

	if (env.PI_COMETIX_ICON_MODE != null && env.PI_COMETIX_ICON_MODE !== "") {
		const value = parseIconMode(env.PI_COMETIX_ICON_MODE);
		if (value) next.iconMode = value;
		else warnings.push('PI_COMETIX_ICON_MODE must be "nerd" or "emoji"');
	}
	if (env.PI_COMETIX_SHOW_TPS != null && env.PI_COMETIX_SHOW_TPS !== "") {
		const value = parseEnvBoolean(env.PI_COMETIX_SHOW_TPS);
		if (value !== undefined) next.showTps = value;
		else warnings.push("PI_COMETIX_SHOW_TPS must be true/false");
	}
	if (env.PI_COMETIX_ENABLED != null && env.PI_COMETIX_ENABLED !== "") {
		const value = parseEnvBoolean(env.PI_COMETIX_ENABLED);
		if (value !== undefined) next.enabled = value;
		else warnings.push("PI_COMETIX_ENABLED must be true/false");
	}
	if (env.PI_COMETIX_GIT_TTL != null && env.PI_COMETIX_GIT_TTL !== "") {
		const value = parseGitTtl(Number(env.PI_COMETIX_GIT_TTL));
		if (value !== undefined) next.gitTtlMs = value;
		else warnings.push("PI_COMETIX_GIT_TTL must be a positive number");
	}

	return next;
}

function mergeIconSet(base: IconSet, raw: unknown, source: string, warnings: string[]): IconSet {
	if (!isObject(raw)) {
		warnings.push(`${source} must be an object`);
		return base;
	}
	const next = { ...base };
	for (const key of ICON_KEYS) {
		if (!(key in raw)) continue;
		const value = raw[key];
		if (typeof value === "string" && value.length > 0) next[key] = value;
		else warnings.push(`${source}.${key} must be a non-empty string`);
	}
	return next;
}

function mergeColors(base: ColorSet, raw: unknown, source: string, warnings: string[]): ColorSet {
	if (!isObject(raw)) {
		warnings.push(`${source} must be an object`);
		return base;
	}
	const next = { ...base };
	for (const key of COLOR_KEYS) {
		if (!(key in raw)) continue;
		const value = raw[key];
		if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 107) {
			next[key] = value;
		} else {
			warnings.push(`${source}.${key} must be an integer 0-107`);
		}
	}
	return next;
}

function parseIconMode(value: unknown): IconMode | undefined {
	return value === "nerd" || value === "emoji" ? value : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function parseEnvBoolean(value: string): boolean | undefined {
	const normalized = value.trim().toLowerCase();
	if (normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes") return true;
	if (normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no") return false;
	return undefined;
}

function parseGitTtl(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
	return Math.round(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
