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

import "./scripts/notes-list.js"
import "./scripts/note-edit.js"
import "./scripts/notebooks-select.js"
import "./scripts/new-notebook-screen.js"
import "./scripts/home.js"

import { loadHome } from "./scripts/home.js"

document.addEventListener("DOMContentLoaded", () => {
	loadHome()
})
