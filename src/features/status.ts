import type { BotClient } from "@/structures/client";
import { env } from "@/utils/env";
import { CronJob } from "cron";

export default (client: BotClient) => {
  client.on("ready", () => {
    if (env.BETTERUPTIME_URL) {
      console.log("betteruptime");
      new CronJob("* * * * *", async () => {
        await fetch(env.BETTERUPTIME_URL!);
      });
    }
  });
};
