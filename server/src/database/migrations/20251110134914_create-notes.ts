import type { Knex } from "knex"

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable("notes", (table) => {
		table.increments("id").primary(),
			table
				.integer("notebook_id")
				.notNullable()
				.references("id")
				.inTable("notebooks"),
			table.text("title").notNullable(),
			table.text("content"),
			table.timestamp("created_at").defaultTo(knex.fn.now())
		table.timestamp("updated_at").defaultTo(knex.fn.now())
	})
}

export async function down(knex: Knex): Promise<void> {
	await knex.schema.dropTable("notes")
}
