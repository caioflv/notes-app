import { Router } from "express"
import { NotesController } from "../controllers/notes-controller"
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated"
import { verifyUserAuthorization } from "../middlewares/verifyUserAuthorization"

const notesRoutes = Router()
const notesController = new NotesController()

notesRoutes.get("/", notesController.index)
notesRoutes.get("/:id", notesController.show)
notesRoutes.post(
	"/",
	ensureAuthenticated,
	verifyUserAuthorization(["common"]),
	notesController.create
)
notesRoutes.patch(
	"/:id",
	ensureAuthenticated,
	verifyUserAuthorization(["common"]),
	notesController.update
)
notesRoutes.delete(
	"/:id",
	ensureAuthenticated,
	verifyUserAuthorization(["common"]),
	notesController.remove
)

export { notesRoutes }
