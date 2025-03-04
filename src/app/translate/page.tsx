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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { callOllamaAPI, callNutanixAPI, Integration } from "@/lib/apiHelper";

type TranslationDirection = "CorporateToNormal" | "NormalToCorporate";

export default function TranslatePage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [translationDirection, setTranslationDirection] = useState<TranslationDirection>("CorporateToNormal");
  const [inputText, setInputText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch integrations on mount.
  useEffect(() => {
    async function fetchIntegrations() {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data: Integration[] = await res.json();
        setIntegrations(data);
        if (data.length > 0) setSelectedIntegration(data[0]);
      }
    }
    fetchIntegrations();
  }, []);

  async function handleTranslate(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !selectedIntegration) return;
    setLoading(true);
    setOutputText("");

    // Build a prompt based on the translation direction.
    // The prompt instructs the AI to produce only the translation without any warnings or notes.
    const prompt =
      translationDirection === "CorporateToNormal"
        ? `Translate the following corporate language text to a funny, everyday tone that is a bit direct and slightly rude. Do not include any warnings, notes, or extra commentary – only provide the translated text:\n\n"${inputText}"`
        : `Translate the following everyday language text to formal, corporate language. Do not include any warnings, notes, or extra commentary – only provide the translated text:\n\n"${inputText}"`;

    try {
      let response = "";
      if (selectedIntegration.type === "ollama") {
        response = await callOllamaAPI(selectedIntegration, prompt);
      } else if (selectedIntegration.type === "nutanix") {
        // Use a default token limit for translation (e.g., 512 tokens)
        response = await callNutanixAPI(selectedIntegration, prompt, 512);
      } else {
        response = "Unsupported integration type.";
      }
      setOutputText(response);
    } catch (error: any) {
      console.error("Translation API error:", error);
      setOutputText(error.message || "Error calling translation API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-6">Translation Tool</h1>
      
      {/* Integration Selector */}
      <div className="mb-4">
        <Label htmlFor="integrationSelect">Select Integration:</Label>
        <Select
          value={selectedIntegration?.id || ""}
          onValueChange={(value: string) => {
            const integration = integrations.find((i) => i.id === value);
            if (integration) setSelectedIntegration(integration);
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

      {/* Translation Direction Selector */}
      <div className="mb-4">
        <Label htmlFor="translationDirection">Translation Direction:</Label>
        <Select
          value={translationDirection}
          onValueChange={(value: string) => setTranslationDirection(value as TranslationDirection)}
        >
          <SelectTrigger id="translationDirection" className="w-64">
            <SelectValue placeholder="Select translation direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CorporateToNormal">Corporate → Normal</SelectItem>
            <SelectItem value="NormalToCorporate">Normal → Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Input Text Area */}
      <div className="mb-4">
        <Label>Input Text:</Label>
        <Textarea
          placeholder="Enter text to translate..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-40"
        />
      </div>

      {/* Translate Button */}
      <div className="mb-4">
        <Button onClick={handleTranslate} disabled={loading}>
          {loading ? "Translating..." : "Translate"}
        </Button>
      </div>

      {/* Output Text Area with Copy Button */}
      <div className="mb-4">
        <Label>Translated Output:</Label>
        <div className="relative">
          <Textarea
            readOnly
            placeholder="Translation will appear here..."
            value={outputText}
            className="w-full h-40 pr-10"
          />
          {outputText && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 p-1"
              onClick={() => navigator.clipboard.writeText(outputText)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
