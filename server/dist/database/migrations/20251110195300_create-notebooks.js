"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.createTable("notebooks", (table) => {
        table.increments("id").primary(),
            table.text("title").notNullable(),
            table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
}
async function down(knex) {
    await knex.schema.dropTable("notebooks");
}
