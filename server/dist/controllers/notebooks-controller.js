"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebooksController = void 0;
const knex_1 = require("../database/knex");
const zod_1 = __importDefault(require("zod"));
class NotebooksController {
    async index(request, response, next) {
        try {
            const notebooks = await (0, knex_1.knex)("notebooks").select().orderBy("created_at");
            return response.json({ success: true, notebooks: notebooks });
        }
        catch (error) {
            next(error);
        }
    }
    async show(request, response, next) {
        try {
            const { notebook_id } = request.params;
            const notes = await (0, knex_1.knex)("notes")
                .select("notes.id", "notebooks.id as notebook_id", "notes.title", "notes.content")
                .join("notebooks", "notebooks.id", "notes.notebook_id")
                .where({ notebook_id });
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
    async create(request, response, next) {
        try {
            const bodySchema = zod_1.default.object({
                title: zod_1.default
                    .string()
                    .min(1, { message: "title lenght must be greater than 1 character" }),
            });
            const { title } = bodySchema.parse(request.body);
            const result = await (0, knex_1.knex)("notebooks")
                .insert({
                title,
            })
                .returning("id");
            return response.status(201).json({ success: true, id: result[0].id });
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
                    .min(1, { message: "title lenght must be greater than 1 character" }),
            });
            const { id } = params.parse(request.params);
            const { title } = bodySchema.parse(request.body);
            await (0, knex_1.knex)("notebooks")
                .update({
                title,
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
            await (0, knex_1.knex)("notes").delete().where({ notebook_id: id });
            await (0, knex_1.knex)("notebooks").delete().where({ id });
            return response.json({ success: true, id: id });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.NotebooksController = NotebooksController;
