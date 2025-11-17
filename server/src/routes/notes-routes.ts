import { Router } from "express"
import { NotesController } from "../controllers/notes-controller"

const notesRoutes = Router()
const notesController = new NotesController()

notesRoutes.get("/", notesController.index)
notesRoutes.get("/:id", notesController.show)
notesRoutes.post("/", notesController.create)
notesRoutes.patch("/:id", notesController.update)
notesRoutes.delete("/:id", notesController.remove)

export { notesRoutes }
