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
import { Copy, Volume2 } from "lucide-react";
import { useSpeechSynthesis } from "react-speech-kit";
import { callOllamaAPI, callNutanixAPI, Integration } from "@/lib/apiHelper";

type TranslationDirection = "CorporateToNormal" | "NormalToCorporate";

export default function TranslatePage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [translationDirection, setTranslationDirection] = useState<TranslationDirection>("CorporateToNormal");
  const [inputText, setInputText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const { speak, voices } = useSpeechSynthesis();
  // Select a natural-sounding English voice if available.
  const englishVoice = voices.find((v) => v.lang.startsWith("en")) || undefined;

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
    // In CorporateToNormal, instruct the AI to be brutally honest, irreverent, and unapologetically rude.
    const prompt =
      translationDirection === "CorporateToNormal"
        ? `Translate the following corporate language text into an irreverently funny, brutally honest, and unapologetically rude everyday version. Do not include any warnings or notes—just the translated text:\n\n"${inputText}"`
        : `Translate the following everyday text into polished, formal corporate language. Do not include any warnings or notes—just the translated text:\n\n"${inputText}"`;

    try {
      let response = "";
      if (selectedIntegration.type === "ollama") {
        response = await callOllamaAPI(selectedIntegration, prompt);
      } else if (selectedIntegration.type === "nutanix") {
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
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <h1 className="text-4xl font-extrabold text-center text-gray-900">Translation Tool</h1>

      {/* Integration Selector */}
      <div className="space-y-2">
        <Label htmlFor="integrationSelect" className="text-lg font-medium">Select Integration:</Label>
        <Select
          value={selectedIntegration?.id || ""}
          onValueChange={(value: string) => {
            const integration = integrations.find((i) => i.id === value);
            if (integration) setSelectedIntegration(integration);
          }}
        >
          <SelectTrigger id="integrationSelect" className="w-64 border border-gray-300 rounded-md shadow-sm">
            <SelectValue placeholder="Select an integration" />
          </SelectTrigger>
          <SelectContent className="rounded-md shadow-lg">
            {integrations.map((integration) => (
              <SelectItem key={integration.id} value={integration.id}>
                {integration.name} ({integration.type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Translation Direction Selector */}
      <div className="space-y-2">
        <Label htmlFor="translationDirection" className="text-lg font-medium">Translation Direction:</Label>
        <Select
          value={translationDirection}
          onValueChange={(value: string) => setTranslationDirection(value as TranslationDirection)}
        >
          <SelectTrigger id="translationDirection" className="w-64 border border-gray-300 rounded-md shadow-sm">
            <SelectValue placeholder="Select translation direction" />
          </SelectTrigger>
          <SelectContent className="rounded-md shadow-lg">
            <SelectItem value="CorporateToNormal">Corporate → Normal</SelectItem>
            <SelectItem value="NormalToCorporate">Normal → Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Input Text Area with Speaker Button */}
      <div className="space-y-2">
        <Label className="text-lg font-medium">Input Text:</Label>
        <div className="relative">
          <Textarea
            placeholder="Enter text to translate..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-40 border border-gray-300 rounded-md shadow-sm"
          />
          {inputText && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 p-1"
              onClick={() =>
                speak({ text: inputText, voice: englishVoice, rate: 0.9, pitch: 1.1 })
              }
            >
              <Volume2 className="h-5 w-5 text-gray-600" />
            </Button>
          )}
        </div>
      </div>

      {/* Translate Button */}
      <div>
        <Button onClick={handleTranslate} disabled={loading} className="w-full py-3 text-lg">
          {loading ? "Translating..." : "Translate"}
        </Button>
      </div>

      {/* Output Text Area with Copy & Speaker Buttons */}
      <div className="space-y-2">
        <Label className="text-lg font-medium">Translated Output:</Label>
        <div className="relative">
          <Textarea
            readOnly
            placeholder="Translation will appear here..."
            value={outputText}
            className="w-full h-40 pr-16 border border-gray-300 rounded-md shadow-sm"
          />
          {outputText && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-10 p-1"
                onClick={() => navigator.clipboard.writeText(outputText)}
              >
                <Copy className="h-5 w-5 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-2 right-2 p-1"
                onClick={() =>
                  speak({ text: outputText, voice: englishVoice, rate: 0.9, pitch: 1.1 })
                }
              >
                <Volume2 className="h-5 w-5 text-gray-600" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
