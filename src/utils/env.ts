import "dotenv/config";
import { z } from "zod";

const envVariables = z.object({
  DISCORD_TOKEN: z.string(),
  NEXTAUTH_SECRET: z.string(),
  BETTERUPTIME_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
});

const parsed = envVariables.safeParse(process.env);
if (parsed.success === false) {
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  );
  throw new SyntaxError("Invalid environment variables");
}

export const env = parsed.data;
