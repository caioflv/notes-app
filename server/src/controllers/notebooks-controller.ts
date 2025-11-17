import { Request, Response, NextFunction } from "express"
import { knex } from "../database/knex"
import z from "zod"

class NotebooksController {
	async index(request: Request, response: Response, next: NextFunction) {
		try {
			const notebooks = await knex("notebooks").select().orderBy("created_at")

			return response.json({ success: true, notebooks: notebooks })
		} catch (error) {
			next(error)
		}
	}

	async show(request: Request, response: Response, next: NextFunction) {
		try {
			const { notebook_id } = request.params

			const notes = await knex("notes")
				.select(
					"notes.id",
					"notebooks.id as notebook_id",
					"notes.title",
					"notes.content"
				)
				.join("notebooks", "notebooks.id", "notes.notebook_id")
				.where({ notebook_id })

			const parsedNotes = notes.map((note) => ({
				...note,
				content: JSON.parse(note.content),
			}))

			return response.json({ success: true, notes: parsedNotes })
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
			})

			const { title } = bodySchema.parse(request.body)

			const result = await knex<NotebookRepository>("notebooks")
				.insert({
					title,
				})
				.returning("id")

			return response.status(201).json({ success: true, id: result[0].id })
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
					.min(1, { message: "title lenght must be greater than 1 character" }),
			})

			const { id } = params.parse(request.params)
			const { title } = bodySchema.parse(request.body)

			await knex<NotebookRepository>("notebooks")
				.update({
					title,
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

			await knex<NoteRepository>("notes").delete().where({ notebook_id: id })
			await knex<NotebookRepository>("notebooks").delete().where({ id })

			return response.json({ success: true, id: id })
		} catch (error) {
			next(error)
		}
	}
}

export { NotebooksController }
