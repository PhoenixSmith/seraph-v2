---
name: convex
description: Comprehensive Convex backend development guidelines. Use when writing Convex functions, schemas, queries, mutations, actions, HTTP endpoints, cron jobs, file storage, or any Convex backend code. Covers function syntax, validators, TypeScript types, pagination, scheduling, and best practices.
---

# Convex Development Guidelines

## Function Guidelines

### New Function Syntax
ALWAYS use the new function syntax for Convex functions:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const f = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // Function body
  },
});
```

### HTTP Endpoint Syntax
HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/echo",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
  }),
});
```

HTTP endpoints are registered at the exact path specified in the `path` field.

### Function Registration

**Public Functions:**
- Use `query`, `mutation`, and `action` for public functions
- These are part of the public API and exposed to the Internet
- Do NOT use for sensitive internal functions

**Internal Functions:**
- Use `internalQuery`, `internalMutation`, and `internalAction` for internal functions
- These are private and only callable by other Convex functions
- Always import from `./_generated/server`

**Critical Rules:**
- You CANNOT register a function through the `api` or `internal` objects
- ALWAYS include argument and return validators for ALL Convex functions
- If a function doesn't return anything, use `returns: v.null()`
- JavaScript functions that don't return a value implicitly return `null`

### Function Calling

| Method | From | Purpose |
|--------|------|---------|
| `ctx.runQuery` | query, mutation, action | Call a query |
| `ctx.runMutation` | mutation, action | Call a mutation |
| `ctx.runAction` | action | Call an action |

**Rules:**
- ONLY call an action from another action if crossing runtimes (V8 to Node)
- Otherwise, extract shared code into a helper async function
- Minimize calls from actions to queries/mutations (race condition risk)
- All calls take a `FunctionReference` - do NOT pass the function directly

**Same-file calls require type annotation:**
```typescript
export const f = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});

export const g = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
    return null;
  },
});
```

### Function References

- Use `api` object for public functions (`query`, `mutation`, `action`)
- Use `internal` object for private functions (`internalQuery`, `internalMutation`, `internalAction`)
- File-based routing: function `f` in `convex/example.ts` = `api.example.f`
- Internal function `g` in `convex/example.ts` = `internal.example.g`
- Nested: function `h` in `convex/messages/access.ts` = `api.messages.access.h`

### Pagination

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const listWithExtraArg = query({
  args: { paginationOpts: paginationOptsValidator, author: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("author"), args.author))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

**paginationOpts properties:**
- `numItems`: maximum documents to return (`v.number()`)
- `cursor`: cursor for next page (`v.union(v.string(), v.null())`)

**paginate() returns:**
- `page`: array of fetched documents
- `isDone`: boolean for last page
- `continueCursor`: string cursor for next page

---

## Validators

### Type Reference Table

| Convex Type | TS/JS Type | Example | Validator | Notes |
|-------------|-----------|---------|-----------|-------|
| Id | string | `doc._id` | `v.id(tableName)` | |
| Null | null | `null` | `v.null()` | `undefined` is NOT valid; use `null` |
| Int64 | bigint | `3n` | `v.int64()` | Range: -2^63 to 2^63-1 |
| Float64 | number | `3.1` | `v.number()` | Supports all IEEE-754 doubles |
| Boolean | boolean | `true` | `v.boolean()` | |
| String | string | `"abc"` | `v.string()` | UTF-8, max 1MB |
| Bytes | ArrayBuffer | `new ArrayBuffer(8)` | `v.bytes()` | Max 1MB |
| Array | Array | `[1, 3.2, "abc"]` | `v.array(values)` | Max 8192 values |
| Object | Object | `{a: "abc"}` | `v.object({property: value})` | Max 1024 entries |
| Record | Record | `{"a": "1"}` | `v.record(keys, values)` | ASCII keys only |

### Array Validator Example
```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    simpleArray: v.array(v.union(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    //...
  },
});
```

### Discriminated Union Example
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  results: defineTable(
    v.union(
      v.object({
        kind: v.literal("error"),
        errorMessage: v.string(),
      }),
      v.object({
        kind: v.literal("success"),
        value: v.number(),
      }),
    ),
  )
});
```

### Null Return Example
```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const exampleQuery = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("This query returns a null value");
    return null;
  },
});
```

### Validator Guidelines
- `v.bigint()` is DEPRECATED - use `v.int64()` instead
- Use `v.record()` for record types
- `v.map()` and `v.set()` are NOT supported

---

## Schema Guidelines

- Always define schema in `convex/schema.ts`
- Import schema functions from `convex/server`
- System fields auto-added: `_creationTime` (`v.number()`) and `_id` (`v.id(tableName)`)
- Include all index fields in index name (e.g., `by_field1_and_field2`)
- Index fields must be queried in order defined

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
  }),

  users: defineTable({
    name: v.string(),
  }),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  }).index("by_channelId", ["channelId"]),
});
```

---

## TypeScript Guidelines

- Use `Id<'tableName'>` from `./_generated/dataModel` for document IDs
- Be strict with types - use `Id<'users'>` not `string`
- Always use `as const` for string literals in discriminated unions
- Define arrays as `const array: Array<T> = [...]`
- Define records as `const record: Record<KeyType, ValueType> = {...}`
- Add `@types/node` to `package.json` when using Node.js modules

### Record with Id Type Example
```typescript
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const exampleQuery = query({
  args: { userIds: v.array(v.id("users")) },
  returns: v.record(v.id("users"), v.string()),
  handler: async (ctx, args) => {
    const idToUsername: Record<Id<"users">, string> = {};
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (user) {
        idToUsername[user._id] = user.username;
      }
    }
    return idToUsername;
  },
});
```

---

## Query Guidelines

**Critical Rules:**
- Do NOT use `filter` - define an index and use `withIndex` instead
- Convex queries do NOT support `.delete()` - use `.collect()` then iterate with `ctx.db.delete(row._id)`
- Use `.unique()` for single document (throws if multiple match)
- For async iteration, don't use `.collect()` or `.take(n)` - use `for await (const row of query)`

### Ordering
- Default order: ascending `_creationTime`
- Use `.order('asc')` or `.order('desc')` to specify
- Index queries order by index columns

### Full Text Search
```typescript
const messages = await ctx.db
  .query("messages")
  .withSearchIndex("search_body", (q) =>
    q.search("body", "hello hi").eq("channel", "#general"),
  )
  .take(10);
```

---

## Mutation Guidelines

- `ctx.db.replace(id, newDoc)` - fully replace document (throws if not exists)
- `ctx.db.patch(id, updates)` - shallow merge updates (throws if not exists)

---

## Action Guidelines

- Add `"use node";` at top of files using Node.js modules
- NEVER use `ctx.db` inside actions - they don't have database access

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

export const exampleAction = action({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("This action does not return anything");
    return null;
  },
});
```

---

## Scheduling Guidelines

### Cron Jobs
- Only use `crons.interval` or `crons.cron` methods
- Do NOT use `crons.hourly`, `crons.daily`, or `crons.weekly` helpers
- Pass FunctionReference, not the function directly
- Export crons as default

```typescript
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const empty = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("empty");
  },
});

const crons = cronJobs();

// Run every two hours
crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});

export default crons;
```

---

## File Storage Guidelines

- `ctx.storage.getUrl()` returns signed URL or `null` if file doesn't exist
- Do NOT use deprecated `ctx.storage.getMetadata`
- Query `_storage` system table instead:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type FileMetadata = {
  _id: Id<"_storage">;
  _creationTime: number;
  contentType?: string;
  sha256: string;
  size: number;
}

export const getFileMetadata = query({
  args: { fileId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const metadata: FileMetadata | null = await ctx.db.system.get(args.fileId);
    console.log(metadata);
    return null;
  },
});
```

- Convex storage uses `Blob` objects - convert to/from `Blob` when using storage

---

## Complete Example: Chat App

### package.json
```json
{
  "name": "chat-app",
  "version": "1.0.0",
  "dependencies": {
    "convex": "^1.31.2",
    "openai": "^4.79.0"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

### convex/schema.ts
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
  }),

  users: defineTable({
    name: v.string(),
  }),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  }).index("by_channel", ["channelId"]),
});
```

### convex/index.ts
```typescript
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { internal } from "./_generated/api";

export const createUser = mutation({
  args: { name: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", { name: args.name });
  },
});

export const createChannel = mutation({
  args: { name: v.string() },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("channels", { name: args.name });
  },
});

export const listMessages = query({
  args: { channelId: v.id("channels") },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      authorId: v.optional(v.id("users")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);
    return messages;
  },
});

export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const user = await ctx.db.get(args.authorId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: args.authorId,
      content: args.content,
    });
    await ctx.scheduler.runAfter(0, internal.index.generateResponse, {
      channelId: args.channelId,
    });
    return null;
  },
});

const openai = new OpenAI();

export const generateResponse = internalAction({
  args: { channelId: v.id("channels") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.index.loadContext, {
      channelId: args.channelId,
    });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: context,
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }
    await ctx.runMutation(internal.index.writeAgentResponse, {
      channelId: args.channelId,
      content,
    });
    return null;
  },
});

export const loadContext = internalQuery({
  args: { channelId: v.id("channels") },
  returns: v.array(
    v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);

    const result = [];
    for (const message of messages) {
      if (message.authorId) {
        const user = await ctx.db.get(message.authorId);
        if (!user) {
          throw new Error("User not found");
        }
        result.push({
          role: "user" as const,
          content: `${user.name}: ${message.content}`,
        });
      } else {
        result.push({ role: "assistant" as const, content: message.content });
      }
    }
    return result;
  },
});

export const writeAgentResponse = internalMutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      content: args.content,
    });
    return null;
  },
});
```

### convex/tsconfig.json
```json
{
  "compilerOptions": {
    "allowJs": true,
    "strict": true,
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "target": "ESNext",
    "lib": ["ES2021", "dom"],
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["./**/*"],
  "exclude": ["./_generated"]
}
```
