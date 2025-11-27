const BASE_URL = "http://192.168.0.110:3333"
const NOTES_PATH = "notes"
const NOTEBOOKS_PATH = "notebooks"
const SESSIONS_PATH = "sessions"
let TOKEN = ""

function setToken(t) {
	TOKEN = t
}

export { setToken, BASE_URL, NOTES_PATH, NOTEBOOKS_PATH, SESSIONS_PATH, TOKEN }
