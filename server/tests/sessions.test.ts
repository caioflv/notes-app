import { afterEach, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import jwt from "jsonwebtoken"
import { createTestContext, type TestContext } from "./helpers"

describe("POST /sessions", () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = await createTestContext()
	})

	afterEach(async () => {
		await ctx.cleanup()
	})

	it("returns 200 and a JWT for the hard-coded user caio/123", async () => {
		const response = await request(ctx.app)
			.post("/sessions")
			.send({ username: "caio", password: "123" })

		expect(response.status).toBe(200)
		expect(Object.keys(response.body)).toEqual(["token"])

		const payload = jwt.verify(response.body.token, "test-secret") as jwt.JwtPayload
		expect(payload.sub).toBe("1")
		expect(payload.role).toBe("common")
		expect(payload.exp! - payload.iat!).toBe(24 * 60 * 60)
	})

	it("CURRENT BUG: wrong password returns 500 instead of 401", async () => {
		const response = await request(ctx.app)
			.post("/sessions")
			.send({ username: "caio", password: "wrong" })

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: "Email e/ou senha incorreta" })
	})

	it("CURRENT BUG: unknown username returns 500 instead of 401", async () => {
		const response = await request(ctx.app)
			.post("/sessions")
			.send({ username: "someone", password: "123" })

		expect(response.status).toBe(500)
		expect(response.body).toEqual({ message: "Email e/ou senha incorreta" })
	})

	it("CURRENT BUG: request without body returns 500 with a TypeError message", async () => {
		const response = await request(ctx.app).post("/sessions")

		expect(response.status).toBe(500)
		expect(response.body.message).toMatch(
			/Cannot destructure property 'username' of 'request.body'/,
		)
	})
})
