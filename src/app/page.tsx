"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { Description } from "@radix-ui/react-dialog";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Shield,
  Users,
  MessageSquare,
  Lock,
  EyeOff,
  Trash,
  Smile,
  Reply,
  Clock,
  Info,
  Pen,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { toast } from "sonner";

const Page = () => {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
};

export default Page;

function Home() {
  const router = useRouter();
  const searchparams = useSearchParams();
  const wasDestroyed = searchparams.get("destroyed");
  const error = searchparams.get("error");
  const [time, setTime] = useState(10);
  const [participants, setParticipants] = useState(2);
  const [roomName, setRoomName] = useState("");
  const { username } = useUsername();

  // Form validation
  const validateForm = () => {
    if (!roomName.trim()) {
      toast.error("Room name is required", {
        description: "Please enter a name for your room",
      });
      return false;
    }
    if (roomName.length < 4) {
      toast.error("Invalid room name", {
        description: "Room name must be at least 4 character long",
      });
      return false;
    }
    if (time < 1) {
      toast.error("Invalid time limit", {
        description: "Time limit must be at least 1 minute",
      });
      return false;
    }

    if (time > 30) {
      toast.error("Time limit exceeded", {
        description: "Maximum allowed time is 30 minutes",
      });
      return false;
    }

    if (participants < 2) {
      toast.error("Invalid participant count", {
        description: "At least 2 participants required",
      });
      return false;
    }

    if (participants > 10) {
      toast.error("Participant limit exceeded", {
        description: "Maximum allowed participants is 10",
      });
      return false;
    }

    return true;
  };

  const { mutate: CreateRoom, isPending } = useMutation({
    mutationFn: async () => {
      if (!validateForm()) {
        return;
      }

      const res = await client.rooms.create.post({
        roomName: roomName,
        timelimit: Number(time),
        maxParticipants: Number(participants),
      });
      if (res.status === 200) {
        router.push(`/room/${res.data?.id}`);
      }
      if (res.status === 422) {
        toast.error("Please fill all the room details");
      }
    },
  });

  const features = [
    // {
    //   icon: Shield,
    //   title: "End-to-End Encrypted",
    //   description: "Zero-knowledge architecture",
    // },
    {
      icon: EyeOff,
      title: "100% Anonymous",
      description: "No registration required",
    },
    {
      icon: Trash,
      title: "Self-Destructing",
      description: "Auto-delete after time limit",
    },
    {
      icon: Clock,
      title: "Disappearing Messages",
      description: "Messages auto-delete",
    },
    {
      icon: Smile,
      title: "Emojis",
      description: "Rich message support",
    },
    {
      icon: Users,
      title: "Live Participants",
      description: "See who's online",
    },
    {
      icon: Pen,
      title: "Customizable",
      description: "Make rooms with custom time and user limit",
    },
    {
      icon: MessageSquare,
      title: "Timestamps",
      description: "Track conversation flow",
    },
    {
      icon: Reply,
      title: "Thread Replies",
      description: "Reply to messages",
    },
  ];

  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const fullText = "BURNER_ROOMS";
  const [showCursor, setShowCursor] = useState(true);

  // Typewriter effect
  useEffect(() => {
    if (currentIndex < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + fullText[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex]);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="  py-16">
        <div className="max-w-2xl mx-auto ">
          <div className="space-y-6">
            {/* Terminal Window */}
            <div className="border-2 border-orange-600/30 bg-black/40">
              {/* Terminal Header */}
              <div className="border-b border-orange-600/30 px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-xs font-mono text-muted-foreground ml-2">
                  ~/burner-rooms
                </span>
              </div>

              {/* Terminal Content */}
              <div className="p-6 space-y-3 font-mono">
                <div className="text-green-500 text-sm">
                  <span className="text-orange-500">root@secure</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="text-blue-400">~</span>
                  <span className="text-muted-foreground">$</span>
                  <span className="ml-2">initializing...</span>
                </div>

                <div className="text-4xl md:text-5xl font-bold">
                  <span className="text-orange-500">
                    {">"} {displayText}
                  </span>
                  <span
                    className={`text-orange-500 ${showCursor ? "opacity-100" : "opacity-0"}`}
                  >
                    _
                  </span>
                </div>

                <div className="text-sm text-muted-foreground space-y-1 pt-2">
                  <p>
                    {">"} <span className="text-green-500">✓</span> Encrypted
                    communication protocol loaded
                  </p>
                  <p>
                    {">"} <span className="text-green-500">✓</span> Anonymous
                    identity generator active
                  </p>
                  <p>
                    {">"} <span className="text-green-500">✓</span>{" "}
                    Self-destruct mechanism armed
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-hero with major features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-orange-600/30 bg-orange-600/5 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="border border-orange-600 bg-orange-600/10 p-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="font-mono font-bold text-sm">Time-Bombed</h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Set expiry limits. Conversations vanish automatically.
                </p>
              </div>

              <div className="border border-orange-600/30 bg-orange-600/5 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="border border-orange-600 bg-orange-600/10 p-2">
                    <EyeOff className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="font-mono font-bold text-sm">Anonymous</h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  No registration. No emails. No tracking. Pure anonymity.
                </p>
              </div>

              <div className="border border-orange-600/30 bg-orange-600/5 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="border border-orange-600 bg-orange-600/10 p-2">
                    <Trash className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="font-mono font-bold text-sm">Self-Destruct</h3>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Rooms auto-delete. Zero data retention. No recovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Alerts */}
          {wasDestroyed && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-mono text-sm">
                Room Destroyed
              </AlertTitle>
              <AlertDescription className="font-mono text-xs">
                The room was destroyed by participants or time limit reached
              </AlertDescription>
            </Alert>
          )}
          {error === "room-not-found" && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-mono text-sm">
                Room Not Found
              </AlertTitle>
              <AlertDescription className="font-mono text-xs">
                The room has expired or never existed
              </AlertDescription>
            </Alert>
          )}
          {error === "room-is-full" && (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-mono text-sm">Room Full</AlertTitle>
              <AlertDescription className="font-mono text-xs">
                Maximum participant limit reached
              </AlertDescription>
            </Alert>
          )}

          {/* Main Card */}
          <Card className="border-2 border-orange-600/30">
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Identity */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-mono">
                    Your Identity
                  </Label>
                  <Input
                    readOnly
                    className="border-dashed border-orange-600/40 bg-muted/30 font-mono text-orange-400"
                    value={username}
                  />
                </div>

                {/* Room Name */}
                <div className="space-y-2">
                  <div className="flex  flex-row gap-2">
                    <Label className="text-xs text-muted-foreground font-mono">
                      Room Name <span className="text-destructive">*</span>
                    </Label>
                    <Tooltip>
                      <TooltipTrigger>
                        {" "}
                        <Info size={16} className=""></Info>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Room name should be atleast 4 characters long</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <Input
                    type="text"
                    maxLength={20}
                    placeholder="Enter room name..."
                    onChange={(e) => setRoomName(e.target.value)}
                    value={roomName}
                    className="border-orange-600/40 font-mono"
                  />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 group relative">
                      <Label className="text-xs text-muted-foreground font-mono">
                        Time Limit (min){" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Tooltip>
                        <TooltipTrigger>
                          {" "}
                          <Info size={16} className=""></Info>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Max Room duration : 30 minutes</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      onChange={(e) => setTime(Number(e.target.value))}
                      value={time}
                      className="border-orange-600/40 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 group relative">
                      <Label className="text-xs text-muted-foreground font-mono">
                        Max Users <span className="text-destructive">*</span>
                      </Label>
                      <Tooltip>
                        <TooltipTrigger>
                          {" "}
                          <Info size={16} className=""></Info>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Max user limit: 10</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      onChange={(e) => setParticipants(Number(e.target.value))}
                      value={participants}
                      className="border-orange-600/40 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => CreateRoom()}
                disabled={isPending}
                className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-black font-mono font-bold"
              >
                {isPending ? "Creating..." : "Create Room"}
              </Button>
            </CardFooter>
          </Card>

          {/* Features Section */}
          <div className="space-y-4">
            <h2 className="text-lg border-b-2 border-b-orange-500 pb-2   font-mono text-muted-foreground text-center">
              Features
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="border-2 border-border/40 p-3 space-y-2 hover:border-orange-600/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="border border-orange-600/40 bg-orange-600/10 p-1.5">
                      <feature.icon className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                    <Check className="h-3 w-3 text-green-500 ml-auto" />
                  </div>
                  <div>
                    <h3 className="font-mono font-semibold text-xs">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-xs font-mono mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Note */}
          <div className="border border-yellow-600/30 bg-yellow-600/5 p-4">
            <div className="flex gap-3 items-start">
              <Lock className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="font-mono text-xs text-muted-foreground">
                <p className="text-yellow-500 font-semibold mb-1">
                  Security Notice
                </p>
                <p className="leading-relaxed">
                  All messages are encrypted end-to-end. Rooms and messages are
                  permanently deleted after expiry. No logs, no history, no
                  recovery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-muted-foreground font-mono text-xs">
            © {new Date().getFullYear()} Burner Rooms - Built by{" "}
            <Link
              className="font-bold"
              href="https://github.com/Shivaraj-Kolekar"
              target="_blank"
            >
              Shivaraj Kolekar
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
