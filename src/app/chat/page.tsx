// src/app/chat/page.tsx
"use client";

import React, { useEffect, useState, FormEvent } from "react";
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

// Mapping for T-shirt sizes to max tokens.
// "none" indicates no token limit.
const tokenMapping: { [key in TokenSize]: number | null } = {
  none: null,
  small: 256,
  medium: 512,
  large: 1024,
  xl: 2048,
};

type TokenSize = "none" | "small" | "medium" | "large" | "xl";

interface Integration {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  apiKey: string;
  active: boolean;
}

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function ChatPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [messageInput, setMessageInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState<boolean>(true);
  // New state for token size (only used for Nutanix integration).
  const [tokenSize, setTokenSize] = useState<TokenSize>("medium");

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

    // Append the user's message.
    setMessages((prev) => [...prev, { role: "user", text: messageInput }]);

    const integrationType = selectedIntegration.type;
    let botResponse = "";

    if (integrationType === "ollama") {
      // Build the full URL by appending '/api/generate' to the endpoint.
      const url =
        selectedIntegration.endpoint.replace(/\/$/, "") + "/api/generate";
      const payload = {
        model: "mistral", // Adjust as needed.
        prompt: messageInput,
      };

      console.log("Ollama API Request URL:", url);
      console.log("Ollama API Request Payload:", payload);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("Ollama API Response Status:", response.status);
        const responseText = await response.text();
        console.log("Ollama API Raw Response:", responseText);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        // Process streaming response: split by newline and parse each JSON object.
        const lines = responseText
          .split("\n")
          .filter((line) => line.trim() !== "");
        let combinedResponse = "";
        lines.forEach((line) => {
          try {
            const parsed = JSON.parse(line);
            combinedResponse += parsed.response;
          } catch (err) {
            console.error("Error parsing line:", line, err);
          }
        });
        // Insert newlines before numbered items for readability.
        const formattedResponse = combinedResponse
          .replace(/(\d+\.\s)/g, "\n$1")
          .trim();
        botResponse = formattedResponse || "No response from Ollama API.";
      } catch (error) {
        console.error("Error calling Ollama API:", error);
        botResponse = "Error calling Ollama API.";
      }
    } else if (integrationType === "nutanix") {
      // For Nutanix, call your dynamic proxy API route.
      const url = "/api/proxy/nutanix";
      // Build payload. Only add max_tokens if a token limit is selected.
      const payload: any = {
        model: "vllm-llama-3-1-8b", // Adjust as needed.
        messages: [{ role: "user", content: messageInput }],
        stream: false,
      };
      const maxTokens = tokenMapping[tokenSize];
      if (maxTokens !== null) {
        payload.max_tokens = maxTokens;
      }

      console.log("Nutanix Proxy API Request URL:", url);
      console.log("Nutanix Proxy API Request Payload:", payload);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        console.log("Nutanix Proxy API Response Status:", response.status);
        const responseText = await response.text();
        console.log("Nutanix Proxy API Raw Response:", responseText);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${responseText}`);
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          throw new Error("Failed to parse JSON: " + jsonError);
        }

        botResponse =
          data?.choices?.[0]?.message?.content ||
          "No response from Nutanix API.";
      } catch (error) {
        console.error("Error calling Nutanix API:", error);
        botResponse = "Error calling Nutanix API.";
      }
    } else {
      botResponse = "Unsupported integration type.";
    }

    // Append the bot's response.
    setMessages((prev) => [...prev, { role: "bot", text: botResponse }]);
    setMessageInput("");
  }

  if (loadingIntegrations) {
    return <p>Loading integrations...</p>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">AI Chatbot</h1>

      {/* Integration Selector */}
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

      {/* Nutanix Max Tokens Selector (only visible if Nutanix integration is selected) */}
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
                  {key.charAt(0).toUpperCase() + key.slice(1)}{" "}
                  {tokens !== null ? `(${tokens} tokens)` : "(No limit)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Chat Conversation */}
      <div className="border rounded p-4 h-80 overflow-y-auto bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 ${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            <span
              style={{ whiteSpace: "pre-wrap" }}
              className={`inline-block p-2 rounded ${
                msg.role === "user" ? "bg-blue-200" : "bg-green-200"
              }`}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <Input
          type="text"
          placeholder="Type your message..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
}
