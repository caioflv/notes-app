import { expect, test } from "@playwright/test"
import {
	createNote,
	createNotebook,
	deleteNote,
	deleteSelectedNotebook,
	noteCard,
	openHome,
	selectNotebookFilter,
	uniqueName,
} from "./app"

test("CURRENT BUG: a note saved with empty content shows \"[]\" after reload (R-09)", async ({ page }) => {
	const notebook = uniqueName("Empty content notebook")
	const note = uniqueName("Empty content note")

	await openHome(page)
	await createNotebook(page, notebook)
	await createNote(page, { title: note, content: "", notebook })

	await openHome(page)
	await expect(noteCard(page, note).locator("small")).toHaveText("[]...")
})

test("CURRENT BUG: after deleting a note, search no longer finds the most recently added note (R-10)", async ({ page }) => {
	const notebook = uniqueName("Search notebook")
	const first = uniqueName("Search first")
	const last = uniqueName("Search last")

	await openHome(page)
	await createNotebook(page, notebook)
	await createNote(page, { title: first, content: "first", notebook })
	await createNote(page, { title: last, content: "last", notebook })

	await deleteNote(page, first)

	// notes.pop() drops the last cached note instead of the deleted one.
	await page.locator("#note-search").fill(last)
	await expect(noteCard(page, last)).toHaveCount(1)
	await expect(noteCard(page, last)).toHaveClass(/hidden-by-search/)
	await expect(noteCard(page, last)).toBeHidden()
})

test("CURRENT BUG: after deleting the filtered notebook, notes from other notebooks stay hidden (R-12)", async ({ page }) => {
	const kept = uniqueName("Kept notebook")
	const deleted = uniqueName("Deleted notebook")
	const keptNote = uniqueName("Note in kept notebook")
	const deletedNote = uniqueName("Note in deleted notebook")

	await openHome(page)
	await createNotebook(page, kept)
	await createNotebook(page, deleted)
	await createNote(page, { title: keptNote, content: "kept", notebook: kept })
	await createNote(page, { title: deletedNote, content: "deleted", notebook: deleted })

	await selectNotebookFilter(page, deleted)
	await expect(noteCard(page, keptNote)).toBeHidden()

	await deleteSelectedNotebook(page, deleted)

	await expect(page.locator("#notebook-filter")).toHaveValue("-1")
	await expect(noteCard(page, deletedNote)).toHaveCount(0)
	await expect(noteCard(page, keptNote)).toHaveCount(1)
	await expect(noteCard(page, keptNote)).toHaveClass(/\bhidden\b/)
	await expect(noteCard(page, keptNote)).toBeHidden()

	await openHome(page)
	await expect(noteCard(page, keptNote)).toBeVisible()
})

test("CURRENT BUG: a new note saved without picking a notebook is created with notebook_id 0", async ({ page }) => {
	const notebook = uniqueName("Unpicked notebook")
	const note = uniqueName("Note without notebook")

	await openHome(page)
	await createNotebook(page, notebook)

	await page.locator(".add-note").click()
	await expect(page.locator("#notebook-selection")).toHaveValue("")
	await page.locator(".note-edit-screen input[type=text]").fill(note)

	const postNote = page.waitForResponse(
		(response) => response.url().endsWith("/notes") && response.request().method() === "POST",
	)
	await page.locator("#save-note-btn").click()
	const response = await postNote

	expect(response.status()).toBe(201)
	expect(response.request().postDataJSON()).toMatchObject({ title: note, notebook_id: 0 })
	await expect(noteCard(page, note)).toHaveAttribute("notebook-id", "0")
})
