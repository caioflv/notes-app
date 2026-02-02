import express, { Request, Response, NextFunction } from "express"
import path from "path"
import cors from "cors"

import { routes } from "./routes/index"
import { setHeader } from "./middlewares/header"
import { env } from "./env"

const PORT = env.PORT

const clientPath = path.resolve(process.cwd(), "../client/build")

const app = express()

app.use(express.json())

app.use(
	cors({
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
	}),
)

app.use(setHeader)

app.use(express.static(clientPath))

app.use(routes)

app.use((error: any, request: Request, response: Response, _: NextFunction) => {
	response.status(500).json({ message: error.message })
})

app.get(/.*/, (req, res) => {
	const indexPath = path.join(clientPath, "index.html")
	res.sendFile(indexPath, (err) => {
		if (err) {
			console.error("Failed to send index.html:", err)
			res.status(500).send("Internal error")
		}
	})
})

app.listen(PORT, "0.0.0.0", () => {
	console.log(`Server is running on port ${PORT}`)
	console.log(`Front path on: ${clientPath}`)
})
