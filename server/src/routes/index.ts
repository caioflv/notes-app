import { Router } from "express"

import { notesRoutes } from "./notes-routes"
import { notebooksRoutes } from "./notebooks-routes"
import { sessionsRoutes } from "./sessions-routes"

const routes = Router()

routes.use("/sessions", sessionsRoutes)
routes.use("/notebooks", notebooksRoutes)
routes.use("/notes", notesRoutes)

export { routes }
