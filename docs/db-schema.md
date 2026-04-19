# Runtime Storage

The current server does not use a database. Dashboard history is stored in memory and resets whenever the backend process restarts.

## Drug Check History

Stored in memory by `server/src/controllers/drugController.js`.

Fields:

- `drugs`
- `interactionCount`
- `createdAt`

## Blood Report History

Stored in memory by `server/src/controllers/bloodReportController.js`.

Fields:

- `language`
- `riskPercentage`
- `createdAt`

## Notes

Because no database is used, no check history persists after a restart. Add encrypted storage, audit logs, strict authentication, consent capture, and retention policies before storing real health data permanently.
