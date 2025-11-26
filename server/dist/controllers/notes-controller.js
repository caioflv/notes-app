"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotesController = void 0;
const knex_1 = require("../database/knex");
const zod_1 = __importDefault(require("zod"));
class NotesController {
    async index(request, response, next) {
        try {
            const notes = await (0, knex_1.knex)("notes").select().orderBy("created_at");
            const parsedNotes = notes.map((note) => ({
                ...note,
                content: JSON.parse(note.content),
            }));
            return response.json({ success: true, notes: parsedNotes });
        }
        catch (error) {
            next(error);
        }
    }
    async show(request, response, next) {
        try {
            const { id } = request.params;
            const note = await (0, knex_1.knex)("notes").select().where({ id }).first();
            if (note) {
                const parsedNote = { ...note, content: JSON.parse(note.content) };
                return response.json({ success: true, note: parsedNote });
            }
            return response.json({ success: false });
        }
        catch (error) {
            next(error);
        }
    }
    async create(request, response, next) {
        try {
            const bodySchema = zod_1.default.object({
                title: zod_1.default
                    .string()
                    .min(1, { message: "title lenght must be greater than 1 character" }),
                content: zod_1.default
                    .string()
                    .transform((val) => (val.trim() === "" ? "[]" : val)),
                notebook_id: zod_1.default.number(),
            });
            const { title, content, notebook_id } = bodySchema.parse(request.body);
            const id = await (0, knex_1.knex)("notes").insert({
                title,
                content: JSON.stringify(content),
                notebook_id,
            });
            return response.status(201).json({ success: true, id: id });
        }
        catch (error) {
            next(error);
        }
    }
    async update(request, response, next) {
        try {
            const params = zod_1.default.object({
                id: zod_1.default.coerce.number(),
            });
            const bodySchema = zod_1.default.object({
                title: zod_1.default
                    .string()
                    .min(1, { message: "title lenght must be greater than 1 character" })
                    .optional(),
                content: zod_1.default
                    .string()
                    .transform((val) => (val.trim() === "" ? "[]" : val))
                    .optional(),
            });
            let body = bodySchema.parse(request.body);
            if (body.content) {
                body.content = JSON.stringify(body.content);
            }
            const { id } = params.parse(request.params);
            await (0, knex_1.knex)("notes")
                .update({
                ...body,
                updated_at: knex_1.knex.fn.now(),
            })
                .where({ id });
            return response.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    }
    async remove(request, response, next) {
        try {
            const params = zod_1.default.object({
                id: zod_1.default.coerce.number(),
            });
            const { id } = params.parse(request.params);
            await (0, knex_1.knex)("notes").delete().where({ id });
            return response.json({ success: true, id: id });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotesController = NotesController;
