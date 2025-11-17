import { Events } from "./events/event-manager.js"

const popup = document.querySelector(".add-notebook-popup")
const notebookInputName = document.querySelector("#add-nb-input")
const saveBtn = document.querySelector("#create-notebook-btn")

let notebook = {}

Events.on("AddNotebookBtnPress", (e) => {
	addNotebook()
})

Events.on("OnPostNotebook", (e) => {
	if (e.detail.success) {
		toggleEditScreen(false)
	}
})

function addNotebook() {
	notebook = {}
	toggleEditScreen(true)
}

popup.addEventListener("click", (event) => {
	toggleEditScreen(false)
})
popup.querySelector("div").addEventListener("click", (event) => {
	event.stopPropagation()
})
saveBtn.addEventListener("click", (event) => {
	if (!notebookInputName.value.trim() === "") return

	notebook.title = notebookInputName.value
	Events.emit("PostNotebook", notebook)
})

function toggleEditScreen(mode) {
	popup.classList.toggle("hidden", !mode)
	document.body.classList.toggle("body-lock", mode)
}
