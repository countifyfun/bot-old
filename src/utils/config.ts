import type { ColorResolvable } from "discord.js";
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
  guildId: z.string().nullable().optional(),
  port: z.number().default(3000),
  domain: z.string().nullable().optional(),
  colors: z.object({
    primary: z.string().startsWith("#"),
    success: z.string().startsWith("#"),
    danger: z.string().startsWith("#"),
  }),
});

type Prettify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};

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

export const config = parsed.data as Prettify<ConfigVariables>;
