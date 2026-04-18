# Database Schema

MongoDB models are included for production migration. The current development server can run without MongoDB and stores dashboard history in memory.

## User

- `name`
- `email`
- `passwordHash`
- `role`

## Prescription

- `patientName`
- `medicines`
- `conditions`
- `supplements`

## InteractionLog

- `drugs`
- `sourceSummary`
- `interactionCount`
- `interactions`

## BloodReportLog

- `language`
- `riskPercentage`
- `findings`
- `summary`

## Production Notes

Use encrypted storage, audit logs, strict authentication, consent capture, and retention policies before storing real health data.
