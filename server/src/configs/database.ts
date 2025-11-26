import { Knex } from "knex"
import path from "path"

const config: Knex.Config = {
	client: "sqlite3",
	connection: {
		filename: path.resolve(process.cwd(), "db/database.db"),
	},
	useNullAsDefault: true,
}

export default config
