"use client";

import React, {
  useEffect,
  useState,
  useRef,
  FormEvent,
  KeyboardEvent,
} from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Trash2, Settings } from "lucide-react";
import { callOllamaAPI, callNutanixAPI, Integration } from "@/lib/apiHelper";
import { useSpeechSynthesis } from "react-speech-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface Message {
  role: "user" | "bot";
  text: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
}

const tokenMapping = {
  small: 256,
  medium: 512,
  large: 1024,
  xl: 2048,
};

type TokenSize = keyof typeof tokenMapping;

export default function ChatPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [messageInput, setMessageInput] = useState<string>("");
  const [tokenSize, setTokenSize] = useState<TokenSize>("medium");
  const [loadingIntegrations, setLoadingIntegrations] = useState<boolean>(true);
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);

  // For renaming sessions
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>("");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { speak, voices } = useSpeechSynthesis();
  const englishVoice = voices.find((v) => v.lang.startsWith("en")) || undefined;

  // Auto-scroll chat area when messages update.
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [selectedSession?.messages]);

  // Load sessions.
  useEffect(() => {
    async function loadSessions() {
      const res = await fetch("/api/chatbot");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        if ((data.sessions || []).length > 0) {
          setSelectedSession(data.sessions[0]);
        }
      }
    }
    loadSessions();
  }, []);

  // Load integrations.
  useEffect(() => {
    async function fetchIntegrations() {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data: Integration[] = await res.json();
        setIntegrations(data);
        if (data.length > 0) {
          setSelectedIntegration(data[0]);
        }
      }
      setLoadingIntegrations(false);
    }
    fetchIntegrations();
  }, []);

  async function handleNewChat() {
    const res = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    });
    if (res.ok) {
      const newSession: Session = await res.json();
      setSessions((prev) => [...prev, newSession]);
      setSelectedSession(newSession);
    }
  }

  // Persist session updates.
  async function updateSession(session: Session) {
    await fetch(`/api/chatbot/${session.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: session.messages, title: session.title }),
    });
  }

  async function handleDeleteSession(session: Session) {
    const res = await fetch(`/api/chatbot/${session.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (selectedSession?.id === session.id) {
        setSelectedSession(sessions[0] || null);
      }
    }
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!messageInput.trim()) return;
    if (!selectedIntegration) {
      console.error("No integration selected");
      return;
    }
    if (!selectedSession) {
      await handleNewChat();
      if (!selectedSession) return;
    }

    const userMsg: Message = { role: "user", text: messageInput };
    const updatedSession = {
      ...selectedSession,
      messages: [...selectedSession.messages, userMsg],
    };
    setSelectedSession(updatedSession);
    await updateSession(updatedSession);

    const userPrompt = messageInput;
    setMessageInput("");
    setIsBotTyping(true);
    let botResponse = "";
    try {
      if (selectedIntegration.type === "ollama") {
        botResponse = await callOllamaAPI(selectedIntegration, userPrompt);
      } else if (selectedIntegration.type === "nutanix") {
        const maxTokens = tokenMapping[tokenSize];
        botResponse = await callNutanixAPI(
          selectedIntegration,
          userPrompt,
          maxTokens
        );
      } else {
        botResponse = "Unsupported integration type.";
      }
    } catch (error: any) {
      console.error("Error in API call:", error);
      botResponse = error.message || "Error calling API.";
    }
    const botMsg: Message = { role: "bot", text: botResponse };
    const updatedSession2 = {
      ...updatedSession,
      messages: [...updatedSession.messages, botMsg],
    };
    setSelectedSession(updatedSession2);
    await updateSession(updatedSession2);
    setIsBotTyping(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  }

  async function handleRenameSession(session: Session) {
    const updatedSession = { ...session, title: editedTitle };
    const newSessions = sessions.map((s) =>
      s.id === session.id ? updatedSession : s
    );
    setSessions(newSessions);
    if (selectedSession?.id === session.id) setSelectedSession(updatedSession);
    await fetch(`/api/chatbot/${session.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: updatedSession.messages,
        title: updatedSession.title,
      }),
    });
    setEditingSessionId(null);
  }

  if (loadingIntegrations) {
    return <p>Loading integrations...</p>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Top Bar: New Chat, Integration select, and Token Settings */}
      <div className="flex justify-end items-center gap-4 mb-6">
        <Button variant="outline" onClick={handleNewChat}>
          New Chat
        </Button>
        <Select
          value={selectedIntegration?.id || ""}
          onValueChange={(value: string) => {
            const integration = integrations.find((i) => i.id === value);
            if (integration) setSelectedIntegration(integration);
          }}
        >
          <SelectTrigger className="w-64 border border-gray-300 rounded-md shadow-sm">
            <SelectValue placeholder="Select integration" />
          </SelectTrigger>
          <SelectContent className="rounded-md shadow-lg">
            {integrations.map((integration) => (
              <SelectItem key={integration.id} value={integration.id}>
                {integration.name} ({integration.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="p-2">
              <Settings className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Token Settings</DialogTitle>
              <DialogDescription>
                Select the maximum tokens to use with your integration.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Select
                value={tokenSize}
                onValueChange={(value: string) => setTokenSize(value as TokenSize)}
              >
                <SelectTrigger className="w-full border border-gray-300 rounded-md shadow-sm">
                  <SelectValue placeholder="Select token size" />
                </SelectTrigger>
                <SelectContent className="rounded-md shadow-lg">
                  {Object.entries(tokenMapping).map(([key, tokens]) => (
                    <SelectItem key={key} value={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)} ({tokens} tokens)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={() => {}}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-6">
        {/* Sidebar with Sessions */}
        <aside className="w-1/4 border-r pr-4">
          <h2 className="text-xl font-semibold mb-4">Chats</h2>
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`cursor-pointer p-2 transition-colors ${
                  selectedSession?.id === session.id
                    ? "bg-blue-100"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => {
                  setSelectedSession(session);
                  setEditingSessionId(null);
                }}
              >
                <CardHeader className="p-0">
                  {editingSessionId === session.id ? (
                    <div className="flex space-x-2 items-center w-full">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded-md"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRenameSession(session)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full px-2 py-2">
                      {/* Name on left, trash on far right */}
                      <CardTitle
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditedTitle(session.title);
                        }}
                        className="text-sm font-medium"
                      >
                        {session.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        </aside>
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          <div
            ref={chatContainerRef}
            className="border shadow-md rounded p-4 overflow-auto bg-gray-50 flex-1 mb-4"
            style={{ minHeight: "600px" }}
          >
            {selectedSession?.messages.map((msg, idx) => (
              <div key={idx} className="relative mb-2">
                <span
                  style={{ whiteSpace: "pre-wrap", paddingRight: "2.5rem" }}
                  className={`inline-block p-3 rounded ${
                    msg.role === "user" ? "bg-blue-200" : "bg-green-200"
                  }`}
                >
                  {msg.text}
                </span>
                {msg.role === "bot" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-1 right-1 p-1"
                    onClick={() => navigator.clipboard.writeText(msg.text)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {isBotTyping && <p className="italic text-gray-600">Bot is typing…</p>}
          </div>
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <Textarea
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 resize-none border border-gray-300 rounded-md shadow-sm"
            />
            <Button type="submit" className="px-6">
              Send
            </Button>
          </form>
        </main>
      </div>
    </div>
  );
}
