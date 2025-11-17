import dayjs from "dayjs"
import { Events } from "./events/event-manager.js"

const notesView = document.querySelector(".notes-view")
const noteSearch = document.querySelector("#note-search")

let notes = []

noteSearch.addEventListener("input", (e) => {
	filterNotesBySearch(e.target.value)
})

Events.on("OnGetNote", (e) => {})

Events.on("OnGetNotes", (e) => {
	if (e.detail.success) {
		insertNotesOnView(e.detail.notes)
	}
})

Events.on("OnDeleteNote", (e) => {
	const el = notesView.querySelector(`[note-id="${e.detail.id}"]`)

	if (el) {
		el.remove()
	}

	const note = notes.filter((note) => note.id == e.detail.id)
	if (note) {
		notes.pop(note)
	}
})

Events.on("OnDeleteNotebook", (e) => {
	const els = notesView.querySelectorAll(`[notebook-id="${e.detail.id}"]`)

	els.forEach((el) => el.remove())
})

Events.on("InsertNoteOnView", (e) => {
	insertNote(e.detail)
})

Events.on("UpdateNoteOnView", (e) => {
	const el = notesView.querySelector(`[note-id="${e.detail.id}"]`)

	if (el) {
		el.remove()
		insertNote(e.detail)
	}

	const note = notes.filter((note) => note.id == e.detail.id)
	if (note) {
		note.title = e.detail.title
		note.content = e.detail.content
	}
})

Events.on("FilterNotesByNotebookId", (e) => {
	filterNotesByNotebookId(e.detail)
})

function insertNotesOnView(notes) {
	notesView.innerHTML = ""

	for (const note of notes) {
		insertNote(note)
	}
}

function insertNote(note) {
	const item = document.createElement("div")
	item.setAttribute("note-id", note.id)
	item.setAttribute("notebook-id", note.notebook_id)

	const title = document.createElement("h2")
	const content = document.createElement("small")
	const updateAt = document.createElement("p")

	title.textContent = `${note.title}`
	content.textContent = `${note.content}`
	content.textContent = content.textContent.slice(0, 60) + "..."
	updateAt.textContent = `${dayjs(note.updated_at).format(`DD-MMM-YYYY`)}`

	item.addEventListener("click", () => {
		Events.emit("EditNote", note)
	})

	item.appendChild(title)
	item.appendChild(content)
	item.appendChild(updateAt)

	item.classList.add("note-wrapper")

	notesView.appendChild(item)

	notes.push(note)
}

function filterNotesByNotebookId(notebookId) {
	for (const noteE of notesView.children) {
		noteE.classList.toggle("hidden", false)
	}
	if (notebookId == -1) return

	for (const noteE of notesView.children) {
		if (noteE.getAttribute("notebook-id") != notebookId) {
			noteE.classList.toggle("hidden", true)
		}
	}
}

function filterNotesBySearch(searchText) {
	const results = notes.filter(
		(note) =>
			note.title.toLowerCase().includes(searchText.toLowerCase()) ||
			note.content.toLowerCase().includes(searchText.toLowerCase())
	)

	for (const noteE of notesView.children) {
		noteE.classList.toggle("hidden-by-search", true)
	}
	for (const noteE of notesView.children) {
		const id = noteE.getAttribute("note-id")
		const notFound = results.findIndex((note) => note.id == id) === -1

		noteE.classList.toggle("hidden-by-search", notFound)
	}
}
