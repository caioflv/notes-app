import express from "express"
import path from "path"
import cors from "cors"

import { routes } from "./routes/index"
import { setHeader } from "./middlewares/header"

const PORT = 3333
const clientPath = path.resolve(__dirname, "../../client/dist")

const app = express()

app.use(express.json())

app.use(
	cors({
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
	})
)

app.use(setHeader)

app.use(express.static(clientPath))

app.use(routes)

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
