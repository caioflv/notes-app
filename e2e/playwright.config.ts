import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, devices } from "@playwright/test"

// The client calls the API at a hard-coded http://192.168.0.110:3333
// (client/src/scripts/services/api/config.js), so the API must listen on port 3333 and
// that IP must be a local address. See "Como rodar" in the README.
const API_HOST = "192.168.0.110"
const API_PORT = 3333
const CLIENT_PORT = 3005

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const serverDir = path.join(root, "server")
const clientDir = path.join(root, "client")

// The config is loaded by the runner and by every worker. Only the runner prepares the
// database; workers inherit E2E_DATABASE_FILE from it.
if (!process.env.E2E_DATABASE_FILE) {
	const hasApiHost = Object.values(os.networkInterfaces())
		.flat()
		.some((address) => address?.address === API_HOST)
	if (!hasApiHost) {
		throw new Error(
			`${API_HOST} is not a local address. The client calls the API there, so add it as a ` +
				`loopback alias first (Linux: sudo ip addr add ${API_HOST}/32 dev lo). See README.md.`,
		)
	}

	const tmpDir = path.join(root, "e2e", ".tmp")
	fs.rmSync(tmpDir, { recursive: true, force: true })
	fs.mkdirSync(tmpDir, { recursive: true })
	const dbFile = path.join(tmpDir, "database.db")

	execFileSync(
		process.execPath,
		[
			"--import",
			"tsx",
			"node_modules/knex/bin/cli.js",
			"migrate:latest",
			"--client",
			"sqlite3",
			"--connection",
			dbFile,
			"--migrations-directory",
			"src/database/migrations",
		],
		{ cwd: serverDir, stdio: "pipe" },
	)

	process.env.E2E_DATABASE_FILE = dbFile
}

export default defineConfig({
	testDir: "tests",
	// All tests share one server and one database.
	workers: 1,
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: `http://localhost:${CLIENT_PORT}`,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: [
		{
			command: "node --import tsx src/server.ts",
			cwd: serverDir,
			url: `http://${API_HOST}:${API_PORT}/notebooks`,
			reuseExistingServer: false,
			timeout: 60_000,
			stdout: "pipe",
			env: {
				DATABASE_FILE: process.env.E2E_DATABASE_FILE,
				DATABASE_URL: "file:./db/database.db",
				AUTH_SECRET: "e2e-secret",
				PORT: String(API_PORT),
			},
		},
		{
			command: "npm run dev -- --no-open",
			cwd: clientDir,
			url: `http://localhost:${CLIENT_PORT}`,
			reuseExistingServer: false,
			timeout: 120_000,
		},
	],
})
