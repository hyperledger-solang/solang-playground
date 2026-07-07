import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";

if (process.env.NODE_ENV !== "production") {
  config({ path: "../../.env" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
