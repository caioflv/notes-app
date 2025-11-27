import { BASE_URL, TOKEN } from "./config.js"

export async function apiGet(routeName, id) {
	try {
		const url = id
			? `${BASE_URL}/${routeName}/${id}`
			: `${BASE_URL}/${routeName}`

		const response = await fetch(url)

		return await response.json()
	} catch (error) {
		console.log(error)
		return []
	}
}

export async function apiPost(routeName, body, useToken = true) {
	try {
		const response = await fetch(`${BASE_URL}/${routeName}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(useToken && { Authorization: `Bearer ${TOKEN}` }),
			},
			body: JSON.stringify(body),
		})
		return await response.json()
	} catch (error) {
		console.log(error)
		alert(error)
	}
}

export async function apiPatch(routeName, id, body) {
	try {
		const response = await fetch(`${BASE_URL}/${routeName}/${id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${TOKEN}`,
			},
			body: JSON.stringify(body),
		})
		return await response.json()
	} catch (error) {
		console.log(error)
		alert(error)
	}
}

export async function apiDelete(routeName, id) {
	try {
		const response = await fetch(`${BASE_URL}/${routeName}/${id}`, {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${TOKEN}`,
			},
		})
		return await response.json()
	} catch (error) {
		console.log(error)
		alert(error)
	}
}
