# PaperDesk

Local paper management desktop app (Electron + SQLite) with Ollama-assisted search ranking.

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

## Run (dev)
```powershell
npm install
npx electron-rebuild -f -w better-sqlite3
npm run start
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
