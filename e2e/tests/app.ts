import { expect, type Page } from "@playwright/test"

let counter = 0

export function uniqueName(prefix: string) {
	counter += 1
	return `${prefix} ${Date.now()}-${counter}`
}

export async function openHome(page: Page) {
	const notebooksLoaded = page.waitForResponse(
		(response) => response.url().endsWith("/notebooks") && response.request().method() === "GET",
	)
	const notesLoaded = page.waitForResponse(
		(response) => response.url().endsWith("/notes") && response.request().method() === "GET",
	)
	await page.goto("/")
	await Promise.all([notebooksLoaded, notesLoaded])
}

export async function createNotebook(page: Page, title: string) {
	await page.locator(".add-notebook").click()
	await expect(page.locator(".add-notebook-popup")).toBeVisible()
	await page.locator("#add-nb-input").fill(title)
	await page.locator("#create-notebook-btn").click()
	await expect(page.locator(".add-notebook-popup")).toBeHidden()
	await expect(page.locator("#notebook-filter option", { hasText: title })).toHaveCount(1)
}

export async function selectNotebookFilter(page: Page, title: string) {
	await page.locator("#notebook-filter").selectOption({ label: title })
}

export async function createNote(
	page: Page,
	note: { title: string; content: string; notebook: string },
) {
	await page.locator(".add-note").click()
	const editor = page.locator(".note-edit-screen")
	await expect(editor).toBeVisible()
	await page.locator("#notebook-selection").selectOption({ label: note.notebook })
	await editor.locator("input[type=text]").fill(note.title)
	await editor.locator("textarea").fill(note.content)
	await page.locator("#save-note-btn").click()
	await expect(editor).toBeHidden()
	await expect(noteCard(page, note.title)).toHaveCount(1)
}

// Matches hidden cards too (getByRole would skip them), so tests can tell
// "hidden by a filter" apart from "not rendered".
export function noteCard(page: Page, title: string) {
	const exactTitle = new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
	return page.locator(".notes-view .note-wrapper").filter({
		has: page.locator("h2", { hasText: exactTitle }),
	})
}

export async function deleteNote(page: Page, title: string) {
	await noteCard(page, title).click()
	await expect(page.locator(".note-edit-screen")).toBeVisible()
	await page.locator("#delete-note-btn").click()
	await expect(page.locator(".note-edit-screen")).toBeHidden()
	await expect(noteCard(page, title)).toHaveCount(0)
}

export async function deleteSelectedNotebook(page: Page, title: string) {
	await page.locator(".delete-notebook").click()
	await expect(page.locator("#notebook-filter option", { hasText: title })).toHaveCount(0)
}
