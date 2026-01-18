"use client";
import { ModeToggle } from "@/components/mode-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUsername } from "@/hooks/useUsername";
import { client } from "@/lib/client";
import { useMutation } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
const Page = () => {
  return (
    <Suspense>
      <Home></Home>
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
  const { mutate: CreateRoom } = useMutation({
    mutationFn: async () => {
      const res = await client.rooms.create.post({
        roomName: roomName,
        timelimit: Number(time),
        maxParticipants: Number(participants),
      });
      if (res.status === 200) {
        router.push(`/room/${res.data?.id}`);
      }
    },
  });
  return (
    <main className="min-h-screen bg-background flex p-4 justify-center items-center flex-col">
      <div className="w-full max-w-md space-y-8">
        {wasDestroyed && (
          <Alert className="p-4 border-destructive" variant="destructive">
            <AlertCircleIcon></AlertCircleIcon>
            <AlertTitle>Room got destroyed</AlertTitle>
            <AlertDescription>
              The room was destroyed by the room participants or due to meeting
              the room time limit
            </AlertDescription>
          </Alert>
        )}
        {error === "room-not-found" && (
          <Alert className="p-4 border-destructive" variant="destructive">
            <AlertCircleIcon></AlertCircleIcon>
            <AlertTitle>Room got expired</AlertTitle>
            <AlertDescription>
              The room was expired or never existed
            </AlertDescription>
          </Alert>
        )}
        {error === "room-is-full" && (
          <Alert className="p-4 border-destructive" variant="destructive">
            <AlertCircleIcon></AlertCircleIcon>
            <AlertTitle>Room is full</AlertTitle>
            <AlertDescription>
              The room has reached the max participants limit
            </AlertDescription>
          </Alert>
        )}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-green-500">
            Burner Rooms
          </h1>
          <p className="text-gray-500">Encrypted • Ephemeral • Anonymous</p>
        </div>
        <Card>
          <CardContent>
            {" "}
            <div className="space-y-4">
              <div>
                <Label>{">_"} Your identity: </Label>
              </div>
              <Input
                readOnly
                className="border-dashed py-4 "
                value={username}
              ></Input>
              <div className="space-y-2">
                <Label>Room Name:</Label>
                <Input
                  type="text"
                  max={20}
                  placeholder="Enter Room Name"
                  onChange={(e) => setRoomName(e.target.value)}
                  value={roomName}
                ></Input>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2 col-span-1 align-middle">
                  <Label>Room Time Limit:</Label>
                  <Input
                    type="number"
                    onChange={(e) => setTime(Number(e.target.value))}
                    value={time}
                  ></Input>
                </div>
                <div className="space-y-2 col-span-1">
                  <Label>Max Users:</Label>
                  <Input
                    type="number"
                    onChange={(e) => setParticipants(Number(e.target.value))}
                    value={participants}
                  ></Input>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full h-12 text-lg"
              onClick={() => CreateRoom()}
            >
              Create Room
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
