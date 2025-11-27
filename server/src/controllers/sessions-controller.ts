import { Request, Response } from "express"
import { authConfig } from "../configs/auth"
import { AppError } from "../utils/AppError"
import { sign, SignOptions } from "jsonwebtoken"

class SessionsController {
	async create(request: Request, response: Response) {
		const { username, password } = request.body

		const fakeUser = {
			id: "1",
			username: "caio",
			password: "123",
			role: "common",
		}

		if (username !== fakeUser.username || password !== fakeUser.password) {
			throw new AppError("Email e/ou senha incorreta", 401)
		}

		const { secret, expiresIn } = authConfig.jwt

		const token = sign({ role: fakeUser.role }, secret, {
			expiresIn,
			subject: String(fakeUser.id),
		} as SignOptions)

		return response.json({ token: token })
	}
}

export { SessionsController }
