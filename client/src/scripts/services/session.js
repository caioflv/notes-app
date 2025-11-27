import { Events } from "../events/event-manager.js"
import { SESSIONS_PATH } from "./api/config.js"
import { apiPost } from "./api/api-com.js"

Events.on("LogIn", (e) => {
	logIn(e.detail)
})

async function logIn(detail) {
	const data = await apiPost(SESSIONS_PATH, detail, false)
	Events.emit("OnLoggedIn", data)
}
