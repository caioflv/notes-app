import { Request, Response, NextFunction } from "express"
import { knex } from "../database/knex"
import z from "zod"

class NotesController {
	async index(request: Request, response: Response, next: NextFunction) {
		try {
			const notes = await knex("notes").select().orderBy("created_at")

			const parsedNotes = notes.map((note) => ({
				...note,
				content: JSON.parse(note.content),
			}))
			return response.json({ success: true, notes: parsedNotes })
		} catch (error) {
			next(error)
		}
	}

	async show(request: Request, response: Response, next: NextFunction) {
		try {
			const { id } = request.params

			const note = await knex("notes").select().where({ id }).first()

			if (note) {
				const parsedNote = { ...note, content: JSON.parse(note.content) }
				return response.json({ success: true, note: parsedNote })
			}
			return response.json({ success: false })
		} catch (error) {
			next(error)
		}
	}

	async create(request: Request, response: Response, next: NextFunction) {
		try {
			const bodySchema = z.object({
				title: z
					.string()
					.min(1, { message: "title lenght must be greater than 1 character" }),
				content: z
					.string()
					.transform((val) => (val.trim() === "" ? "[]" : val)),
				notebook_id: z.number(),
			})

			const { title, content, notebook_id } = bodySchema.parse(request.body)

			const id = await knex<NoteRepository>("notes").insert({
				title,
				content: JSON.stringify(content),
				notebook_id,
			})

			return response.status(201).json({ success: true, id: id })
		} catch (error) {
			next(error)
		}
	}

	async update(request: Request, response: Response, next: NextFunction) {
		try {
			const params = z.object({
				id: z.coerce.number(),
			})

			const bodySchema = z.object({
				title: z
					.string()
					.min(1, { message: "title lenght must be greater than 1 character" })
					.optional(),
				content: z
					.string()
					.transform((val) => (val.trim() === "" ? "[]" : val))
					.optional(),
			})

			let body = bodySchema.parse(request.body)
			if (body.content) {
				body.content = JSON.stringify(body.content)
			}

			const { id } = params.parse(request.params)

			await knex<NoteRepository>("notes")
				.update({
					...body,
					updated_at: knex.fn.now(),
				})
				.where({ id })

			return response.json({ success: true })
		} catch (error) {
			next(error)
		}
	}

	async remove(request: Request, response: Response, next: NextFunction) {
		try {
			const params = z.object({
				id: z.coerce.number(),
			})

			const { id } = params.parse(request.params)

			await knex<NoteRepository>("notes").delete().where({ id })

			return response.json({ success: true, id: id })
		} catch (error) {
			next(error)
		}
	}
}

export { NotesController }
