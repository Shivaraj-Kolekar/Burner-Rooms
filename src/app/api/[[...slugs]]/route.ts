import { redis } from "@/lib/redis";
import Elysia from "elysia";

import { nanoid } from "nanoid";
import { authMiddleware } from "./auth";
import z from "zod";
import { Message, realtime } from "@/lib/realtime";

interface RoomData {
  roomName?: string;
  maxParticipants?: number;
  timelimit?: number;
  connected: string[];
}
const rooms = new Elysia({ prefix: "/rooms" })
  .post(
    "/create",
    async ({ body }) => {
      const id = nanoid();
      await redis.hset(`meta:${id}`, {
        connected: [],
        createdAt: Date.now(),
        roomName: body.roomName,
        maxParticipants: body.maxParticipants,
        timelimit: body.timelimit,
      });
      const ROOM_TTL_SECONDS = body.timelimit ? 60 * body.timelimit : 60 * 10;
      await redis.expire(`meta:${id}`, ROOM_TTL_SECONDS);
      return { id };
    },
    {
      body: z.object({
        roomName: z.string().min(4).max(20).optional(),
        maxParticipants: z.number().int().min(2).max(10).optional(),
        timelimit: z.number().int().min(1).max(30).optional(),
      }),
    },
  )
  .use(authMiddleware)
  .get("/ttl", async (auth) => {
    const ttl = await redis.ttl(`meta:${auth.auth.roomid}`);
    return { ttl: ttl > 0 ? ttl : 0 };
  })
  .get("/info", async (auth) => {
    const roominfo = await redis.hgetall(`meta:${auth.auth.roomid}`);
    return roominfo;
  })
  .delete(
    "/",
    async (auth) => {
      await realtime
        .channel(auth.auth.roomid)
        .emit("chat.destroy", { isDestroyed: true });
      await Promise.all([
        redis.del(`meta:${auth.auth.roomid}`),
        redis.del(auth.auth.roomid),
        redis.del(`messages:${auth.auth.roomid}`),
        redis.del(`threads:${auth.auth.roomid}`), // Clean up thread data
      ]);
    },

    { query: z.object({ roomid: z.string() }) },
  );

const messages = new Elysia({ prefix: "/messages" })
  .use(authMiddleware)
  .post(
    "/",
    async ({ body, auth }) => {
      const { sender, text, parentId } = body;
      const { roomid } = auth;
      const roomExist = await redis.exists(`meta:${roomid}`);
      if (!roomExist) {
        throw new Error("Room does not exist");
      }

      // If it's a reply, verify parent message exists
      if (parentId) {
        const parentExists = await redis.hexists(
          `message:${roomid}:${parentId}`,
          "id",
        );
        if (!parentExists) {
          throw new Error("Parent message does not exist");
        }
      }

      const message: Message = {
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomid,
        token: auth.token,
        replyCount: 0,
      };

      // Only add parentId if it exists
      if (parentId) {
        message.parentId = parentId;
      }

      // Store message in a hash for easy retrieval
      await redis.hset(`message:${roomid}:${message.id}`, message);

      // Add message to main messages list
      await redis.rpush(`messages:${roomid}`, message.id);

      // If it's a reply, add to parent's replies list and increment reply count
      if (parentId) {
        await redis.rpush(`replies:${roomid}:${parentId}`, message.id);
        await redis.hincrby(`message:${roomid}:${parentId}`, "replyCount", 1);
      }

      // Emit message to realtime channel
      await realtime.channel(roomid).emit("chat.message", message);

      // Update TTL for all related keys
      const remainingTime = await redis.ttl(`meta:${roomid}`);
      await Promise.all(
        [
          redis.expire(`messages:${roomid}`, remainingTime),
          redis.expire(`message:${roomid}:${message.id}`, remainingTime),
          parentId &&
            redis.expire(`replies:${roomid}:${parentId}`, remainingTime),
        ].filter(Boolean),
      );

      return message;
    },
    {
      query: z.object({ roomid: z.string() }),
      body: z.object({
        sender: z.string().max(100),
        text: z.string().max(1000),
        parentId: z.string().optional(), // ✅ This should already be optional
      }),
    },
  )
  .get(
    "/",
    async ({ auth, query }) => {
      const { roomid } = auth;
      const { includeReplies = "false" } = query;

      // Get all message IDs from the list
      const messageIds = await redis.lrange(`messages:${roomid}`, 0, -1);

      if (!messageIds || messageIds.length === 0) {
        return { messages: [] };
      }

      // Fetch all messages from hashes
      const messages = await Promise.all(
        messageIds.map(async (id) => {
          const msg = await redis.hgetall(`message:${roomid}:${id}`);
          return msg;
        }),
      );

      // Filter out any null/undefined messages
      const validMessages = messages.filter((m) => m && m.id);

      // Filter to only top-level messages (no parent) if we're not including replies
      const topLevelMessages =
        includeReplies === "false"
          ? validMessages.filter((m) => !m?.parentId)
          : validMessages;

      // Optionally include replies
      if (includeReplies === "true") {
        const messagesWithReplies = await Promise.all(
          topLevelMessages.map(async (msg) => {
            if (msg?.parentId) return msg; // Skip if it's already a reply

            const replyIds = await redis.lrange(
              `replies:${roomid}:${msg?.id}`,
              0,
              -1,
            );

            if (!replyIds || replyIds.length === 0) {
              return {
                ...msg,
                token: msg?.token === auth.token ? auth.token : undefined,
                replies: [],
              };
            }

            const replies = await Promise.all(
              replyIds.map(async (id) => {
                const reply = await redis.hgetall(`message:${roomid}:${id}`);
                return {
                  ...reply,
                  token: reply?.token === auth.token ? auth.token : undefined,
                };
              }),
            );

            return {
              ...msg,
              token: msg?.token === auth.token ? auth.token : undefined,
              replies: replies.filter((r) => r && r?.token),
            };
          }),
        );
        return { messages: messagesWithReplies };
      }

      return {
        messages: topLevelMessages.map((m) => ({
          ...m,
          token: m?.token === auth.token ? auth.token : undefined,
        })),
      };
    },
    {
      query: z.object({
        roomid: z.string(),
        includeReplies: z.enum(["true", "false"]).optional(),
      }),
    },
  )
  // New endpoint to get replies for a specific message
  .get(
    "/replies/:messageId",
    async ({ auth, params }) => {
      const { roomid } = auth;
      const { messageId } = params;

      const replyIds = await redis.lrange<string>(
        `replies:${roomid}:${messageId}`,
        0,
        -1,
      );

      const replies = await Promise.all(
        replyIds.map(async (id) => {
          const reply = await redis.hgetall<Message>(`message:${roomid}:${id}`);
          return {
            ...reply,
            token: reply?.token === auth.token ? auth.token : undefined,
          };
        }),
      );

      return { replies };
    },
    {
      query: z.object({ roomid: z.string() }),
      params: z.object({ messageId: z.string() }),
    },
  );
const app = new Elysia({ prefix: "/api" }).use(rooms).use(messages);

export const GET = app.fetch;
export const POST = app.fetch;
export const DELETE = app.fetch;
export type App = typeof app;
