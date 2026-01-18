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
  Clock,
  MessageCircle,
  Send,
  SeparatorVertical,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
const formatTimeRemaining = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
import { Grid } from "@giphy/react-components";
import { GiphyFetch } from "@giphy/js-fetch-api";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { toast } from "sonner";
export const Page = () => {
  return (
    <Suspense>
      <RoomPage />
    </Suspense>
  );
};
const RoomPage = () => {
  const params = useParams();
  const { username } = useUsername();
  const router = useRouter();
  const roomid = params.id as string;
  const [copyState, setCopyState] = useState("Copy");
  const [copyMessageState, setCopyMessageState] = useState("Copy");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  // const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [input, setInput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const gif = new GiphyFetch("idMD7nSh8eXBHFMbs7nPkQho9u5ArRJy");
  const [showGifPicker, setShowGifPicker] = useState(false);

  const handleGifClick = (gif: any, e: any) => {
    e.preventDefault();
    SendMessage({ text: gif.images.fixed_height.url });
    setShowGifPicker(false);
  };
  function GifPicker() {
    return (
      <Grid
        width={400}
        columns={3}
        className="overflow-y-auto"
        fetchGifs={(offset) => gif.trending({ offset, limit: 10 })}
        onGifClick={(gif) => {
          setInput(gif.images.fixed_height.url);
        }}
      />
    );
  }
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

    // Refocus input and set cursor after emoji
    setTimeout(() => {
      inputRef.current?.focus();
      const newPosition = cursorPosition + emoji.native.length;
      inputRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomid],
    queryFn: async () => {
      const res = await client.rooms.ttl.get({
        query: { roomid },
      });

      return res.data;
    },
  });

  const { data: roomData } = useQuery({
    queryKey: ["room-info", roomid],
    queryFn: async (): Promise<RoomData> => {
      const res = await client.rooms.info.get({
        query: { roomid },
      });
      if (!res.data) {
        throw new Error("Room data is null");
      }
      return {
        ...res.data,
        connected: Array.isArray(res.data.connected) ? res.data.connected : [],
      };
    },
  });
  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl);
    else {
      setTimeRemaining(100);
    }
  }, [ttlData]);
  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) {
      return;
    }
    if (timeRemaining === 60) {
      toast.warning("Room will expire in 60 seconds");
    }
    if (timeRemaining === 0) {
      router.push("/?destroyed");
    }
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

  const url = window.location.href;
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
  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomid], // this is for caching the room messages
    queryFn: async () => {
      const res = await client.messages.get({
        query: { roomid },
      });
      return res.data;
    },
  });
  const isGifUrl = (text: string) => {
    return text.match(/\.(gif|giphy\.com|tenor\.com)/i);
  };

  const { mutate: SendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await client.messages.post(
        {
          sender: username,
          text,
        },
        { query: { roomid } },
      );
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
      if (event === "chat.message") {
        refetch();
      }
      if (event === "chat.destroy") {
        router.push("/?destroyed=true");
      }
    },
  });
  const handleSend = () => {
    if (input.trim()) {
      SendMessage({ text: input });
      setInput("");
      inputRef.current?.focus();
    }
  };
  interface RoomData {
    roomName?: string;
    maxParticipants?: number;
    timelimit?: number;
    connected: string[]; // or User[], depending on your user type
  }
  return (
    <>
      <main className="flex flex-col justify-center min-h-screen overflow-hidden ">
        <header className="border-b border-zinc-800 flex justify-between items-center p-4">
          <div className="flex  items-center gap-4">
            <span className="text-xs text-zinc-500 uppercase">
              Room Name :{" "}
              <span className="text-green-500 font-bold">
                {roomData?.roomName as string}
              </span>
            </span>
            <div className="h-8 w-px bg-zinc-800"></div>
            <span className="text-xs text-zinc-500 uppercase">
              Room id :{" "}
              <span className="text-green-500 font-bold">{roomid}</span>
            </span>
            <div className="h-8 w-px bg-zinc-800"></div>
            <div className="flex flex-col">
              <span className="text-xs text-zinc-500 uppercase">
                Self Destruct
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-2 ${
                  timeRemaining !== null && timeRemaining < 60
                    ? "text-red-500"
                    : "text-yellow-500"
                }`}
              >
                {timeRemaining !== null
                  ? formatTimeRemaining(timeRemaining)
                  : "--:--"}
              </span>
            </div>
            <div className="h-8 w-px bg-zinc-800"></div>
            <div>
              <span>
                Room Participants: {roomData?.connected?.length}/
                {roomData?.maxParticipants as number}
              </span>
            </div>{" "}
            <div className="h-8 w-px bg-zinc-800"></div>
            <Dialog>
              <DialogTrigger className="focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-none border border-transparent bg-clip-padding text-xs font-medium focus-visible:ring-1 aria-invalid:ring-1 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none h-8 gap-1.5 px-2.5 cursorpcursor-pointer has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 shrink-0 [&_svg]:shrink-0 outline-none group/button select-none bg-primary text-primary-foreground [a]:hover:bg-primary/80">
                Invite Friends
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Friends</DialogTitle>
                  <DialogDescription>
                    Share the private chat link to invite your friends
                  </DialogDescription>
                </DialogHeader>
                <hr></hr>
                <div className="flex flex-col gap-4">
                  <h1>Copy and Share the room chat link to your friends</h1>
                  <div className="flex flex-row gap-2">
                    <Input readOnly value={url}></Input>
                    <Button onClick={() => copyLink()}>{copyState}</Button>
                  </div>
                  <hr></hr>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-1 bg-muted place-items-center border">
                      <QRCodeCanvas
                        className=" "
                        value={url}
                        size={228}
                        level="H" // High error correction
                        includeMargin={true}
                        imageSettings={{
                          src: "/logo.png", // Optional: add a logo in the center
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                    </div>
                    <div className="border bg-muted p-4 text-center ">
                      <h1 className="text-center my-3">Room Info</h1>
                      <div className="flex  flex-wrap gap-4 mb-3 flex-col">
                        <div className="items-center flex  gap-1">
                          <MessageCircle />
                          <p>Name:{roomData?.roomName as string} </p>
                        </div>
                        <div className="items-center flex gap-2">
                          <Users></Users>
                          <p>
                            {roomData?.connected.length}/
                            {roomData?.maxParticipants} Joined
                          </p>
                        </div>
                        <div className="items-center flex gap-2">
                          <Clock></Clock>
                          <span>
                            {formatTimeRemaining(ttlData?.ttl as number)} Left
                          </span>
                        </div>
                      </div>
                      <Button className="w-full h-8">Download QR code</Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant={"destructive"}
              onClick={() => {
                DestroyRoom();
              }}
            >
              Destroy Now
            </Button>
          </div>
        </header>
        <div className="flex-1 max-h-[50%] min-w-full justify-center   overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <h1>Welcome to chat room</h1>
          <p>Your room id : {roomid}</p>
          <div className="flex h-full  justify-center justify-items-center items-center">
            {messages?.messages.length === 0 && (
              <Alert className="w-fit p-5">
                <AlertCircleIcon></AlertCircleIcon>
                <AlertTitle>
                  No messages yet in the chat , start the conversation{" "}
                </AlertTitle>
              </Alert>
            )}
          </div>
          <div className="flex flex-col align-middle items-center justify-center gap-2 md:gap-4">
            <div className="flex-1 md:min-w-200 w-full  md:max-w-322.5 relative group">
              {messages?.messages.map((msg) => (
                <div
                  className={` my-3 p-3 gap-1 bg-muted min-w-[20%] w-40 max-w-[50%] rounded border-border  ${
                    msg.sender === username
                      ? "self-end  ml-auto" // ✅ Aligns to right
                      : "self-start mr-auto"
                  }  `}
                  key={msg.id}
                >
                  <p
                    className={`text-xs ${
                      msg.sender === username
                        ? "text-green-500"
                        : "text-blue-500"
                    }`}
                  >
                    {msg.sender === username ? "You" : msg.sender}
                  </p>
                  {isGifUrl(msg.text) ? (
                    <img
                      src={msg.text}
                      alt="GIF"
                      className="rounded min-w-full h-auto max-h-64 object-contain"
                    />
                  ) : (
                    <div>
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <div className="text-lg font-bold">{msg.text} </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={() => {
                              copyMessage(msg.text);
                            }}
                          >
                            Copy
                          </ContextMenuItem>
                          <ContextMenuItem>Reply</ContextMenuItem>
                          <ContextMenuItem>React</ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                      {/*<button onClick={() => setShowReactionPicker(true)}>
                        ➕
                      </button>
                      {showReactionPicker && (
                        <div className="absolute z-50">
                          <Picker
                            data={data}
                            onEmojiSelect={(emoji) => {
                              addReaction(message.id, emoji.native);
                              setShowReactionPicker(false);
                            }}
                            theme="dark"
                            perLine={8} // Smaller picker
                            maxFrequentRows={1} // Less height
                            previewPosition="none" // No preview
                          />
                        </div>
                      )}*/}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-muted backdrop-blur-sm">
          <div className="flex items-center gap-3 md:min-w-200 w-full md:max-w-322.5 max-w-4xl mx-auto relative">
            {/* Emoji Picker Button */}
            <div className="relative">
              <div className="flex items-center gap-1 border p-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={`h-12 w-12 transition-all ${
                    showEmojiPicker
                      ? "text-yellow-400 bg-yellow-400/10"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                  }`}
                  aria-label="Pick GIF"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                >
                  <p className="text-xl">GIF</p>
                </Button>

                {/* GIF Picker - Shows when button is clicked */}
                {showGifPicker && (
                  <>
                    {/* Backdrop to close on outside click */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowGifPicker(false)}
                    />

                    {/* GIF Picker Modal */}
                    <div className="absolute bottom-full left-0 mb-2 z-50 bg-zinc-900 rounded-lg p-4 shadow-xl">
                      <Grid
                        className="h-90"
                        width={200}
                        columns={3}
                        fetchGifs={(offset) =>
                          gif.trending({ offset, limit: 10 })
                        }
                        onGifClick={handleGifClick}
                      />
                    </div>
                  </>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`h-12 w-12 transition-all ${
                    showEmojiPicker
                      ? "text-yellow-400 bg-yellow-400/10"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                  }`}
                  aria-label="Pick emoji"
                >
                  <Smile className="w-5 h-5" />
                </Button>

                {/* Floating Emoji Picker */}
                {showEmojiPicker && (
                  <div
                    ref={pickerRef}
                    className="absolute bottom-full left-0 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    <Picker
                      data={data}
                      onEmojiSelect={handleEmojiSelect}
                      theme="dark"
                      previewPosition="none"
                      skinTonePosition="search"
                      maxFrequentRows={2}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Input with Character Counter */}
            <div className="flex-1 relative">
              <div className="flex items-center bg-background border border-border rounded-lg focus-within:ring-1 focus-within:ring-accent transition-all">
                <Input
                  ref={inputRef}
                  type="text"
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 px-4 pr-16"
                  placeholder="Type a message..."
                  value={input}
                  maxLength={1000}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onChange={(e) => setInput(e.target.value)}
                />

                {/* Character Counter - Inside Input */}
                {input.length > 0 && (
                  <div className="absolute right-3 text-xs text-zinc-500 pointer-events-none">
                    {input.length}/1000
                  </div>
                )}
              </div>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isPending}
              className="h-12 px-6"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};
export default RoomPage;
