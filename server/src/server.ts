import { app, clientPath } from "./app"
import { env } from "./env"

const PORT = env.PORT

app.listen(PORT, "0.0.0.0", () => {
	console.log(`Server is running on port ${PORT}`)
	console.log(`Front path on: ${clientPath}`)
})
