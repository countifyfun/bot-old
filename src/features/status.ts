import type { BotClient } from "@/structures/client";
import { env } from "@/utils/env";
import { CronJob } from "cron";

export default (client: BotClient) => {
  client.on("ready", () => {
    if (env.BETTERUPTIME_URL) {
      new CronJob(
        "* * * * *",
        async () => {
          await fetch(env.BETTERUPTIME_URL!);
        },
        null,
        true,
        "America/Los_Angeles"
      );
    }
  });
};
