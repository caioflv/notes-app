import { knex as knexConfig } from "knex"
import config from "../configs/database"

export const knex = knexConfig(config)
