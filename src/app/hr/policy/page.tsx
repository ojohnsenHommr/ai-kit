"use client";

import React, { useEffect, useState, FormEvent } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Volume2 } from "lucide-react";
import { useSpeechSynthesis } from "react-speech-kit";
import { callOllamaAPI, callNutanixAPI, Integration } from "@/lib/apiHelper";

export default function PolicySimplifierPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [inputText, setInputText] = useState<string>("");
  const [outputText, setOutputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const { speak, voices } = useSpeechSynthesis();
  const englishVoice = voices.find((v) => v.lang.startsWith("en")) || undefined;

  // Sample policies for demonstration.
  const samplePolicies = [
    `All employees must adhere to the company dress code which mandates business casual attire during office hours. Any deviation must be pre-approved by HR.`,
    `Employees are required to clock in and out using the official timekeeping system. Unauthorized overtime will not be compensated unless pre-approved by management.`,
    `Returning to Office Policy: All employees must return to the office effective immediately. No home office exceptions are permitted, except in cases of emergency as determined by HR.`
  ];

  async function fetchIntegrations() {
    const res = await fetch("/api/integrations");
    if (res.ok) {
      const data: Integration[] = await res.json();
      setIntegrations(data);
      if (data.length > 0) setSelectedIntegration(data[0]);
    }
  }

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function handleSimplifyPolicy(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !selectedIntegration) return;
    setLoading(true);
    setOutputText("");

    // Build a prompt that instructs the AI to simplify the policy text with humorous commentary.
    const prompt = `Simplify the following corporate policy into plain language, but also add a funny, brutally honest commentary that reveals what's really going on behind the corporate jargon. Do not include any warnings, notes, or extra commentary—only the simplified text and its humorous, candid explanation:\n\n"${inputText}"`;

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
      console.error("Policy Simplifier API error:", error);
      setOutputText(error.message || "Error calling policy simplifier API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <h1 className="text-4xl font-extrabold text-center text-gray-900">Policy Simplifier</h1>

      {/* Integration Selector */}
      <div className="space-y-2">
        <Label htmlFor="integrationSelect" className="text-lg font-medium">
          Select Integration:
        </Label>
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

      {/* Input Text Area with Speaker Button */}
      <div className="space-y-2">
        <Label className="text-lg font-medium">Policy Text:</Label>
        <div className="relative">
          <Textarea
            placeholder="Paste your corporate policy text here..."
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

      {/* Simplify Policy Button */}
      <div>
        <Button onClick={handleSimplifyPolicy} disabled={loading} className="w-full py-3 text-lg">
          {loading ? "Simplifying..." : "Simplify Policy"}
        </Button>
      </div>

      {/* Output Text Area with Copy & Speaker Buttons */}
      <div className="space-y-2">
        <Label className="text-lg font-medium">Simplified Policy:</Label>
        <div className="relative">
          <Textarea
            readOnly
            placeholder="The simplified policy will appear here..."
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

      {/* Example Policies Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Example Policies</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {samplePolicies.map((policy, index) => (
            <Card
              key={index}
              onClick={() => setInputText(policy)}
              className="cursor-pointer hover:shadow-xl transition-shadow"
            >
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Example Policy {index + 1}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
