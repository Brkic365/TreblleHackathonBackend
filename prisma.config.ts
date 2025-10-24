import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: "file:./dev.db",
  },
});
