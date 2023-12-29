import { ColorResolvable } from "discord.js";
import { existsSync, readFileSync } from "fs";
import { parse } from "yaml";

const loadConfig = () => {
  let config: string;

  if (existsSync("./config.yml")) config = readFileSync("./config.yml", "utf8");
  else if (existsSync("./config.yaml"))
    config = readFileSync("./config.yaml", "utf8");
  else return {};

  return parse(config);
};

import { z } from "zod";

const configVariables = z.object({
  guildId: z.string().optional(),
  colors: z.object({
    primary: z.string().startsWith("#"),
    success: z.string().startsWith("#"),
    danger: z.string().startsWith("#"),
  }),
});

interface ConfigVariables extends z.infer<typeof configVariables> {
  colors: {
    primary: string & ColorResolvable;
    success: string & ColorResolvable;
    danger: string & ColorResolvable;
  };
}

const parsed = configVariables.safeParse(loadConfig());
if (parsed.success === false) {
  console.error(
    "❌ Invalid configuration:",
    parsed.error.flatten().fieldErrors
  );
  throw new SyntaxError("Invalid configuration");
}

export const config = parsed.data as ConfigVariables;
