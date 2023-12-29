import { Enmap } from "./enmap";

export interface Guild {
  channelId: string | null;
  count: number;
  lastCounter: string | null;
}

export const db = {
  guilds: new Enmap<string, Guild>({
    name: "Guild",
    dataDir: "./db/guilds",
  }),
  users: new Enmap({
    name: "User",
    dataDir: "./db/users",
  }),
};
