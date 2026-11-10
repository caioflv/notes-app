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

test("creates a notebook and a note, keeps them after reload, finds the note, and deletes both", async ({ page }) => {
	const notebook = uniqueName("Smoke notebook")
	const note = uniqueName("Smoke note")

	await openHome(page)
	await expect(page.getByText("Hello, Caio!")).toBeVisible()

	await createNotebook(page, notebook)
	await selectNotebookFilter(page, notebook)
	await createNote(page, { title: note, content: "first line of the smoke note", notebook })

	await openHome(page)
	await expect(page.locator("#notebook-filter option", { hasText: notebook })).toHaveCount(1)
	await expect(noteCard(page, note)).toBeVisible()
	await expect(noteCard(page, note)).toContainText("first line of the smoke note")

	await page.locator("#note-search").fill(note)
	await expect(noteCard(page, note)).toBeVisible()
	await page.locator("#note-search").fill("text that matches no note")
	await expect(noteCard(page, note)).toHaveCount(1)
	await expect(noteCard(page, note)).toBeHidden()
	await page.locator("#note-search").fill("")

	await deleteNote(page, note)

	await selectNotebookFilter(page, notebook)
	await deleteSelectedNotebook(page, notebook)

	await openHome(page)
	await expect(page.locator("#notebook-filter option", { hasText: notebook })).toHaveCount(0)
	await expect(noteCard(page, note)).toHaveCount(0)
})
