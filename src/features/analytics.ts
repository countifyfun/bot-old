import type { BotClient } from "@/structures/client";
import { type Guild, db, getGuild } from "@/utils/db";
import { CronJob } from "cron";

export default (client: BotClient) => {
  client.on("ready", () => {
    new CronJob(
      "0 * * * *",
      () => {
        const servers = db.guilds
          .keyArray()
          .map((key) => ({ id: key, ...getGuild(key) }));

        for (const server of servers) {
          db.guilds.push(
            server.id,
            {
              time: Date.now(),
              count: server.count,
            } satisfies Guild["history"][number],
            "history"
          );
        }
      },
      null,
      true,
      "Africa/Abidjan"
    );
  });
};
