# PaperDesk

PaperDesk 是一款本地优先的论文管理桌面应用（Electron + SQLite），支持 PDF 快速检索、元数据管理与批量操作，并可选用 Ollama 或第三方 API 提升排序与推荐，数据全程保存在本机。
PaperDesk is a local-first paper management desktop app (Electron + SQLite) that supports fast PDF retrieval, rich metadata management, and optional Ollama or third-party APIs for ranking and recommendations—your data stays on your machine.

## Features
- Scan folders or individual PDFs (recursive for folders).
- Extracts text from the first 3 pages for searchable context.
- Manage metadata: authors, subject, abstract, year, category, journal, tags, notes.
- Ollama auto-fill for title/authors/keywords, plus similarity recommendations.
- Export citations (BibTeX or APA) from any paper.
- Bulk tag multiple papers at once.
- Bulk export for selected papers (BibTeX/APA/CSV).
- Smart summaries (summary/methods/contributions/key points).
- Saved searches and ignore rules for scanning.
- GPT-style UI for fast browsing and editing.
- Optional Ollama ranking to sort search results.

## Tech stack
- Electron, Node.js
- SQLite (better-sqlite3)
- pdf-parse

## Run (dev)
```powershell
npm install
npx electron-rebuild -f -w better-sqlite3
npm run start
```

## Build (release)
```powershell
npm install
npm run build
```

## Usage
1. Click **+ Folder** or **+ File** to add sources.
2. Click **Scan Sources** to ingest PDFs.
3. Search by title, author, tag, abstract, or extracted text.
4. Use filters for tags, year range, category, journal, subject, and keywords.
5. Use **Auto-fill** to extract title/authors/keywords from the PDF text.
6. Use **Find Similar** to get recommendations (requires Ollama embedding model).
7. Edit metadata in the detail panel.
8. Configure Ollama in **Settings** and use **LLM Rank**.
9. Use the sidebar to save searches and manage ignore rules.

## Notes
- Database is stored at the Electron user data path (OS-specific).
- Ollama endpoint defaults to `http://localhost:11434` and model `llama3`.
- Embedding model defaults to `nomic-embed-text`.
- If embeddings fail, run `ollama pull nomic-embed-text` (or set another embedding model in Settings).
