# Notes App — Client + API + Database

This project is a **notes application**, composed of:

- **Web Client** (SPA bundled with Webpack)
- **REST API** built with Node.js + Express
- **SQLite database** managed via Knex

The goal of this app is to provide a simple and efficient way to create and organize notes divided into **notebooks**.  
All business logic—creating, editing, deleting, and searching notes—is handled by the API, while the client delivers a clean and minimal interface inspired by macOS Notes.

---

## Features

### **Notes**

- Create, edit, and delete notes
- Full listing with notebook-based filtering
- Real-time content saving

### **Notebooks**

- Create and delete notebooks

### **Search**

- Simple search system that filters notes by their content

### **Database**

- Local persistence using SQLite
- Database migrations managed with Knex

---

## Technologies Used

### **Client (Frontend)**

- **Webpack 5** – Main bundler
- **Webpack Dev Server** – Local development environment
- **Babel** (@babel/core and preset-env) – Browser compatibility
- **HTML Webpack Plugin** – Automatic HTML generation
- **Mini CSS Extract Plugin** – CSS extraction for production
- **CSS Loader / Style Loader** – CSS file handling
- **Copy Webpack Plugin** – Copies static assets
- **Day.js** – Lightweight date manipulation library

---

### **API (Backend)**

- **Node.js + Express 5** – HTTP server
- **SQLite3** – Lightweight local database
- **Knex.js** – SQL query builder
- **Zod** – Schema validation
- **CORS** – Cross-origin support
- **TypeScript + tsx** – Typed development with hot reload
- **@types/\*** – TypeScript definitions for external libraries

---

## 🗂 General Structure

```
/client
  ├── src/
  ├── dist/
  ├── webpack.config.js
  └── package.json

/api
  ├── src/server.ts
  ├── database/
  ├── migrations/
  └── package.json
```
