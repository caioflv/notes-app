import { afterEach, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import { createTestContext, type TestContext } from "./helpers"

describe("authentication and authorization", () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = await createTestContext()
	})

	afterEach(async () => {
		await ctx.cleanup()
	})

	it.each(["/notes", "/notes/1", "/notebooks", "/notebooks/1"])(
		"CURRENT BUG: GET %s is public (200 without a token)",
		async (path) => {
			const response = await request(ctx.app).get(path)

			expect(response.status).toBe(200)
		},
	)

	it("CURRENT BUG: GET /notes exposes every note to anonymous callers", async () => {
		await ctx.knex("notebooks").insert({ id: 1, title: "Private" })
		await ctx.knex("notes").insert({ title: "Secret", content: '"pin 1234"', notebook_id: 1 })

		const response = await request(ctx.app).get("/notes")

		expect(response.body.notes[0]).toMatchObject({ title: "Secret", content: "pin 1234" })
	})

	const mutatingRoutes: Array<[string, string]> = [
		["post", "/notebooks"],
		["patch", "/notebooks/1"],
		["delete", "/notebooks/1"],
		["post", "/notes"],
		["patch", "/notes/1"],
		["delete", "/notes/1"],
	]

	it.each(mutatingRoutes)(
		"CURRENT BUG: %s %s without Authorization header returns 500 instead of 401",
		async (method, path) => {
			const response = await (request(ctx.app) as any)[method](path).send({})

			expect(response.status).toBe(500)
			expect(response.body).toEqual({ message: "jwt must be provided" })
		},
	)

	it("CURRENT BUG: Authorization header without the Bearer prefix returns 500", async () => {
		const token = jwt.sign({ role: "common" }, "test-secret", { subject: "1" })

		const response = await request(ctx.app)
			.post("/notebooks")
			.set("Authorization", token)
			.send({ title: "x" })

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: "jwt must be provided" })
	})

	it("CURRENT BUG: malformed token returns 500 instead of 401", async () => {
		const response = await request(ctx.app)
			.post("/notebooks")
			.set("Authorization", "Bearer garbage")
			.send({ title: "x" })

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: "jwt malformed" })
	})

	it("CURRENT BUG: token signed with another secret returns 500 instead of 401", async () => {
		const token = jwt.sign({ role: "common" }, "another-secret", { subject: "1" })

		const response = await request(ctx.app)
			.post("/notebooks")
			.set("Authorization", `Bearer ${token}`)
			.send({ title: "x" })

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: "invalid signature" })
	})

	it("CURRENT BUG: expired token returns 500 instead of 401", async () => {
		const token = jwt.sign(
			{ role: "common", exp: Math.floor(Date.now() / 1000) - 60 },
			"test-secret",
			{ subject: "1" },
		)

		const response = await request(ctx.app)
			.post("/notebooks")
			.set("Authorization", `Bearer ${token}`)
			.send({ title: "x" })

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: "jwt expired" })
	})

	it("CURRENT BUG: valid token with a role other than common returns 500 instead of 403", async () => {
		const token = jwt.sign({ role: "admin" }, "test-secret", { subject: "1" })

		const response = await request(ctx.app)
			.post("/notebooks")
			.set("Authorization", `Bearer ${token}`)
			.send({ title: "x" })

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: "Unauthorized access!" })
	})

	it("accepts any token signed with AUTH_SECRET, regardless of subject", async () => {
		const token = jwt.sign({ role: "common" }, "test-secret", { subject: "42" })

		const response = await request(ctx.app)
			.post("/notebooks")
			.set("Authorization", `Bearer ${token}`)
			.send({ title: "x" })

		expect(response.status).toBe(201)
	})
})
