# TypeScript Types

This directory contains shared TypeScript type definitions and interfaces.

## Structure

- **index.ts**: Main type exports
- **product.ts**: Product-related types
- **chat.ts**: Chat and message types
- **user.ts**: User-related types
- **api.ts**: API request/response types

## Usage

Import types throughout the application:

```typescript
import { Product, ChatMessage, User } from '@/types';
```

## Best Practices

- Use interfaces for object shapes
- Use types for unions, primitives, and computed types
- Export all types from index.ts for easy access
- Keep types DRY (Don't Repeat Yourself)
