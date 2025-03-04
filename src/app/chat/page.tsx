// src/app/chat/page.tsx
"use client";

import React, { useEffect, useState, useRef, FormEvent } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { callOllamaAPI, callNutanixAPI, Integration } from "@/lib/apiHelper";

// Mapping for token sizes to max tokens.
const tokenMapping = {
  small: 256,
  medium: 512,
  large: 1024,
  xl: 2048,
};

type TokenSize = keyof typeof tokenMapping;

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function ChatPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [messageInput, setMessageInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState<boolean>(true);
  const [tokenSize, setTokenSize] = useState<TokenSize>("medium");

  // State for the Prompt Library.
  const [promptLibraryExpanded, setPromptLibraryExpanded] = useState<boolean>(false);
  const [promptLibrary, setPromptLibrary] = useState<string[]>([
    "Tell me a joke.",
    "What is the meaning of life?",
    "How do I improve productivity?",
    "Summarize today's news.",
    "Give me a recipe for pasta.",
    "Explain quantum physics simply.",
    "What are the benefits of exercise?",
    "How to manage time effectively?",
    "Suggest a good book to read.",
    "What's new in tech?"
  ]);
  const [newPrompt, setNewPrompt] = useState<string>("");

  // Ref for auto-scrolling chat conversation.
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update.
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch integrations on mount.
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

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !selectedIntegration) return;

    // Append the user's message and clear the input immediately.
    setMessages((prev) => [...prev, { role: "user", text: messageInput }]);
    const userPrompt = messageInput;
    setMessageInput("");

    let botResponse = "";
    try {
      if (selectedIntegration.type === "ollama") {
        botResponse = await callOllamaAPI(selectedIntegration, userPrompt);
      } else if (selectedIntegration.type === "nutanix") {
        const maxTokens = tokenMapping[tokenSize];
        botResponse = await callNutanixAPI(selectedIntegration, userPrompt, maxTokens);
      } else {
        botResponse = "Unsupported integration type.";
      }
    } catch (error: any) {
      console.error("Error in API call:", error);
      botResponse = error.message || "Error calling API.";
    }
    setMessages((prev) => [...prev, { role: "bot", text: botResponse }]);
  }

  if (loadingIntegrations) {
    return <p>Loading integrations...</p>;
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h1 className="text-3xl font-bold text-center mb-6">AI Chatbot</h1>

      {/* Integration & Token Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-2">
          <Label htmlFor="integrationSelect">Select Integration:</Label>
          <Select
            value={selectedIntegration?.id || ""}
            onValueChange={(value: string) => {
              const integration = integrations.find((i) => i.id === value);
              if (integration) {
                setSelectedIntegration(integration);
              }
            }}
          >
            <SelectTrigger id="integrationSelect" className="w-64">
              <SelectValue placeholder="Select an integration" />
            </SelectTrigger>
            <SelectContent>
              {integrations.map((integration) => (
                <SelectItem key={integration.id} value={integration.id}>
                  {integration.name} ({integration.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedIntegration?.type === "nutanix" && (
          <div className="flex items-center space-x-2">
            <Label htmlFor="tokenSizeSelect">Max Tokens:</Label>
            <Select
              value={tokenSize}
              onValueChange={(value: string) => setTokenSize(value as TokenSize)}
            >
              <SelectTrigger id="tokenSizeSelect" className="w-48">
                <SelectValue placeholder="Select token size" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tokenMapping).map(([key, tokens]) => (
                  <SelectItem key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} ({tokens} tokens)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Chat Conversation Container */}
      <div
        ref={chatContainerRef}
        className="border shadow-md rounded p-4 overflow-auto bg-gray-50 h-96 md:h-[28rem] lg:h-[32rem] mb-6 resize max-h-[80vh]"
        style={{ resize: "both" }}
      >
        {messages.map((msg, idx) => (
          <div key={idx} className="relative mb-2">
            <span
              style={{ whiteSpace: "pre-wrap" }}
              className={`inline-block p-3 pr-8 rounded ${msg.role === "user" ? "bg-blue-200" : "bg-green-200"}`}
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
      </div>

      {/* Chat Input and Send Button */}
      <form onSubmit={handleSendMessage} className="flex space-x-2 mb-6">
        <Input
          type="text"
          placeholder="Type your message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" className="px-6">
          Send
        </Button>
      </form>

      {/* Expandable Prompt Library */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => setPromptLibraryExpanded(!promptLibraryExpanded)}>
          Prompt Library {promptLibraryExpanded ? "▲" : "▼"}
        </Button>
        {promptLibraryExpanded && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {promptLibrary.map((prompt, index) => (
                <Card
                  key={index}
                  onClick={() =>
                    setMessageInput((prev) => (prev ? prev + " " + prompt : prompt))
                  }
                  className="w-60 cursor-pointer hover:bg-gray-100"
                >
                  <CardHeader>
                    <CardTitle className="text-sm">{prompt}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Add a new prompt..."
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => {
                  if (newPrompt.trim()) {
                    setPromptLibrary((prev) => [...prev, newPrompt.trim()]);
                    setNewPrompt("");
                  }
                }}
              >
                Add Prompt
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
