import { config } from "@/utils/config";
import { db, getGuild } from "@/utils/db";
import cors from "cors";
import express from "express";
import _ from "lodash";
import { z } from "zod";
import { BotClient } from "../structures/client";

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

  api.get("/server/:id", (req, res) => {
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

    return res.json(
      filterWithFields(
        {
          id,
          name: guild.name,
          avatar: guild.iconURL({ size: 4096 }),
          count: data.count,
        },
        res,
        fields
      )
    );
  });

  api.get("/server/:id/user/:userId", (req, res) => {
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

    const user = client.users.cache.get(userId);
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
            avatar: guild.iconURL({ size: 4096 }),
            count: data.count,
          },
          user: {
            id: userId,
            name: user.displayName,
            username: user.username,
            avatar: user.displayAvatarURL({ size: 4096 }),
          },
          counts: userData.counts,
          fails: userData.fails,
        },
        res,
        fields
      )
    );
  });

  api.get("/user/:id", (req, res) => {
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
      .map((guild) => guild.users?.[id]!);
    const counts = guilds.reduce((acc, curr) => acc + curr.counts, 0);
    const fails = guilds.reduce((acc, curr) => acc + curr.fails, 0);

    return res.json(
      filterWithFields(
        {
          id,
          name: user.displayName,
          username: user.username,
          avatar: user.displayAvatarURL({ size: 4096 }),
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
    api.listen(config.port, () => {
      console.log(`Listening on port ${config.port}.`);
    });
  });
};
