"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const config = {
    client: "sqlite3",
    connection: {
        filename: path_1.default.resolve(process.cwd(), "src/database/database.db"),
    },
    useNullAsDefault: true,
};
exports.default = config;
