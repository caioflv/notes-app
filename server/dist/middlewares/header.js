"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setHeader = setHeader;
function setHeader(error, request, response, next) {
    response.setHeader("Content-Security-Policy", "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:;");
    next();
}
