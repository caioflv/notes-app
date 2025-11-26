"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const index_1 = require("./routes/index");
const header_1 = require("./middlewares/header");
const PORT = 3333;
const clientPath = path_1.default.resolve(__dirname, "../../client/dist");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));
app.use(header_1.setHeader);
app.use(express_1.default.static(clientPath));
app.use(index_1.routes);
app.get(/.*/, (req, res) => {
    const indexPath = path_1.default.join(clientPath, "index.html");
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Failed to send index.html:", err);
            res.status(500).send("Internal error");
        }
    });
});
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Front path on: ${clientPath}`);
});
