# Next Feature Roadmap

Three strong additions that would make Stremio Stream Store more useful after the core professional upgrades are complete.

## 1. Stream Library Manager

Build an admin dashboard for browsing everything saved in Firebase.

What to add:

- List all saved movie links.
- List all saved series links grouped by IMDb ID, season, and episode.
- Search by IMDb ID.
- Edit a saved stream URL.
- Delete a movie or episode link.
- Show created and updated timestamps.

Why it helps:

The addon currently saves and serves links, but there is no easy way to audit or manage existing entries. A library manager makes the addon feel like a real tool instead of a write-only form.

## 2. Multi-Stream Support

Allow more than one stream per movie or episode.

What to add:

- Store streams under generated stream IDs instead of overwriting a single URL.
- Add stream fields such as title, quality, language, source, and priority.
- Return all saved streams in the Stremio stream response.
- Let admins reorder or disable streams without deleting them.

Why it helps:

Different users may need different qualities, mirrors, hosts, or languages. Multi-stream support turns the addon from a simple link store into a flexible personal stream catalog.

## 3. Backup, Restore, and Migration Tools

Add tools for exporting, importing, and safely migrating saved links.

What to add:

- Export the full link database as JSON.
- Import a JSON backup with validation.
- Add dry-run mode before importing.
- Show import results: created, updated, skipped, and failed records.
- Add schema migration helpers if the database structure changes.

Why it helps:

Firebase data is valuable once the addon has real usage. Backup and restore support makes self-hosting safer and gives users confidence before changing hosts, database projects, or schema versions.
