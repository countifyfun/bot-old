import { botOptions } from "@/utils/bot-options";
import { config } from "@/utils/config";
import { env } from "@/utils/env";
import type { ApplicationCommandDataResolvable } from "discord.js";
import { Client, Collection } from "discord.js";
import fs from "fs";
import path from "path";
import type { CommandOptions } from "./command";

export class BotClient<Ready extends boolean = boolean> extends Client<Ready> {
  commands = new Collection<string, CommandOptions>();

  constructor() {
    super(botOptions);
  }

  connect() {
    this.login(env.DISCORD_TOKEN);
  }

  register() {
    const join = (...paths: string[]) => path.join(__dirname, ...paths);

    // commands
    const commands: ApplicationCommandDataResolvable[] = [];
    fs.readdirSync(join("../commands")).forEach(async (dir) => {
      const commandFiles = fs
        .readdirSync(join("../commands", dir))
        .filter((file) => file.endsWith("js") || file.endsWith("ts"));

      for (const file of commandFiles) {
        const command = require(join("../commands", dir, file))?.default;
        if (!command || !command.data || !command.run) return;

        commands.push(command.data.toJSON());
        this.commands.set(command.data.toJSON().name, command);
      }
    });

    this.on("ready", async () => {
      if (
        config.guildId &&
        typeof config.guildId === "string" &&
        config.guildId.length
      ) {
        const guild = this.guilds.cache.get(config.guildId);
        if (!guild)
          throw new SyntaxError(`No guild exists with ID '${config.guildId}'`);

        await guild.commands.set(commands);
        console.log(`Registered commands in ${guild.name}.`);
      } else {
        await this.application?.commands.set(commands);
        console.log("Registered commands globally.");
      }
    });

    // events
    fs.readdirSync(join("../events"))
      .filter((file) => file.endsWith("js") || file.endsWith("ts"))
      .forEach(async (file) => {
        const event = require(join("../events", file))?.default;
        if (!event || !event.name || !event.run) return;

        this.on(event.name, event.run.bind(null, this));
      });

    // features
    fs.readdirSync(join("../features"))
      .filter((file) => file.endsWith("js") || file.endsWith("ts"))
      .forEach(async (file) => {
        const feature = require(join("../features", file))?.default;
        if (!feature) return;
        feature(this);
      });
  }

  getSlashCommand(name: string) {
    if (
      config.guildId &&
      typeof config.guildId === "string" &&
      config.guildId.length
    ) {
      const guild = this.guilds.cache.get(config.guildId);
      if (!guild)
        throw new SyntaxError(`No guild exists with ID '${config.guildId}'`);

      return guild.commands.cache.find(
        (command) =>
          command.applicationId === this.user?.id && command.name === name
      );
    } else {
      return this.application?.commands.cache.find(
        (command) =>
          command.applicationId === this.user?.id && command.name === name
      );
    }
  }
}
