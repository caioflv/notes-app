/// <reference types="vite/client" />
// Each test gets its own temporary SQLite file:
// - vi.resetModules(): src/database/knex.ts creates its connection when it is first
//   imported (reading DATABASE_FILE at that moment), so the modules must be
//   re-imported for each test to point app and knex at the new file.
// - import.meta.glob: knex's default migration loader require()s the .ts files from
//   disk, which plain Node cannot load. Here Vite loads them and passes them to knex
//   through a custom migrationSource, so new migrations are still picked up.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { Express } from "express"
import type { Knex } from "knex"
import request from "supertest"
import { vi } from "vitest"

const migrationModules = import.meta.glob<Knex.Migration>(
	"../src/database/migrations/*.ts",
	{ eager: true },
)

const migrationSource: Knex.MigrationSource<string> = {
	async getMigrations() {
		return Object.keys(migrationModules).sort()
	},
	getMigrationName(migration) {
		return path.basename(migration)
	},
	async getMigration(migration) {
		return migrationModules[migration]
	},
}

export interface TestContext {
	app: Express
	knex: Knex
	dbFile: string
	cleanup: () => Promise<void>
}

export async function createTestContext(): Promise<TestContext> {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-api-test-"))
	const dbFile = path.join(dir, "database.db")
	process.env.DATABASE_FILE = dbFile

	vi.resetModules()
	const { knex } = await import("../src/database/knex")
	await knex.migrate.latest({ migrationSource })
	const { app } = await import("../src/app")

	return {
		app,
		knex,
		dbFile,
		cleanup: async () => {
			await knex.destroy()
			delete process.env.DATABASE_FILE
			fs.rmSync(dir, { recursive: true, force: true })
		},
	}
}

export async function login(app: Express): Promise<string> {
	const response = await request(app)
		.post("/sessions")
		.send({ username: "caio", password: "123" })
	return response.body.token
}

export async function createNotebook(
	app: Express,
	token: string,
	title = "Notebook",
): Promise<number> {
	const response = await request(app)
		.post("/notebooks")
		.set("Authorization", `Bearer ${token}`)
		.send({ title })
	return response.body.id
}

export async function createNote(
	app: Express,
	token: string,
	body: { title: string; content: string; notebook_id: number },
): Promise<number> {
	const response = await request(app)
		.post("/notes")
		.set("Authorization", `Bearer ${token}`)
		.send(body)
	return response.body.id[0]
}
