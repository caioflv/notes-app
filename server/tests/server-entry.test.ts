import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import jwt from "jsonwebtoken"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTestContext, type TestContext } from "./helpers"

const serverRoot = path.resolve(__dirname, "..")
// Absolute file URL: a bare "tsx" specifier would be resolved from the child's
// temporary cwd, where node_modules does not exist.
const tsxLoader = pathToFileURL(
	createRequire(import.meta.url).resolve("tsx", { paths: [serverRoot] }),
).href

function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const srv = net.createServer()
		srv.listen(0, () => {
			const { port } = srv.address() as net.AddressInfo
			srv.close(() => resolve(port))
		})
		srv.on("error", reject)
	})
}

function startServer(cwd: string, env: NodeJS.ProcessEnv): Promise<ChildProcess> {
	return new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			["--import", tsxLoader, path.join(serverRoot, "src", "server.ts")],
			{ cwd, env },
		)
		let output = ""
		const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 15000)
		const onData = (chunk: Buffer) => {
			output += chunk.toString()
			if (output.includes("Server is running")) {
				clearTimeout(timer)
				resolve(child)
			}
		}
		child.stdout.on("data", onData)
		child.stderr.on("data", onData)
		child.on("exit", (code) => {
			clearTimeout(timer)
			reject(new Error(`server exited with code ${code}:\n${output}`))
		})
	})
}

function stopServer(child: ChildProcess): Promise<void> {
	if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
	return new Promise((resolve) => {
		child.once("exit", () => resolve())
		child.kill()
	})
}

describe("src/server.ts entry point", () => {
	let ctx: TestContext
	let cwd: string
	let child: ChildProcess | undefined

	beforeEach(async () => {
		ctx = await createTestContext()
		cwd = fs.mkdtempSync(path.join(os.tmpdir(), "notes-api-cwd-"))
	})

	afterEach(async () => {
		if (child) await stopServer(child)
		child = undefined
		fs.rmSync(cwd, { recursive: true, force: true })
		await ctx.cleanup()
	})

	it("CURRENT BUG: AUTH_SECRET from .env is ignored and JWTs are signed/verified with \"default\"", async () => {
		const port = await freePort()
		fs.writeFileSync(
			path.join(cwd, ".env"),
			`DATABASE_URL="file:./db/database.db"\nAUTH_SECRET=from-dotenv\nPORT=${port}\n`,
		)
		const { AUTH_SECRET: _ignored, ...parentEnv } = process.env
		child = await startServer(cwd, { ...parentEnv, DATABASE_FILE: ctx.dbFile })

		const baseUrl = `http://127.0.0.1:${port}`
		const login = await request(baseUrl)
			.post("/sessions")
			.send({ username: "caio", password: "123" })

		expect(() => jwt.verify(login.body.token, "default")).not.toThrow()
		expect(() => jwt.verify(login.body.token, "from-dotenv")).toThrow()

		const forged = jwt.sign({ role: "common" }, "default", { subject: "1" })
		const response = await request(baseUrl)
			.post("/notebooks")
			.set("Authorization", `Bearer ${forged}`)
			.send({ title: "created with a forged token" })

		expect(response.status).toBe(201)
	})

	it("fails to start when DATABASE_URL or AUTH_SECRET are missing", async () => {
		const { AUTH_SECRET: _a, DATABASE_URL: _d, ...parentEnv } = process.env

		await expect(startServer(cwd, parentEnv)).rejects.toThrow(/exited with code 1[\s\S]*DATABASE_URL[\s\S]*AUTH_SECRET/)
	})
})
