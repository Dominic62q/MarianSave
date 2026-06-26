# MarianSave

MarianSave is an offline-first desktop personal finance tracker built with Tauri, React, TypeScript, and SQLite.

## Features

- local transaction tracking
- income and expense categories
- dashboard summaries
- monthly and date-range reports
- CSV export
- desktop-only local data storage

## Development

Install dependencies:

```powershell
npm install
```

Run the desktop app in development:

```powershell
npm run tauri dev
```

Build the web bundle:

```powershell
npm run build
```

## Release Build

Create release installers:

```powershell
npm run tauri build
```

Generated Windows installers are written to:

- `src-tauri/target/release/bundle/nsis/`
- `src-tauri/target/release/bundle/msi/`

## Data Storage

Each installed copy of MarianSave keeps its own local SQLite database on that machine through the Tauri SQL plugin.

- data is not embedded inside the installer
- different PCs do not share data automatically
- updating the app with a newer installer should keep local data intact
