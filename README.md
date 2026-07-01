# cxdb-mcp

A Model Context Protocol (MCP) server that gives Claude direct, read-only access to the `cxdb` PostgreSQL database. This lets you query production data in plain English — no SQL knowledge required — straight from Claude Code or the Claude desktop app.

---

## Why does this exist?

Normally, getting data out of `cxdb` means opening a database client, writing SQL, and sharing results manually. This tool removes that friction.

With `cxdb-mcp` connected to Claude, you can ask things like:

- *"How many loads were posted last week?"*
- *"Give me the details of the user with email x@example.com"*
- *"What tables relate to companies and subscriptions?"*

Claude handles the SQL, runs it safely in a **read-only transaction**, and returns the results directly in your conversation. No write access is possible.

---

## Tools available

| Tool | What it does |
|---|---|
| `query` | Runs a `SELECT` or `WITH` query against cxdb |
| `list_tables` | Lists all tables in the database |
| `describe_table` | Shows columns and types for a given table |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Claude Code](https://claude.ai/code) (CLI or desktop app)
- Database credentials for `cxdb` — ask devops team

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/uvan1999/cxdb-mcp.git
cd cxdb-mcp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your credentials

Copy the example env file and fill in your own database details:

```bash
cp .env.example .env
```

Open `.env` and set the values:

```env
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

> **Never commit `.env` to git.** It is already listed in `.gitignore`.

### 4. Register the MCP server with Claude Code

Open your Claude Code settings file at `~/.claude/settings.json` and add the following inside the `mcpServers` object:

```json
"cxdb": {
  "command": "node",
  "args": ["/absolute/path/to/cxdb-mcp/index.js"],
  "env": {
    "DB_HOST": "your-db-host",
    "DB_PORT": "5432",
    "DB_NAME": "your-db-name",
    "DB_USER": "your-db-user",
    "DB_PASSWORD": "your-db-password"
  }
}
```

Replace `/absolute/path/to/cxdb-mcp/` with the actual path where you cloned the repo (e.g. `/Users/yourname/projects/cxdb-mcp`).

> The credentials go in `settings.json` rather than the `.env` file when using Claude Code, because Claude Code passes them as environment variables directly to the server process.

### 5. Restart Claude Code

After saving `settings.json`, restart Claude Code for the MCP server to be picked up.

---

## Verify it's working

In Claude Code, ask:

> *"List the tables in cxdb"*

Claude should respond with a list of all tables — no SQL required.

---

## Security notes

- All queries run inside a **read-only transaction** (`BEGIN READ ONLY`). Writes, deletes, and schema changes are not possible.
- Only `SELECT` and `WITH` statements are accepted. Any other statement type is rejected before it reaches the database.
- Your credentials are never stored in this repository. The `.gitignore` excludes `.env` and the source code contains no hardcoded values.
