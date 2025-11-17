import { Events } from "../events/event-manager.js"
import { NOTES_PATH } from "./api/config.js"
import { apiPost, apiDelete, apiGet, apiPatch } from "./api/api-com.js"

Events.on("PostNote", (e) => {
	postNote(e.detail)
})

Events.on("GetNotes", () => {
	getNotes()
})

Events.on("GetNote", (e) => {
	getNote(e.detail)
})

Events.on("PatchNote", (e) => {
	patchNote(e.detail)
})

Events.on("DeleteNote", (e) => {
	deleteNote(e.detail)
})

async function postNote(detail) {
	const data = await apiPost(NOTES_PATH, detail)
	Events.emit("OnPostNote", data)
}
async function getNote(detail) {
	const data = await apiGet(NOTES_PATH, detail)
	Events.emit("OnGetNote", data)
}
async function getNotes() {
	const data = await apiGet(NOTES_PATH)
	Events.emit("OnGetNotes", data)
}
async function patchNote(detail) {
	const data = await apiPatch(NOTES_PATH, detail.id, {
		title: detail.title,
		content: detail.content,
	})
	Events.emit("OnPatchNote", data)
}
async function deleteNote(detail) {
	const data = await apiDelete(NOTES_PATH, detail)
	Events.emit("OnDeleteNote", data)
}
