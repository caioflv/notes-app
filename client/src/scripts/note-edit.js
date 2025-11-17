import { Events } from "./events/event-manager.js"

const editScreen = document.querySelector(".note-edit-screen")
const saveNoteBtn = document.querySelector("#save-note-btn")
const deleteNoteBtn = document.querySelector("#delete-note-btn")
const closeNoteBtn = document.querySelector("#close-note-btn")

const notebookSelection = document.querySelector("#notebook-selection")
const notebookFilter = document.querySelector("#notebook-filter")

const panel = editScreen.querySelector("div")
const title = panel.querySelector("input")
const content = panel.querySelector("textarea")

let selectedNote

Events.on("EditNote", (e) => {
	selectedNote = e.detail

	title.value = selectedNote.title
	content.value = selectedNote.content

	notebookSelection.innerHTML = notebookFilter.innerHTML
	notebookSelection.removeChild(notebookSelection.firstElementChild)
	notebookSelection.value = selectedNote.notebook_id

	toggleEditScreen(true)
})

Events.on("OnPostNote", (e) => {
	if (e.detail.success) {
		selectedNote.id = e.detail.id

		Events.emit("InsertNoteOnView", selectedNote)

		toggleEditScreen(false)
	}
})

Events.on("OnPatchNote", (e) => {
	if (e.detail.success) {
		Events.emit("UpdateNoteOnView", selectedNote)

		toggleEditScreen(false)
	}
})

Events.on("OnDeleteNote", (e) => {
	toggleEditScreen(false)
})

title.addEventListener("input", (event) => {
	selectedNote.title = event.target.value
})

content.addEventListener("input", (event) => {
	selectedNote.content = event.target.value
})

closeNoteBtn.addEventListener("click", () => {
	toggleEditScreen(false)
})

saveNoteBtn.addEventListener("click", () => {
	console.log(selectedNote)
	if (selectedNote.notebook_id == -1) {
		selectedNote.notebook_id = Number(notebookSelection.value)
		Events.emit("PostNote", selectedNote)
	} else {
		selectedNote.notebook_id = Number(selectedNote.notebook_id)
		Events.emit("PatchNote", selectedNote)
	}
})

deleteNoteBtn.addEventListener("click", () => {
	if (selectedNote.id == -1) {
		toggleEditScreen(false)
		return
	}

	Events.emit("DeleteNote", selectedNote.id)
})

function toggleEditScreen(mode) {
	editScreen.classList.toggle("hidden", !mode)
	document.body.classList.toggle("body-lock", mode)
}
