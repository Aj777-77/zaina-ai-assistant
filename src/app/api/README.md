# API Routes

This directory contains Next.js API routes for the backend functionality.

## Structure

API routes are organized as follows:
- `/api/chat` - Chat and AI conversation endpoints
- `/api/products` - Product search and retrieval
- `/api/scraper` - Web scraping endpoints
- `/api/user` - User management

## Next.js App Router

In Next.js 13+, API routes are created using route handlers:
- Each endpoint is a `route.ts` or `route.js` file
- Supports GET, POST, PUT, DELETE, etc.

Example:
```typescript
// app/api/hello/route.ts
export async function GET(request: Request) {
  return Response.json({ message: 'Hello' });
}
```
