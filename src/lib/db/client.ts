import postgres from "postgres";
import { readEnv } from "@/lib/env";

let sql: ReturnType<typeof postgres> | undefined;

export function getSql() {
  if (!sql) {
    const connectionString = readEnv("DATABASE_URL").replace(/[?&]uselibpqcompat=true/, "");
    sql = postgres(connectionString, {
      connection: { search_path: "medusastore" },
      max: 5,
      prepare: false,
    });
  }

  return sql;
}
