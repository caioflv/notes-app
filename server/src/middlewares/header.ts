import { Request, Response, NextFunction } from "express"

export function setHeader(
	error: any,
	request: Request,
	response: Response,
	next: NextFunction
) {
	response.setHeader(
		"Content-Security-Policy",
		"default-src 'self'; " +
			"script-src 'self'; " +
			"style-src 'self' 'unsafe-inline'; " +
			"img-src 'self' data: blob:;"
	)
	next()
}
