import "./styles/global.css"
import "./styles/header.css"
import "./styles/main.css"
import "./styles/filters.css"
import "./styles/note-edit.css"
import "./styles/add-notebook.css"
import "./styles/note.css"

import "./styles/utils.css"

//

import "./scripts/events/event-manager.js"
import "./scripts/libs/dayjs.js"

import "./scripts/services/api/config.js"
import "./scripts/services/api/api-com.js"

import "./scripts/services/notebooks.js"
import "./scripts/services/notes.js"
import "./scripts/services/session.js"

import "./scripts/notes-list.js"
import "./scripts/note-edit.js"
import "./scripts/notebooks-select.js"
import "./scripts/new-notebook-screen.js"
import "./scripts/home.js"

import { loadHome } from "./scripts/home.js"
import { setToken } from "./scripts/services/api/config.js"
import { Events } from "./scripts/events/event-manager.js"

document.addEventListener("DOMContentLoaded", () => {
	Events.emit("LogIn", { username: "caio", password: "123" })
})

Events.on("OnLoggedIn", (e) => {
	console.log(e.detail)
	if (e.detail.token) {
		setToken(String(e.detail.token))
		loadHome()
	}
})
