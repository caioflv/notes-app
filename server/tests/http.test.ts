import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import request from "supertest"
import { createTestContext, login, type TestContext } from "./helpers"

describe("HTTP middleware and fallback", () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = await createTestContext()
	})

	afterEach(async () => {
		await ctx.cleanup()
	})

	it("allows any origin via CORS", async () => {
		const response = await request(ctx.app)
			.get("/notebooks")
			.set("Origin", "https://evil.example")

		expect(response.headers["access-control-allow-origin"]).toBe("*")
	})

	it("answers CORS preflight with the configured methods", async () => {
		const response = await request(ctx.app)
			.options("/notes")
			.set("Origin", "https://example.com")
			.set("Access-Control-Request-Method", "PATCH")

		expect(response.status).toBe(204)
		expect(response.headers["access-control-allow-methods"]).toBe(
			"GET,POST,PUT,DELETE,PATCH",
		)
	})

	it("CURRENT BUG: Content-Security-Policy header is never sent on normal responses", async () => {
		const response = await request(ctx.app).get("/notebooks")

		expect(response.status).toBe(200)
		expect(response.headers["content-security-policy"]).toBeUndefined()
	})

	it("CURRENT BUG: invalid JSON body is swallowed by setHeader and the route runs with an undefined body", async () => {
		const token = await login(ctx.app)

		const response = await request(ctx.app)
			.post("/notebooks")
			.set("Authorization", `Bearer ${token}`)
			.set("Content-Type", "application/json")
			.send("{not json")

		expect(response.status).toBe(500)
		expect(response.body.message).toContain("expected object, received undefined")
		expect(response.headers["content-security-policy"]).toContain("default-src 'self'")
	})

	it("CURRENT BUG: invalid JSON body on /sessions returns 500 with a TypeError message", async () => {
		const response = await request(ctx.app)
			.post("/sessions")
			.set("Content-Type", "application/json")
			.send("{not json")

		expect(response.status).toBe(500)
		expect(response.body.message).toMatch(/Cannot destructure property 'username'/)
	})

	it.each(["/", "/some/client/route"])(
		"CURRENT BUG: GET %s returns 500 because the server looks for the front in client/build",
		async (path) => {
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

			const response = await request(ctx.app).get(path)

			expect(response.status).toBe(500)
			expect(response.text).toBe("Internal error")
			expect(consoleError).toHaveBeenCalledWith(
				"Failed to send index.html:",
				expect.objectContaining({ code: "ENOENT" }),
			)
			consoleError.mockRestore()
		},
	)

	it("returns Express' default 404 for unknown non-GET routes", async () => {
		const response = await request(ctx.app).post("/unknown")

		expect(response.status).toBe(404)
		expect(response.text).toContain("Cannot POST /unknown")
	})
})
