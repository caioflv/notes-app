import { Router } from "express"
import { NotebooksController } from "../controllers/notebooks-controller"
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated"
import { verifyUserAuthorization } from "../middlewares/verifyUserAuthorization"

const notebooksRoutes = Router()
const notebooksController = new NotebooksController()

notebooksRoutes.get("/", notebooksController.index)
notebooksRoutes.get("/:notebook_id", notebooksController.show)
notebooksRoutes.post(
	"/",
	ensureAuthenticated,
	verifyUserAuthorization(["common"]),
	notebooksController.create
)
notebooksRoutes.patch(
	"/:id",
	ensureAuthenticated,
	verifyUserAuthorization(["common"]),
	notebooksController.update
)
notebooksRoutes.delete(
	"/:id",
	ensureAuthenticated,
	verifyUserAuthorization(["common"]),
	notebooksController.remove
)

export { notebooksRoutes }
