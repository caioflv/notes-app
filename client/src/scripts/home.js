import { Events } from "./events/event-manager.js"

const createNoteBtn = document.querySelector(".add-note")
const createNotebookBtn = document.querySelector(".add-notebook")

function loadHome() {
	Events.emit("GetNotes", {})
	Events.emit("GetNotebooks", {})
}

createNoteBtn.addEventListener("click", () => {
	const newNote = {
		title: "Title",
		content: "",
		notebook_id: -1,
	}

	Events.emit("EditNote", newNote)
})
createNotebookBtn.addEventListener("click", () => {
	Events.emit("AddNotebookBtnPress", {})
})

export { loadHome }
