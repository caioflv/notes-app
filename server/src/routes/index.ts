import { Router } from "express"

import { notesRoutes } from "./notes-routes"
import { notebooksRoutes } from "./notebooks-routes"

const routes = Router()

routes.use("/notebooks", notebooksRoutes)
routes.use("/notes", notesRoutes)

export { routes }
