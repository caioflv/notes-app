"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("notes", (table) => {
        table.increments("id").primary(),
            table
                .integer("notebook_id")
                .notNullable()
                .references("id")
                .inTable("notebooks"),
            table.text("title").notNullable(),
            table.text("content"),
            table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
}
async function down(knex) {
    await knex.schema.dropTable("notes");
}
