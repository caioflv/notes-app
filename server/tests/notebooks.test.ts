import { afterEach, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import {
	createNote,
	createNotebook,
	createTestContext,
	login,
	type TestContext,
} from "./helpers"

describe("notebooks", () => {
	let ctx: TestContext
	let token: string

	beforeEach(async () => {
		ctx = await createTestContext()
		token = await login(ctx.app)
	})

	afterEach(async () => {
		await ctx.cleanup()
	})

	const auth = () => ({ Authorization: `Bearer ${token}` })

	describe("GET /notebooks", () => {
		it("returns an empty list on a fresh database", async () => {
			const response = await request(ctx.app).get("/notebooks").set(auth())

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true, notebooks: [] })
		})

		it("lists notebooks with id, title and timestamps", async () => {
			await createNotebook(ctx.app, token, "First")
			await createNotebook(ctx.app, token, "Second")

			const response = await request(ctx.app).get("/notebooks").set(auth())

			expect(response.status).toBe(200)
			expect(response.body.success).toBe(true)
			expect(response.body.notebooks).toHaveLength(2)
			expect(response.body.notebooks.map((n: any) => n.title).sort()).toEqual([
				"First",
				"Second",
			])
			expect(response.body.notebooks[0]).toEqual({
				id: expect.any(Number),
				title: expect.any(String),
				created_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
				updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/),
			})
		})
	})

	describe("POST /notebooks", () => {
		it("returns 201 with the new id and the caller role", async () => {
			const response = await request(ctx.app)
				.post("/notebooks")
				.set(auth())
				.send({ title: "Work", ignored: "field" })

			expect(response.status).toBe(201)
			expect(response.body).toEqual({ success: true, id: 1, userRole: "common" })

			const rows = await ctx.knex("notebooks").select()
			expect(rows).toHaveLength(1)
			expect(rows[0].title).toBe("Work")
		})

		it("BUG atual: empty title returns 500 with the raw Zod error instead of 400", async () => {
			const response = await request(ctx.app)
				.post("/notebooks")
				.set(auth())
				.send({ title: "" })

			expect(response.status).toBe(500)
			expect(response.body.message).toContain(
				"title lenght must be greater than 1 character",
			)
		})

		it("BUG atual: missing title returns 500 instead of 400", async () => {
			const response = await request(ctx.app).post("/notebooks").set(auth()).send({})

			expect(response.status).toBe(500)
			expect(response.body.message).toContain("invalid_type")
		})

		it("BUG atual: whitespace-only title is accepted", async () => {
			const response = await request(ctx.app)
				.post("/notebooks")
				.set(auth())
				.send({ title: "   " })

			expect(response.status).toBe(201)
			const row = await ctx.knex("notebooks").where({ id: response.body.id }).first()
			expect(row.title).toBe("   ")
		})
	})

	describe("GET /notebooks/:notebook_id", () => {
		it("returns the notes of the notebook (not the notebook itself) with parsed content", async () => {
			const notebookId = await createNotebook(ctx.app, token, "Work")
			const otherId = await createNotebook(ctx.app, token, "Other")
			const noteId = await createNote(ctx.app, token, {
				title: "Note",
				content: "hello",
				notebook_id: notebookId,
			})
			await createNote(ctx.app, token, {
				title: "Elsewhere",
				content: "x",
				notebook_id: otherId,
			})

			const response = await request(ctx.app).get(`/notebooks/${notebookId}`)

			expect(response.status).toBe(200)
			expect(response.body).toEqual({
				success: true,
				notes: [{ id: noteId, notebook_id: notebookId, title: "Note", content: "hello" }],
			})
		})

		it("BUG atual: nonexistent notebook returns 200 with an empty list instead of 404", async () => {
			const response = await request(ctx.app).get("/notebooks/999")

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true, notes: [] })
		})
	})

	describe("PATCH /notebooks/:id", () => {
		it("renames the notebook and returns { success: true }", async () => {
			const id = await createNotebook(ctx.app, token, "Old")

			const response = await request(ctx.app)
				.patch(`/notebooks/${id}`)
				.set(auth())
				.send({ title: "New" })

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true })
			const row = await ctx.knex("notebooks").where({ id }).first()
			expect(row.title).toBe("New")
		})

		it("BUG atual: nonexistent notebook returns 200 { success: true } instead of 404", async () => {
			const response = await request(ctx.app)
				.patch("/notebooks/999")
				.set(auth())
				.send({ title: "New" })

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true })
		})

		it("BUG atual: non-numeric id returns 500 instead of 400", async () => {
			const response = await request(ctx.app)
				.patch("/notebooks/abc")
				.set(auth())
				.send({ title: "New" })

			expect(response.status).toBe(500)
			expect(response.body.message).toContain("invalid_type")
		})

		it("BUG atual: empty title returns 500 instead of 400", async () => {
			const id = await createNotebook(ctx.app, token, "Old")

			const response = await request(ctx.app)
				.patch(`/notebooks/${id}`)
				.set(auth())
				.send({ title: "" })

			expect(response.status).toBe(500)
			expect(response.body.message).toContain(
				"title lenght must be greater than 1 character",
			)
		})
	})

	describe("DELETE /notebooks/:id", () => {
		it("deletes the notebook and all of its notes, keeping other notebooks' notes", async () => {
			const id = await createNotebook(ctx.app, token, "Doomed")
			const keptId = await createNotebook(ctx.app, token, "Kept")
			await createNote(ctx.app, token, { title: "a", content: "a", notebook_id: id })
			await createNote(ctx.app, token, { title: "b", content: "b", notebook_id: id })
			const keptNoteId = await createNote(ctx.app, token, {
				title: "c",
				content: "c",
				notebook_id: keptId,
			})

			const response = await request(ctx.app).delete(`/notebooks/${id}`).set(auth())

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true, id })
			expect(await ctx.knex("notebooks").select("id")).toEqual([{ id: keptId }])
			expect(await ctx.knex("notes").select("id")).toEqual([{ id: keptNoteId }])
		})

		it("BUG atual: nonexistent notebook returns 200 { success: true } instead of 404", async () => {
			const response = await request(ctx.app).delete("/notebooks/999").set(auth())

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true, id: 999 })
		})
	})
})
