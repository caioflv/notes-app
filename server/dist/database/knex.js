"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.knex = void 0;
const knex_1 = require("knex");
const database_1 = __importDefault(require("../configs/database"));
exports.knex = (0, knex_1.knex)(database_1.default);
