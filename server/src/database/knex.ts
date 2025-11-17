import { knex as knexConfig } from "knex"
import config from "../../knexfile.js"

export const knex = knexConfig(config)
