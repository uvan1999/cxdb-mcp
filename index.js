#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

const server = new McpServer({
  name: "cxdb-mcp",
  version: "1.0.0",
});

server.tool(
  "query",
  "Run a read-only SQL query against cxdb",
  { sql: z.string().describe("SQL SELECT statement to execute") },
  async ({ sql }) => {
    const trimmed = sql.trim().toLowerCase();
    if (!trimmed.startsWith("select") && !trimmed.startsWith("with")) {
      return { content: [{ type: "text", text: "Error: only SELECT / WITH queries are permitted." }], isError: true };
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      const result = await client.query(sql);
      await client.query("ROLLBACK");
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ rows: result.rows, rowCount: result.rowCount }, null, 2),
        }],
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    } finally {
      client.release();
    }
  }
);

server.tool(
  "list_tables",
  "List all tables in the cxdb database",
  {},
  async () => {
    const result = await pool.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result.rows, null, 2),
      }],
    };
  }
);

server.tool(
  "describe_table",
  "Show columns and types for a given table",
  { table: z.string().describe("Table name (optionally schema-qualified, e.g. public.orders)") },
  async ({ table }) => {
    const [schema, tableName] = table.includes(".") ? table.split(".") : ["public", table];
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position;
    `, [schema, tableName]);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result.rows, null, 2),
      }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
