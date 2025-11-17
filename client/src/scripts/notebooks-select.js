import { Events } from "./events/event-manager.js"

const notebookSelect = document.querySelector("#notebook-filter")
const deleteNotebookBtn = document.querySelector(".delete-notebook")

const createNoteBtn = document.querySelector(".add-note")

insertNotebooksOnSelect([])
toggleDeleteNotebookBtn()

deleteNotebookBtn.addEventListener("click", () => {
	Events.emit("DeleteNotebook", notebookSelect.value)
})

Events.on("OnGetNotebooks", (e) => {
	if (e.detail.success) {
		insertNotebooksOnSelect(e.detail.notebooks)
	}
})

Events.on("OnPostNotebook", (e) => {
	if (e.detail.success) {
		insertNotebook(e.detail.notebook)
	}
})

Events.on("OnDeleteNotebook", (e) => {
	if (e.detail.success) {
		const el = notebookSelect.querySelector(`[value="${e.detail.id}"]`)

		if (el) {
			el.remove()
		}

		toggleDeleteNotebookBtn()
	}
})

notebookSelect.addEventListener("change", () => {
	Events.emit("FilterNotesByNotebookId", notebookSelect.value)

	toggleDeleteNotebookBtn()
})

function insertNotebooksOnSelect(notebooks) {
	notebookSelect.innerHTML = ""

	const defaultOption = document.createElement("option")
	defaultOption.value = -1
	defaultOption.textContent = "All notebooks"
	defaultOption.setAttribute("selected", -1)
	notebookSelect.appendChild(defaultOption)

	for (const notebook of notebooks) {
		insertNotebook(notebook)
	}
}

function insertNotebook(notebook) {
	const item = document.createElement("option")

	item.value = notebook.id
	item.textContent = notebook.title

	notebookSelect.appendChild(item)

	toggleDeleteNotebookBtn()
}

function toggleDeleteNotebookBtn() {
	deleteNotebookBtn.classList.toggle("opacity-02", notebookSelect.value == -1)
	createNoteBtn.classList.toggle(
		"opacity-02",
		notebookSelect.childElementCount <= 1
	)

	deleteNotebookBtn.style.pointerEvents =
		notebookSelect.value == -1 ? "none" : "auto"
	createNoteBtn.style.pointerEvents =
		notebookSelect.childElementCount > 1 ? "auto" : "none"
}
