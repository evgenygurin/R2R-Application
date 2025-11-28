# Sentry Configuration

## Project Information

- **Organization**: evgeny-pl
- **Project**: r2r-dashboard
- **Project Slug**: r2r-dashboard
- **Project ID**: 4510441667428352
- **Region**: US (https://us.sentry.io)

## DSN

```
https://a325dc9f90bebed5e4d356387dd5ef6e@o490495.ingest.us.sentry.io/4510441667428352
```

## Environment Variables

Add the following to your `.env` file:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://a325dc9f90bebed5e4d356387dd5ef6e@o490495.ingest.us.sentry.io/4510441667428352
```

For Vercel deployment, add this as an environment variable in your Vercel project settings.

## Configuration Files

The following files are configured for Sentry:

- `next.config.js` - Sentry webpack plugin configuration
- `sentry.client.config.ts` - Client-side Sentry initialization
- `sentry.server.config.ts` - Server-side Sentry initialization
- `sentry.edge.config.ts` - Edge runtime Sentry initialization
- `src/instrumentation.ts` - Next.js instrumentation hook

## Features Enabled

- ✅ Error Monitoring
- ✅ Performance Monitoring (tracesSampleRate: 1)
- ✅ Session Replay (10% of sessions, 100% on errors)
- ✅ Source Maps Upload
- ✅ React Component Annotation
- ✅ Tunnel Route (/monitoring) to avoid ad blockers
- ✅ Automatic Vercel Cron Monitors

## Viewing Data

Access your Sentry project at:
https://evgeny-pl.sentry.io/projects/r2r-dashboard/

## Next Steps

1. Set `NEXT_PUBLIC_SENTRY_DSN` in your `.env` file
2. Set `SENTRY_AUTH_TOKEN` in your `.env` for source map uploads (optional)
3. Deploy to Vercel and add the environment variable there
4. Test error reporting by triggering a test error

