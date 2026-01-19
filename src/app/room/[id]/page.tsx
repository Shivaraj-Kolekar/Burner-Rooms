"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useRealtime } from "@/lib/realtime-client";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  Box,
  Clock4,
  Download,
  Hash,
  MessageCircle,
  Send,
  Users,
  X,
  Menu,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { Grid } from "@giphy/react-components";
import { GiphyFetch } from "@giphy/js-fetch-api";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const formatTimeRemaining = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const Page = () => {
  return (
    <Suspense>
      <RoomPage />
    </Suspense>
  );
};

const RoomPage = () => {
  interface MessagesResponse {
    messages: Message[];
  }
  interface Message {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
    roomid: string;
    token?: string;
    parentId?: string;
    replyCount?: number;
    parentMessage?: Message;
  }
  interface RoomData {
    roomName?: string;
    maxParticipants?: number;
    timelimit?: number;
    connected: string[];
  }

  const params = useParams();
  const { username } = useUsername();
  const router = useRouter();
  const roomid = params.id as string;

  const [copyState, setCopyState] = useState("Copy");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [copyMessageState, setCopyMessageState] = useState("Copy");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [input, setInput] = useState<string>("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const gif = new GiphyFetch("idMD7nSh8eXBHFMbs7nPkQho9u5ArRJy");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGifClick = (gif: any, e: any) => {
    e.preventDefault();
    SendMessage({ text: gif.images.fixed_height.url });
    setShowGifPicker(false);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    }

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji: any) => {
    const cursorPosition = inputRef.current?.selectionStart || input.length;
    const newText =
      input.slice(0, cursorPosition) +
      emoji.native +
      input.slice(cursorPosition);
    setInput(newText);
    setShowEmojiPicker(false);

    setTimeout(() => {
      inputRef.current?.focus();
      const newPosition = cursorPosition + emoji.native.length;
      inputRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomid],
    queryFn: async () => {
      const res = await client.rooms.ttl.get({ query: { roomid } });
      return res.data;
    },
  });

  const { data: roomData } = useQuery({
    queryKey: ["room-info", roomid],
    queryFn: async (): Promise<RoomData> => {
      const res = await client.rooms.info.get({ query: { roomid } });
      if (!res.data) throw new Error("Room data is null");
      return {
        ...res.data,
        connected: Array.isArray(res.data.connected) ? res.data.connected : [],
      };
    },
  });

  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl);
    else setTimeRemaining(100);
  }, [ttlData]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;
    if (timeRemaining === 60) toast.warning("Room will expire in 60 seconds");
    if (timeRemaining === 0) router.push("/?destroyed");

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  const url = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopyState("Copied");
    setTimeout(() => setCopyState("Copy"), 2000);
  };

  const copyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    setCopyMessageState("Copied");
    toast.success("Message copied!");
    setTimeout(() => setCopyMessageState("Copy"), 2000);
  };
  const { data: messages, refetch } = useQuery<MessagesResponse>({
    queryKey: ["messages", roomid],
    queryFn: async () => {
      const res = await client.messages.get({
        query: { roomid, includeReplies: "true" },
      });

      // Handle null response
      if (!res.data) {
        return { messages: [] };
      }

      return res.data as MessagesResponse;
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getParentMessage = (parentId: string) => {
    return messages?.messages.find((m) => m.id === parentId);
  };

  const isGifUrl = (text: string) => {
    return text.match(/\.(gif|giphy\.com|tenor\.com)/i);
  };

  const { mutate: SendMessage, isPending } = useMutation({
    mutationFn: async ({
      text,
      parentId,
    }: {
      text: string;
      parentId?: string;
    }) => {
      const payload: any = { sender: username, text };
      if (parentId) payload.parentId = parentId;
      await client.messages.post(payload, { query: { roomid } });
    },
    onSuccess: () => {
      setReplyingTo(null);
    },
  });

  const { mutate: DestroyRoom } = useMutation({
    mutationFn: async () => {
      await client.rooms.delete(null, { query: { roomid } });
    },
  });

  useRealtime({
    channels: [roomid],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") refetch();
      if (event === "chat.destroy") router.push("/?destroyed=true");
    },
  });

  const handleSend = () => {
    if (input.trim()) {
      SendMessage({
        text: input,
        ...(replyingTo?.id && { parentId: replyingTo.id }),
      });
      setInput("");
      setReplyingTo(null);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* HEADER - Fixed at top */}
      <header className="border-b border-zinc-800 bg-background z-10 shrink-0">
        {/* Desktop Header */}
        <div className="hidden lg:flex justify-between items-center p-4">
          <div className="flex items-center gap-2">
            <div className="border-2 bg-muted/50 hover:border-orange-600 transition-all flex p-1 items-center gap-2">
              <div className="bg-muted border p-2">
                <Box />
              </div>
              <span className="flex flex-col text-xs text-zinc-500 uppercase">
                <p className="text-[10px]">Room Name:</p>
                <span className="text-green-500 font-bold">
                  {roomData?.roomName || "Loading..."}
                </span>
              </span>
            </div>

            <div className="h-14 w-px bg-zinc-800"></div>

            <Dialog>
              <DialogTrigger className="hover:border-orange-600 transition-all border-2 p-3 bg-muted/50">
                Invite Friends
              </DialogTrigger>
              <DialogContent className="w-full max-w-2xl">
                <DialogHeader className="border-b-2 pb-4">
                  <DialogTitle>Invite Friends</DialogTitle>
                  <DialogDescription>
                    Share the private chat link to invite your friends.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 pb-4 border-b-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest">
                    Share Room Link
                  </label>
                  <div className="flex h-12">
                    <Input
                      readOnly
                      value={url}
                      className="h-full border-r-0 rounded-none font-mono text-xs focus-visible:ring-0 focus-visible:border-orange-500 transition-colors"
                    />
                    <Button
                      onClick={copyLink}
                      className="h-full bg-orange-600 hover:bg-orange-500 font-black uppercase tracking-wider rounded-none px-6"
                    >
                      {copyState}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-4">
                    <div className="border-2 aspect-square flex items-center justify-center">
                      <QRCodeCanvas
                        value={url}
                        size={200}
                        level="H"
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        includeMargin={true}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="border-2 p-4 space-y-4">
                      <h4 className="text-[10px] uppercase font-bold border-b border-border pb-2">
                        Room Info
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Hash className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-gray-500 font-bold uppercase w-16">
                            Name:
                          </span>
                          <span className="text-sm font-bold tracking-wide truncate">
                            {roomData?.roomName || "UNKNOWN"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-gray-500 font-bold uppercase w-16">
                            Agents:
                          </span>
                          <span className="text-sm">
                            {roomData?.connected.length}/
                            {roomData?.maxParticipants} Joined
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock4 className="w-4 h-4 text-orange-500" />
                          <span className="text-xs text-gray-500 font-bold uppercase w-16">
                            Time:
                          </span>
                          <span className="text-sm font-mono">
                            {formatTimeRemaining(ttlData?.ttl as number)} Left
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      className="w-full h-14 bg-orange-600 uppercase tracking-widest text-xs font-bold rounded-none flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex items-center border-x-2 px-6 flex-col">
            <span className="text-sm uppercase">Auto Purge</span>
            <div className="flex items-center gap-2">
              <Clock4 size={16} />
              <span
                className={`text-xl md:text-2xl font-bold ${timeRemaining !== null && timeRemaining < 60 ? "text-red-500" : "text-yellow-500"}`}
              >
                {timeRemaining !== null
                  ? formatTimeRemaining(timeRemaining)
                  : "--:--"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border items-center bg-muted px-2 py-1 gap-2">
              <Users size={16} />
              <span>
                {roomData?.connected?.length}/
                {roomData?.maxParticipants as number}
              </span>
              <p>Agents</p>
            </div>
            {/*<ModeToggle />*/}
            <Button
              variant="destructive"
              onClick={() => DestroyRoom()}
              className="py-4"
            >
              Destroy Now
            </Button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden p-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-muted border p-2">
                <Box size={20} />
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-zinc-500 uppercase">Room</p>
                <span className="text-sm text-green-500 font-bold truncate max-w-[120px]">
                  {roomData?.roomName || "Loading..."}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`text-sm font-bold ${timeRemaining !== null && timeRemaining < 60 ? "text-red-500" : "text-yellow-500"}`}
              >
                {timeRemaining !== null
                  ? formatTimeRemaining(timeRemaining)
                  : "--:--"}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <Menu size={20} />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Agents:</span>
                <span>
                  {roomData?.connected?.length}/{roomData?.maxParticipants}
                </span>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 text-xs">
                      Invite
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-md">
                    <DialogHeader>
                      <DialogTitle>Invite Friends</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex h-10">
                        <Input
                          readOnly
                          value={url}
                          className="h-full rounded-r-none text-xs"
                        />
                        <Button
                          onClick={copyLink}
                          className="h-full rounded-l-none"
                        >
                          {copyState}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <ModeToggle />
                <Button
                  variant="destructive"
                  onClick={() => DestroyRoom()}
                  size="sm"
                  className="text-xs"
                >
                  Destroy
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MESSAGES AREA - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto">
          {messages?.messages && messages.messages.length > 0 ? (
            <div className="space-y-3">
              {messages.messages.map((msg) => {
                const parentMessage = msg?.parentId
                  ? getParentMessage(msg?.parentId)
                  : null;
                return (
                  <div
                    key={msg?.id}
                    className={`flex ${msg?.sender === username ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${
                        msg?.sender === username
                          ? "bg-orange-600/20 border border-orange-600/50"
                          : "bg-muted border border-accent"
                      }`}
                    >
                      {msg.parentId && parentMessage && (
                        <div className="mb-2 pl-2 border-l-2 border-orange-500/50 bg-background/50 p-2 rounded text-xs">
                          <p className="text-zinc-400 flex items-center gap-1 mb-1">
                            <MessageCircle className="w-3 h-3" />
                            <span className="text-blue-500 font-semibold">
                              {parentMessage.sender}
                            </span>
                          </p>
                          <p className="text-zinc-300 truncate italic">
                            {isGifUrl(parentMessage.text)
                              ? "🖼️ GIF"
                              : parentMessage.text.length > 50
                                ? parentMessage.text.substring(0, 50) + "..."
                                : parentMessage.text}
                          </p>
                        </div>
                      )}

                      {msg.parentId && !parentMessage && (
                        <div className="mb-2 pl-2 border-l-2 border-red-500/50 bg-red-500/10 p-2 rounded text-xs">
                          <p className="text-red-400 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            Replying to deleted message
                          </p>
                        </div>
                      )}

                      <p
                        className={`text-xs mb-1 ${msg.sender === username ? "text-green-400" : "text-blue-400"}`}
                      >
                        {msg.sender === username ? "You" : msg.sender}
                      </p>

                      {isGifUrl(msg.text) ? (
                        <img
                          src={msg.text}
                          alt="GIF"
                          className="rounded w-full h-auto max-h-64 object-contain"
                        />
                      ) : (
                        <ContextMenu>
                          <ContextMenuTrigger>
                            <div className="text-sm md:text-base font-medium break-words">
                              {msg.text}
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              onClick={() => copyMessage(msg.text)}
                            >
                              Copy
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => setReplyingTo(msg)}>
                              Reply
                            </ContextMenuItem>
                            <ContextMenuItem>React</ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )}

                      <p className="mt-2 text-xs text-zinc-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex h-[60vh] justify-center items-center">
              <Alert className="w-fit p-5">
                <AlertCircleIcon />
                <AlertTitle>
                  No messages yet in the chat, start the conversation
                </AlertTitle>
              </Alert>
            </div>
          )}
        </div>
      </div>

      {/* INPUT AREA - Fixed at bottom */}
      <div className="border-t border-zinc-800  bg-background backdrop-blur-sm shrink-0">
        {replyingTo && (
          <div className="border-b border-zinc-800 bg-muted/30 px-4 py-2">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400">
                    Replying to{" "}
                    <span className="text-blue-500">{replyingTo.sender}</span>
                  </p>
                  <p className="text-sm truncate text-zinc-300">
                    {isGifUrl(replyingTo.text) ? "GIF" : replyingTo.text}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReplyingTo(null)}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="p-2 md:p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-0">
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`h-10 w-10 md:h-12 md:w-12 ${showEmojiPicker ? "text-yellow-400 bg-yellow-400/10" : ""}`}
              >
                <Smile className="w-5 h-5" />
              </Button>

              {showEmojiPicker && (
                <div
                  ref={pickerRef}
                  className="absolute bottom-full left-0 mb-2 z-50"
                >
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="dark"
                    previewPosition="none"
                    maxFrequentRows={2}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                className="min-h-10 max-h-10 resize-none pr-12"
                placeholder="Type a message..."
                value={input}
                maxLength={1000}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onChange={(e) => setInput(e.target.value)}
              />
              {input.length > 0 && (
                <div className="absolute right-3 bottom-2 text-xs text-zinc-500 pointer-events-none">
                  {input.length}/1000
                </div>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="min-h-10 max-h-10 resize-none bg-orange-600 hover:bg-orange-500"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline ml-2">Send</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
