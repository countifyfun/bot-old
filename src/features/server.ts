import { cfRatio } from "@/utils/cf-ratio";
import { config } from "@/utils/config";
import type { User } from "@/utils/db";
import { db, getGuild } from "@/utils/db";
import { env } from "@/utils/env";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { CategoryChannel, TextChannel } from "discord.js";
import {
  ChannelType,
  PermissionsBitField,
  type APIGuild,
  type GuildMember,
} from "discord.js";
import express from "express";
import { readFileSync } from "fs";
import https from "https";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import type { BotClient } from "../structures/client";
import { Webhook } from "@top-gg/sdk";
import { SuccessEmbed } from "@/utils/embed";
import swaggerJsDoc, { type SwaggerDefinition } from "swagger-jsdoc";

const swaggerDefinition: SwaggerDefinition = {
  openapi: "3.1.0",
  info: {
    title: "Countify",
    description: "The API for your dream Discord counting bot.",
    version: "2.0.0",
  },
  servers: [
    {
      url: "https://api.countify.fun",
    },
  ],
};

export default (client: BotClient) => {
  const api = express().use(cors()).use(cookieParser()).use(express.json());

  const openapiSpecification = swaggerJsDoc({
    swaggerDefinition,
    apis: ["./src/features/server.ts"],
  });

  api.get("/openapi.json", (_, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(openapiSpecification);
  });

  api.get("/", (_, res) =>
    res.redirect("https://docs.countify.fun/api-reference")
  );

  api.get("/dashboard/servers", async (req, res) => {
    let authorization = req.headers.authorization;
    if (!authorization) {
      const token = await getToken({
        req,
      });
      authorization = token ? `Bearer ${token.access_token}` : undefined;
    }
    if (!authorization)
      return res.status(401).json({
        error: {
          code: 401,
          message: "Unauthorized.",
        },
      });

    const discordRes = await fetch(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: {
          Authorization: authorization,
        },
      }
    );
    if (discordRes.status === 401)
      return res.status(401).json({
        error: {
          code: 401,
          message: "Unauthorized.",
        },
      });

    const data = (await discordRes.json()) as APIGuild[];
    const guilds = data
      .filter((g) =>
        new PermissionsBitField(g.permissions as unknown as bigint).has(
          "ManageGuild"
        )
      )
      .sort((a, b) =>
        client.guilds.cache.get(a.id) && client.guilds.cache.get(b.id)
          ? 0
          : client.guilds.cache.get(a.id)
            ? -1
            : client.guilds.cache.get(b.id)
              ? 1
              : 0
      )
      .map((g) => ({ ...g, botInGuild: !!client.guilds.cache.get(g.id) }));

    res.json(guilds);
  });

  api.get("/dashboard/servers/:id", async (req, res) => {
    const { id } = req.params;

    let authorization = req.headers.authorization;
    if (!authorization) {
      const token = await getToken({
        req,
      });
      authorization = token ? (token.access_token as string) : undefined;
    }
    if (!authorization)
      return res.status(401).json({
        error: {
          code: 401,
          message: "Unauthorized.",
        },
      });

    const guild = client.guilds.cache.get(id);
    if (!guild)
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' could not be found.`,
        },
      });

    const guildData = getGuild(id);

    res.json({
      id,
      name: guild.name,
      avatar: guild.iconURL({ size: 4096 })?.replace("webp", "png"),
      channels: guild.channels.cache
        .filter(
          (channel) =>
            channel.type === ChannelType.GuildText &&
            !channel.parentId &&
            channel
              .permissionsFor(guild.members.me!)
              .has(["ViewChannel", "ManageMessages"])
        )
        .sort(
          (a, b) => (a as TextChannel).position - (b as TextChannel).position
        )
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
        })),
      categories: guild.channels.cache
        .filter((channel) => channel.type === ChannelType.GuildCategory)
        .sort(
          (a, b) =>
            (a as CategoryChannel).position - (b as CategoryChannel).position
        )
        .map((category) => ({
          id: category.id,
          name: category.name,
          channels: (category as CategoryChannel).children.cache
            .filter(
              (channel) =>
                channel.type === ChannelType.GuildText &&
                channel
                  .permissionsFor(guild.members.me!)
                  .has(["ViewChannel", "ManageMessages"])
            )
            .sort(
              (a, b) =>
                (a as TextChannel).position - (b as TextChannel).position
            )
            .map((channel) => ({
              id: channel.id,
              name: channel.name,
            })),
        }))
        .filter((category) => category.channels.length),
      channelId: guildData.channelId,
      count: guildData.count,
      settings: guildData.settings,
    });
  });

  api.patch("/dashboard/servers/:id", async (req, res) => {
    const { id } = req.params;

    let authorization = req.headers.authorization;
    if (!authorization) {
      const token = await getToken({
        req,
      });
      authorization = token ? (token.access_token as string) : undefined;
    }
    if (!authorization)
      return res.status(401).json({
        error: {
          code: 401,
          message: "Unauthorized.",
        },
      });

    if (!client.guilds.cache.get(id))
      return res.status(404).json({
        error: {
          code: 404,
          message: `Guild with ID '${id}' could not be found.`,
        },
      });

    const guildData = getGuild(id);
    if (req.body.channelId) guildData.set(req.body.channelId, "channelId");
    if (req.body.count) guildData.set(req.body.count, "count");
    if (typeof req.body.oneByOne === "boolean")
      guildData.set(req.body.oneByOne, "settings.oneByOne");
    if (typeof req.body.resetOnFail === "boolean")
      guildData.set(req.body.resetOnFail, "settings.resetOnFail");
    if (typeof req.body.noDeletion === "boolean")
      guildData.set(req.body.noDeletion, "settings.noDeletion");
    if (typeof req.body.pinMilestones === "boolean")
      guildData.set(req.body.pinMilestones, "settings.pinMilestones");
    if (typeof req.body.unlisted === "boolean")
      guildData.set(req.body.unlisted, "settings.unlisted");

    res.json({
      success: true,
    });
  });

  /**
   * @openapi
   * /servers:
   *    get:
   *      description: "Retrive a list of servers sorted by highest count."
   *      responses:
   *        200:
   *          description: "Successfully retrived servers."
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  type: object
   *                  properties:
   *                    id:
   *                      type: string
   *                    name:
   *                      type: string
   *                    avatar:
   *                      type: string
   *                      nullable: true
   *                    count:
   *                      type: number
   */
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

  /**
   * @openapi
   * "/servers/{id}":
   *    get:
   *      description: "Retrive information about the specified server ID."
   *      parameters:
   *        - name: id
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            description: "A server ID."
   *          example: "977485367294959627"
   *      responses:
   *        200:
   *          description: "Successfully retrived server."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  id:
   *                    type: string
   *                  name:
   *                    type: string
   *                  avatar:
   *                    type: string
   *                    nullable: true
   *                  count:
   *                    type: number
   *                  previousUser:
   *                    type: object
   *                    properties:
   *                      id:
   *                        type: string
   *                      name:
   *                        type: string
   *                      username:
   *                        type: string
   *                      avatar:
   *                        type: string
   *                      counts:
   *                        type: number
   *                      fails:
   *                        type: number
   *        404:
   *          description: "Server not found or does not have the counting system enabled."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  error:
   *                    type: object
   *                    properties:
   *                      code:
   *                        type: number
   *                        default: 404
   *                      message:
   *                        type: string
   */
  api.get("/servers/:id", (req, res) => {
    const { id } = req.params;

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

    return res.json({
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
    });
  });

  /**
   * @openapi
   * "/servers/{id}/history":
   *    get:
   *      description: "Retrive the count history the specified server ID."
   *      parameters:
   *        - name: id
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            description: "A server ID."
   *          example: "977485367294959627"
   *      responses:
   *        200:
   *          description: "Successfully retrived server history."
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  type: object
   *                  properties:
   *                    time:
   *                      type: integer
   *                      format: int64
   *                      minimum: 1
   *                    count:
   *                      type: number
   *        404:
   *          description: "Server not found or does not have the counting system enabled."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  error:
   *                    type: object
   *                    properties:
   *                      code:
   *                        type: number
   *                        default: 404
   *                      message:
   *                        type: string
   */
  api.get("/servers/:id/history", (req, res) => {
    const { id } = req.params;

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

    return res.json(data.history);
  });

  api.get("/server/:id", (req, res) =>
    res.redirect(`/servers/${req.params.id}`)
  );

  /**
   * @openapi
   * "/servers/{id}/users":
   *    get:
   *      description: "Retrive a paginated list of all the users from the specified server ID."
   *      parameters:
   *        - name: id
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            description: "A server ID."
   *          example: "977485367294959627"
   *        - name: sort
   *          in: query
   *          required: false
   *          schema:
   *            type: string
   *            enum: ["counts", "fails", "cf_ratio"]
   *            default: "cf_ratio"
   *          description: "A sort type."
   *        - name: page
   *          in: query
   *          required: false
   *          schema:
   *            type: number
   *            default: 1
   *          description: "The page to view."
   *      responses:
   *        200:
   *          description: "Successfully retrived server history."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  users:
   *                    type: array
   *                    items:
   *                      type: object
   *                      properties:
   *                        id:
   *                          type: string
   *                        name:
   *                          type: string
   *                        username:
   *                          type: string
   *                        avatar:
   *                          type: string
   *                        counts:
   *                          type: number
   *                        fails:
   *                          type: number
   *                  totalPages:
   *                    type: number
   *                    default: 1
   *        404:
   *          description: "Server not found or does not have the counting system enabled."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  error:
   *                    type: object
   *                    properties:
   *                      code:
   *                        type: number
   *                        default: 404
   *                      message:
   *                        type: string
   *        401:
   *          description: "Invalid parameters specified."
   *          content:
   *            application/json:
   *              schema:
   *                type: array
   *                items:
   *                  type: object
   *                  properties:
   *                    type:
   *                      type: string
   *                    errors:
   *                      type: object
   *                      properties:
   *                        issues:
   *                          type: array
   *                          items:
   *                            type: object
   *                            properties:
   *                              code:
   *                                type: string
   *                              expected:
   *                                type: string
   *                                nullable: true
   *                              recieved:
   *                                type: string
   *                              options:
   *                                type: array
   *                                items:
   *                                  type: string
   *                                nullable: true
   *                              path:
   *                                type: array
   *                                items:
   *                                  type: string
   *                              message:
   *                                type: string
   *                        name:
   *                          type: string
   */
  api.get(
    "/servers/:id/users",
    validateRequest({
      query: z.object({
        sort: z.enum(["counts", "fails", "cf_ratio"]).optional(),
        page: z.coerce.number().optional(),
      }),
    }),
    async (req, res) => {
      const { id } = req.params;
      const { sort = "cf_ratio", page = 1 } = req.query;

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

      const pageSize = 10;
      const startIndex = (page - 1) * pageSize;
      const endIndex = page * pageSize;
      const totalPages = Math.ceil(users.length / pageSize);

      res.json({ users: users.slice(startIndex, endIndex), totalPages });
    }
  );

  /**
   * @openapi
   * "/servers/{serverId}/users/{userId}":
   *    get:
   *      description: "Retrive information about the specified user ID from the specified server ID."
   *      parameters:
   *        - name: serverId
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            description: "A server ID."
   *          example: "977485367294959627"
   *        - name: userId
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            description: "A user ID."
   *          example: "955408387905048637"
   *      responses:
   *        200:
   *          description: "Successfully retrived user."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  server:
   *                    type: object
   *                    properties:
   *                      id:
   *                        type: string
   *                      name:
   *                        type: string
   *                      avatar:
   *                        type: string
   *                        nullable: true
   *                      count:
   *                        type: number
   *                  user:
   *                    type: object
   *                    properties:
   *                      id:
   *                        type: string
   *                      name:
   *                        type: string
   *                      username:
   *                        type: string
   *                      avatar:
   *                        type: string
   *                  counts:
   *                    type: number
   *                  fails:
   *                    type: number
   *        404:
   *          description: "Server or user not found or the server does not have the counting system enabled."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  error:
   *                    type: object
   *                    properties:
   *                      code:
   *                        type: number
   *                        default: 404
   *                      message:
   *                        type: string
   */
  api.get("/servers/:id/users/:userId", (req, res) => {
    const { id, userId } = req.params;

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

    return res.json({
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
        avatar: user.displayAvatarURL({ size: 4096 }).replace("webp", "png"),
      },
      counts: userData.counts,
      fails: userData.fails,
    });
  });

  /**
   * @openapi
   * "/users/{id}":
   *    get:
   *      description: "Retrive information about the specified user ID."
   *      parameters:
   *        - name: id
   *          in: path
   *          required: true
   *          schema:
   *            type: string
   *            description: "A user ID."
   *          example: "955408387905048637"
   *      responses:
   *        200:
   *          description: "Successfully retrived user."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  id:
   *                    type: string
   *                  name:
   *                    type: string
   *                  username:
   *                    type: string
   *                  avatar:
   *                    type: string
   *                  counts:
   *                    type: number
   *                  fails:
   *                    type: number
   *        404:
   *          description: "User not found."
   *          content:
   *            application/json:
   *              schema:
   *                type: object
   *                properties:
   *                  error:
   *                    type: object
   *                    properties:
   *                      code:
   *                        type: number
   *                        default: 404
   *                      message:
   *                        type: string
   */
  api.get("/users/:id", (req, res) => {
    const { id } = req.params;

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

    return res.json({
      id,
      name: user.displayName,
      username: user.username,
      avatar: user.displayAvatarURL({ size: 4096 }).replace("webp", "png"),
      counts,
      fails,
    });
  });

  const webhook = new Webhook(env.TOPGG_AUTH_SECRET);
  api.post(
    "/topgg-webhook",
    webhook.listener(async (vote) => {
      const channel = await client.channels.fetch("1194558896833040504");
      if (!channel || !channel.isTextBased()) return;

      channel.send({
        embeds: [
          new SuccessEmbed()
            .setAuthor({
              name: client.user!.username,
              iconURL: client.user!.displayAvatarURL(),
            })
            .setTitle("New vote!")
            .setDescription(
              `<@${vote.user}> just voted for Countify on **top.gg**!`
            )
            .setTimestamp(),
        ],
      });
    })
  );

  api.all("*", (req, res) => {
    res.status(404).json({
      error: {
        code: 404,
        message: `Route '${req.path}' not found.`,
      },
    });
  });

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
