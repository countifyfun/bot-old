import { cfRatio } from "@/utils/cf-ratio";
import { config } from "@/utils/config";
import type { User } from "@/utils/db";
import { db, getGuild } from "@/utils/db";
import cors from "cors";
import type { GuildMember } from "discord.js";
import express from "express";
import { readFileSync } from "fs";
import https from "https";
import _ from "lodash";
import { env } from "process";
import { z } from "zod";
import type { BotClient } from "../structures/client";

function filterWithFields(
  info: object,
  res: express.Response,
  fields: string[] | undefined
) {
  let newInfo;

  if (fields) {
    for (const field of fields) {
      if (!_.get(info, field)) {
        res.status(422);
        return {
          error: {
            code: 422,
            message: `Invalid field '${field}'.`,
          },
        };
      }
    }

    newInfo = _.pick(info, fields);
  } else newInfo = info;

  return newInfo;
}

export default (client: BotClient) => {
  const api = express().use(cors());

  api.get("/servers", (_, res) => {
    const servers = db.guilds
      .keyArray()
      .map((key) => {
        const guild = client.guilds.cache.get(key);
        if (!guild) return;
        const data = getGuild(key);
        if (data.settings.unlisted) return;
        return {
          id: key,
          name: guild.name,
          avatar: guild.iconURL({ size: 4096 })?.replace("webp", "png"),
          count: data.count,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count);
    res.json(servers);
  });

  api.get("/servers/:id", (req, res) => {
    const { id } = req.params;
    const { fields: rawFields } = req.query;
    const parsedFields = z
      .array(z.string())
      .or(z.string())
      .optional()
      .parse(rawFields);
    const fields = (
      typeof parsedFields === "object" ? parsedFields.join(",") : parsedFields
    )?.split(",");

    const guild = client.guilds.cache.get(id);
    if (!guild)
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' could not be found.`,
        },
      });

    const data = getGuild(id);
    if (!data || !data.channelId)
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' does not have the counting system enabled.`,
        },
      });

    let previousUser: GuildMember | undefined,
      previousUserData: User | undefined;
    if (data.previousUserId) {
      previousUser = guild.members.cache.get(data.previousUserId);
      previousUserData = data.getUser(data.previousUserId);
    }

    return res.json(
      filterWithFields(
        {
          id,
          name: guild.name,
          avatar: guild.iconURL({ size: 4096 })?.replace("webp", "png"),
          count: data.count,
          previousUser: {
            id: data.previousUserId,
            name: previousUser?.displayName,
            username: previousUser?.user.username,
            avatar: previousUser
              ?.displayAvatarURL({ size: 4096 })
              .replace("webp", "png"),
            counts: previousUserData?.counts,
            fails: previousUserData?.fails,
          },
        },
        res,
        fields
      )
    );
  });

  api.get("/servers/:id/users", async (req, res) => {
    const { id } = req.params;
    const { sort: rawSort } = req.query;
    const parsedSort = z
      .array(z.enum(["counts", "fails", "cf_ratio"]))
      .or(z.enum(["counts", "fails", "cf_ratio"]))
      .optional()
      .parse(rawSort);
    const sort =
      (typeof parsedSort === "object" ? parsedSort[0] : parsedSort) ??
      "cf_ratio";

    const guild = client.guilds.cache.get(id);
    if (!guild)
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' could not be found.`,
        },
      });

    const data = getGuild(id);
    if (!data || !data.channelId)
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' does not have the counting system enabled.`,
        },
      });

    const users = (
      await Promise.all(
        Object.keys(data.users).map(async (key) => {
          const user =
            guild.members.cache.get(key) ?? (await guild.members.fetch(key));
          const userData = data.getUser(key);

          return {
            id: key,
            name: user?.displayName,
            username: user?.user.username,
            avatar: user
              ?.displayAvatarURL({ size: 4096 })
              .replace("webp", "png"),
            counts: userData.counts,
            fails: userData.fails,
          };
        })
      )
    ).sort((a, b) =>
      sort === "counts"
        ? b.counts - a.counts
        : sort === "fails"
          ? b.fails - a.fails
          : cfRatio(b.counts, b.fails) - cfRatio(a.counts, a.fails)
    );

    res.json(users.slice(0, 10));
  });

  api.get("/servers/:id/users/:userId", (req, res) => {
    const { id, userId } = req.params;
    const { fields: rawFields } = req.query;
    const parsedFields = z
      .array(z.string())
      .or(z.string())
      .optional()
      .parse(rawFields);
    const fields = (
      typeof parsedFields === "object" ? parsedFields.join(",") : parsedFields
    )?.split(",");

    const guild = client.guilds.cache.get(id);
    if (!guild)
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' could not be found.`,
        },
      });

    const data = getGuild(id);
    if (!data || !data.channelId)
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' does not have the counting system enabled.`,
        },
      });

    const user = guild.members.cache.get(userId);
    const userData = data.getUser(userId);
    if (!user || !userData)
      return res.status(404).json({
        error: {
          code: 404,
          message: `User with ID '${id}' could not be found.`,
        },
      });

    return res.json(
      filterWithFields(
        {
          server: {
            id,
            name: guild.name,
            avatar: guild.iconURL({ size: 4096 })?.replace("webp", "png"),
            count: data.count,
          },
          user: {
            id: userId,
            name: user.displayName,
            username: user.user.username,
            avatar: user
              .displayAvatarURL({ size: 4096 })
              .replace("webp", "png"),
          },
          counts: userData.counts,
          fails: userData.fails,
        },
        res,
        fields
      )
    );
  });

  api.get("/users/:id", (req, res) => {
    const { id } = req.params;
    const { fields: rawFields } = req.query;
    const parsedFields = z
      .array(z.string())
      .or(z.string())
      .optional()
      .parse(rawFields);
    const fields = (
      typeof parsedFields === "object" ? parsedFields.join(",") : parsedFields
    )?.split(",");

    const user = client.users.cache.get(id);
    if (!user)
      return res.status(404).json({
        error: {
          code: 404,
          message: `User with ID '${id}' could not be found.`,
        },
      });

    const guilds = db.guilds
      .keyArray()
      .map((key) => ({ id: key, ...db.guilds.get(key) }))
      .filter((guild) => guild.users?.[id])
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      .map((guild) => guild.users?.[id]!);
    const counts = guilds.reduce((acc, curr) => acc + curr.counts, 0);
    const fails = guilds.reduce((acc, curr) => acc + curr.fails, 0);

    return res.json(
      filterWithFields(
        {
          id,
          name: user.displayName,
          username: user.username,
          avatar: user.displayAvatarURL({ size: 4096 }).replace("webp", "png"),
          counts,
          fails,
        },
        res,
        fields
      )
    );
  });

  api.all("*", (_, res) => res.redirect("https://countify.fun"));

  client.on("ready", () => {
    if (env.NODE_ENV === "development") {
      api.listen(config.port, () => {
        console.log(`HTTP server listening on port ${config.port}.`);
      });
    } else {
      const privateKey = readFileSync(
        `/etc/letsencrypt/live/${config.domain}/privkey.pem`,
        "utf8"
      );
      const certificate = readFileSync(
        `/etc/letsencrypt/live/${config.domain}/fullchain.pem`,
        "utf8"
      );

      const credentials = {
        key: privateKey,
        cert: certificate,
      };

      const server = https.createServer(credentials, api);
      server.listen(443, () => {
        console.log("HTTPS server listening on port 443.");
      });

      api.use((req, res, next) => {
        if (req.protocol === "http") {
          const httpsUrl = `https://${req.headers.host}${req.url}`;
          return res.redirect(301, httpsUrl);
        }
        next();
      });
    }
  });
};
