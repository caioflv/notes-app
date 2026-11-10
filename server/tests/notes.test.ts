import { afterEach, beforeEach, describe, expect, it } from "vitest"
import request from "supertest"
import {
	createNote,
	createNotebook,
	createTestContext,
	login,
	type TestContext,
} from "./helpers"

describe("notes", () => {
	let ctx: TestContext
	let token: string
	let notebookId: number

	beforeEach(async () => {
		ctx = await createTestContext()
		token = await login(ctx.app)
		notebookId = await createNotebook(ctx.app, token, "Notebook")
	})

	afterEach(async () => {
		await ctx.cleanup()
	})

	const auth = () => ({ Authorization: `Bearer ${token}` })

	describe("POST /notes", () => {
		it("CURRENT BUG: returns 201 with the new id wrapped in an array", async () => {
			const response = await request(ctx.app)
				.post("/notes")
				.set(auth())
				.send({ title: "Title", content: "Body", notebook_id: notebookId })

			expect(response.status).toBe(201)
			expect(response.body).toEqual({ success: true, id: [1] })
		})

		it("stores content JSON-encoded in the database", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: 'line 1\nline "2"',
				notebook_id: notebookId,
			})

			const row = await ctx.knex("notes").where({ id }).first()
			expect(row.content).toBe('"line 1\\nline \\"2\\""')
			expect(row.notebook_id).toBe(notebookId)
		})

		it("CURRENT BUG: empty content is stored and returned as the string \"[]\"", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: "   ",
				notebook_id: notebookId,
			})

			const row = await ctx.knex("notes").where({ id }).first()
			expect(row.content).toBe('"[]"')

			const response = await request(ctx.app).get(`/notes/${id}`)
			expect(response.body.note.content).toBe("[]")
		})

		it("CURRENT BUG: nonexistent notebook_id is accepted and creates an orphan note", async () => {
			const response = await request(ctx.app)
				.post("/notes")
				.set(auth())
				.send({ title: "Orphan", content: "x", notebook_id: 99999 })

			expect(response.status).toBe(201)
			const row = await ctx.knex("notes").where({ id: response.body.id[0] }).first()
			expect(row.notebook_id).toBe(99999)
		})

		it("CURRENT BUG: missing content returns 500 instead of 400", async () => {
			const response = await request(ctx.app)
				.post("/notes")
				.set(auth())
				.send({ title: "Title", notebook_id: notebookId })

			expect(response.status).toBe(500)
			expect(response.body.message).toContain("invalid_type")
		})

		it("CURRENT BUG: notebook_id sent as a string returns 500 instead of 400", async () => {
			const response = await request(ctx.app)
				.post("/notes")
				.set(auth())
				.send({ title: "Title", content: "x", notebook_id: String(notebookId) })

			expect(response.status).toBe(500)
			expect(response.body.message).toContain("expected number")
		})

		it("CURRENT BUG: empty title returns 500 instead of 400", async () => {
			const response = await request(ctx.app)
				.post("/notes")
				.set(auth())
				.send({ title: "", content: "x", notebook_id: notebookId })

			expect(response.status).toBe(500)
			expect(response.body.message).toContain(
				"title lenght must be greater than 1 character",
			)
		})
	})

	describe("GET /notes", () => {
		it("returns all notes with content decoded as a string", async () => {
			const otherNotebook = await createNotebook(ctx.app, token, "Other")
			await createNote(ctx.app, token, { title: "A", content: "a", notebook_id: notebookId })
			await createNote(ctx.app, token, {
				title: "B",
				content: "b",
				notebook_id: otherNotebook,
			})

			const response = await request(ctx.app).get("/notes").set(auth())

			expect(response.status).toBe(200)
			expect(response.body.success).toBe(true)
			expect(response.body.notes).toHaveLength(2)
			const noteA = response.body.notes.find((n: any) => n.title === "A")
			expect(noteA).toEqual({
				id: expect.any(Number),
				notebook_id: notebookId,
				title: "A",
				content: "a",
				created_at: expect.any(String),
				updated_at: expect.any(String),
			})
		})

		it("CURRENT BUG: a single note with non-JSON content makes GET /notes fail with 500", async () => {
			await createNote(ctx.app, token, { title: "ok", content: "ok", notebook_id: notebookId })
			await ctx.knex("notes").insert({
				title: "legacy",
				content: "not json",
				notebook_id: notebookId,
			})

			const response = await request(ctx.app).get("/notes")

			expect(response.status).toBe(500)
			expect(response.body.message).toMatch(/JSON/)
		})

		it("returns null content for notes stored with NULL content", async () => {
			await ctx.knex("notes").insert({ title: "null", content: null, notebook_id: notebookId })

			const response = await request(ctx.app).get("/notes")

			expect(response.status).toBe(200)
			expect(response.body.notes[0].content).toBeNull()
		})
	})

	describe("GET /notes/:id", () => {
		it("returns { success: true, note } for an existing note", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: "Body",
				notebook_id: notebookId,
			})

			const response = await request(ctx.app).get(`/notes/${id}`)

			expect(response.status).toBe(200)
			expect(response.body).toEqual({
				success: true,
				note: {
					id,
					notebook_id: notebookId,
					title: "Title",
					content: "Body",
					created_at: expect.any(String),
					updated_at: expect.any(String),
				},
			})
		})

		it("CURRENT BUG: nonexistent note returns 200 { success: false } instead of 404", async () => {
			const response = await request(ctx.app).get("/notes/999")

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: false })
		})

		it("CURRENT BUG: non-numeric id returns 200 { success: false } instead of 400", async () => {
			const response = await request(ctx.app).get("/notes/abc")

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: false })
		})
	})

	describe("PATCH /notes/:id", () => {
		it("updates title and content independently", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Old",
				content: "old",
				notebook_id: notebookId,
			})

			const titleOnly = await request(ctx.app)
				.patch(`/notes/${id}`)
				.set(auth())
				.send({ title: "New" })
			expect(titleOnly.status).toBe(200)
			expect(titleOnly.body).toEqual({ success: true })

			await request(ctx.app).patch(`/notes/${id}`).set(auth()).send({ content: "new" })

			const row = await ctx.knex("notes").where({ id }).first()
			expect(row.title).toBe("New")
			expect(row.content).toBe('"new"')
		})

		it("CURRENT BUG: notebook_id in the body is silently ignored (note cannot change notebook)", async () => {
			const otherNotebook = await createNotebook(ctx.app, token, "Other")
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: "x",
				notebook_id: notebookId,
			})

			const response = await request(ctx.app)
				.patch(`/notes/${id}`)
				.set(auth())
				.send({ notebook_id: otherNotebook })

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true })
			const row = await ctx.knex("notes").where({ id }).first()
			expect(row.notebook_id).toBe(notebookId)
		})

		it("CURRENT BUG: empty content is saved as the string \"[]\"", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: "x",
				notebook_id: notebookId,
			})

			await request(ctx.app).patch(`/notes/${id}`).set(auth()).send({ content: "" })

			const row = await ctx.knex("notes").where({ id }).first()
			expect(row.content).toBe('"[]"')
		})

		it("accepts an empty body and returns { success: true }", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: "x",
				notebook_id: notebookId,
			})

			const response = await request(ctx.app).patch(`/notes/${id}`).set(auth()).send({})

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true })
			const row = await ctx.knex("notes").where({ id }).first()
			expect(row.title).toBe("Title")
			expect(row.content).toBe('"x"')
		})

		it("CURRENT BUG: nonexistent note returns 200 { success: true } instead of 404", async () => {
			const response = await request(ctx.app)
				.patch("/notes/999")
				.set(auth())
				.send({ title: "New" })

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true })
		})

		it("CURRENT BUG: empty title returns 500 instead of 400", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: "x",
				notebook_id: notebookId,
			})

			const response = await request(ctx.app)
				.patch(`/notes/${id}`)
				.set(auth())
				.send({ title: "" })

			expect(response.status).toBe(500)
			expect(response.body.message).toContain(
				"title lenght must be greater than 1 character",
			)
		})
	})

	describe("DELETE /notes/:id", () => {
		it("deletes the note and returns its numeric id", async () => {
			const id = await createNote(ctx.app, token, {
				title: "Title",
				content: "x",
				notebook_id: notebookId,
			})

			const response = await request(ctx.app).delete(`/notes/${id}`).set(auth())

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true, id })
			expect(await ctx.knex("notes").select()).toEqual([])
		})

		it("CURRENT BUG: nonexistent note returns 200 { success: true } instead of 404", async () => {
			const response = await request(ctx.app).delete("/notes/999").set(auth())

			expect(response.status).toBe(200)
			expect(response.body).toEqual({ success: true, id: 999 })
		})

		it("CURRENT BUG: non-numeric id returns 500 instead of 400", async () => {
			const response = await request(ctx.app).delete("/notes/abc").set(auth())

			expect(response.status).toBe(500)
			expect(response.body.message).toContain("invalid_type")
		})
	})
})
