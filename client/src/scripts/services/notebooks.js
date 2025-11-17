import { Events } from "../events/event-manager.js"
import { NOTEBOOKS_PATH } from "./api/config.js"
import { apiPost, apiDelete, apiGet, apiPatch } from "./api/api-com.js"

Events.on("PostNotebook", (e) => {
	postNotebook(e.detail)
})
Events.on("GetNotebooks", () => {
	getNotebooks()
})
Events.on("GetNotebook", (e) => {
	getNotebook(e.detail)
})
Events.on("PatchNotebook", (e) => {
	patchNotebook(e.detail)
})
Events.on("DeleteNotebook", (e) => {
	deleteNotebook(e.detail)
})

async function postNotebook(detail) {
	const data = await apiPost(NOTEBOOKS_PATH, detail)
	const notebook = { id: data.id, title: detail.title }
	data.notebook = notebook
	Events.emit("OnPostNotebook", data)
}
async function getNotebook(detail) {
	const data = await apiGet(NOTEBOOKS_PATH, detail)
	Events.emit("OnGetNotebook", data)
}
async function getNotebooks() {
	const data = await apiGet(NOTEBOOKS_PATH)
	Events.emit("OnGetNotebooks", data)
}
async function patchNotebook(detail) {
	const data = await apiPatch(NOTEBOOKS_PATH, detail)
	Events.emit("OnPatchNotebook", data)
}
async function deleteNotebook(detail) {
	const data = await apiDelete(NOTEBOOKS_PATH, detail)
	Events.emit("OnDeleteNotebook", data)
}
