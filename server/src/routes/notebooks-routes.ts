import { Router } from "express"
import { NotebooksController } from "../controllers/notebooks-controller"

const notebooksRoutes = Router()
const notebooksController = new NotebooksController()

notebooksRoutes.get("/", notebooksController.index)
notebooksRoutes.get("/:notebook_id", notebooksController.show)
notebooksRoutes.post("/", notebooksController.create)
notebooksRoutes.patch("/:id", notebooksController.update)
notebooksRoutes.delete("/:id", notebooksController.remove)

export { notebooksRoutes }
