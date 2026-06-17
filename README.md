# Chop — Chess Opening Repertoire Builder

Tab-based web app for creating and managing chess opening repertoires. Built with React + Vite + TypeScript (client) and Node.js + Express (server).

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Stockfish 18 binary (see below)

### Stockfish Setup

Download Stockfish 18 and place the binary at `server/stockfish`:

**Linux (x86_64):**
```bash
curl -L -o server/stockfish https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-ubuntu-x86-64-avx2
chmod +x server/stockfish
```

**macOS (ARM/Intel):**
```bash
curl -L -o server/stockfish https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-macos-x86-64
chmod +x server/stockfish
```

**Windows:**
Download from [Stockfish releases](https://github.com/official-stockfish/Stockfish/releases/tag/sf_18) and place `stockfish.exe` at `server/stockfish.exe`.

### Install & Run

```bash
npm install
npm run dev
```

Opens client at `http://localhost:5173` and server at `http://localhost:3001`.

## Features

- Tab-based repertoire management (open multiple repertoires)
- Tree-structured move storage with drag-and-drop and text input
- PGN import/export
- Stockfish analysis (auto-analyze on navigation)
- Per-position arrows with color picker (yellow, red, blue, green)
- Per-move comments and custom tags
- Collapsible move tree
- Repertoire face position on cards
- Duplicate repertoire
- Standing line is kept while using the app.
