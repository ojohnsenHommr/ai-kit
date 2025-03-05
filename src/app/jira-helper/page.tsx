"use client";

import React, { useEffect, useState, FormEvent, KeyboardEvent } from "react";
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
import { useSpeechSynthesis } from "react-speech-kit";
import { callOllamaAPI, callNutanixAPI, Integration } from "@/lib/apiHelper";

type Step = 1 | 2 | 3;

export default function SupportHelperPage() {
  // Basic Info
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [issueType, setIssueType] = useState<string>("Question");
  const [urgency, setUrgency] = useState<string>("3");

  // Detailed Issue and dynamic suggestions
  const [description, setDescription] = useState<string>("");
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string>("");

  // Final outputs
  const [finalTicket, setFinalTicket] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string>("");

  // Wizard and loading state
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const { speak, voices } = useSpeechSynthesis();
  const englishVoice = voices.find((v) => v.lang.startsWith("en")) || undefined;

  // Load integrations on mount.
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

  // Step 2: Generate dynamic suggestions for additional details
  async function handleGenerateSuggestions() {
    if (!description.trim() || !selectedIntegration) return;
    setLoading(true);
    try {
      const prompt = `
You are an AI that analyzes support ticket reports and suggests additional details that could improve their clarity.
Based on the description below, list at least one suggestion (e.g., "provide detailed steps to reproduce the issue" or "include environment details or error messages") that would help create a more complete support ticket.
Description:
${description}
      `.trim();

      let response = "";
      if (selectedIntegration.type === "ollama") {
        response = await callOllamaAPI(selectedIntegration, prompt);
      } else if (selectedIntegration.type === "nutanix") {
        response = await callNutanixAPI(selectedIntegration, prompt, 256);
      }
      setDynamicSuggestions(response.trim());
    } catch (error: any) {
      console.error("Error generating suggestions:", error);
      setDynamicSuggestions("Unable to generate suggestions at this time.");
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Generate final support ticket preview.
  async function handleGeneratePreview(e: FormEvent) {
    e.preventDefault();
    if (!description.trim() || !selectedIntegration) return;
    setLoading(true);
    setFinalTicket("");
    setRecommendations("");

    const prompt = `
You are an AI specialized in generating clear, well-organized support tickets.
Based solely on the user input below, produce two sections separated by the markers below:
---FINAL SUPPORT TICKET---
Generate a complete, formatted support ticket including:
  • Ticket Summary (a brief, clear title)
  • Detailed Description (explain the problem in plain language)
  • Steps to Reproduce (if available)
  • Impact (explain how the issue affects work or usage)
  • Additional Comments
  • Both the user's provided urgency rating and your computed urgency rating.
  Analyze the context carefully: if the user's input is exaggerated (e.g. "I can't do my job") but the description shows a less critical issue, adjust the computed rating accordingly.
---RECOMMENDATIONS---
List suggestions for additional details the reporter could add to improve the ticket's clarity (e.g., reproduction steps, environment details, error messages, screenshots).

User Details:
  - Issue Type: ${issueType}
  - User's Urgency Rating (1 = Minor, 5 = Critical): ${urgency}
  - Description: ${description}

Format your output in plain text using exactly the markers above.
    `.trim();

    try {
      let response = "";
      if (selectedIntegration.type === "ollama") {
        response = await callOllamaAPI(selectedIntegration, prompt);
      } else if (selectedIntegration.type === "nutanix") {
        response = await callNutanixAPI(selectedIntegration, prompt, 512);
      } else {
        response = "Unsupported integration type.";
      }
      // Parse the response using the markers.
      const finalMarker = "---FINAL SUPPORT TICKET---";
      const recMarker = "---RECOMMENDATIONS---";
      const finalPart = response.split(recMarker)[0] || "";
      const recPart = response.split(recMarker)[1] || "";
      const ticketText = finalPart.replace(finalMarker, "").trim();
      const recText = recPart.trim();
      setFinalTicket(ticketText);
      setRecommendations(
        recText ||
          "No recommendations provided. Consider adding more details such as reproduction steps, environment details, or error logs."
      );
    } catch (error: any) {
      console.error("Error generating preview:", error);
      setFinalTicket(error.message || "Error calling AI.");
      setRecommendations("");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (step === 2) {
        handleGenerateSuggestions();
      }
    }
  }

  // Wizard navigation
  function nextStep() {
    if (step < 3) setStep((prev) => (prev + 1) as Step);
  }
  function prevStep() {
    if (step > 1) setStep((prev) => (prev - 1) as Step);
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <h1 className="text-4xl font-bold text-center">Support Helper</h1>

      {step === 1 && (
        <div className="space-y-6">
          {/* Step 1: Basic Information */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <Label className="text-lg font-medium">Select Integration</Label>
              <Select
                value={selectedIntegration?.id || ""}
                onValueChange={(value: string) => {
                  const integration = integrations.find((i) => i.id === value);
                  if (integration) setSelectedIntegration(integration);
                }}
              >
                <SelectTrigger className="w-full border border-gray-300 rounded-md shadow-sm">
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
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <Label className="text-lg font-medium">Issue Type</Label>
              <Select
                value={issueType}
                onValueChange={(value: string) => setIssueType(value)}
              >
                <SelectTrigger className="w-full border border-gray-300 rounded-md shadow-sm">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent className="rounded-md shadow-lg">
                  <SelectItem value="Question">Question</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Request">Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-lg font-medium">
                Urgency (1 = Minor, 5 = Critical)
              </Label>
              <Select
                value={urgency}
                onValueChange={(value: string) => setUrgency(value)}
              >
                <SelectTrigger className="w-full border border-gray-300 rounded-md shadow-sm">
                  <SelectValue placeholder="Select urgency" />
                </SelectTrigger>
                <SelectContent className="rounded-md shadow-lg">
                  <SelectItem value="1">1 - Minor inconvenience</SelectItem>
                  <SelectItem value="2">2 - Some impact on work</SelectItem>
                  <SelectItem value="3">3 - Moderate issue affecting work</SelectItem>
                  <SelectItem value="4">
                    4 - Major issue, significant hindrance
                  </SelectItem>
                  <SelectItem value="5">
                    5 - Critical (but analyze context carefully)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Button onClick={nextStep} className="w-full py-3 text-lg">
              Next: Describe the Issue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Step 2: Issue Description & Dynamic Suggestions */}
          <div className="space-y-2">
            <Label className="text-lg font-medium">
              Describe the Issue in Plain Language
            </Label>
            <Textarea
              placeholder="Explain what is not working, how it affects you, and any relevant details. Use simple language so anyone can understand."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-40 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-lg font-medium">
              Suggestions for Additional Information (Optional)
            </Label>
            <Textarea
              readOnly
              placeholder="Click the button below to get suggestions for additional details you might add..."
              value={dynamicSuggestions}
              className="w-full h-20 pr-16 border border-gray-300 rounded-md shadow-sm"
            />
            <Button onClick={handleGenerateSuggestions} className="w-full py-2">
              Get Field Suggestions
            </Button>
          </div>
          <div className="flex justify-between">
            <Button onClick={prevStep} className="py-2 px-4">
              Back
            </Button>
            <Button onClick={nextStep} className="py-2 px-4">
              Next: Preview Ticket
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          {/* Step 3: Preview and Final Generation */}
          <div>
            <Button onClick={handleGeneratePreview} disabled={loading} className="w-full py-3 text-lg">
              {loading ? "Generating Preview…" : "Generate Ticket"}
            </Button>
          </div>
          {finalTicket && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg font-medium">Final Support Ticket</Label>
                <Textarea
                  readOnly
                  placeholder="Your final support ticket will appear here..."
                  value={finalTicket}
                  className="w-full h-40 pr-16 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <Label className="text-lg font-medium">
                  Recommendations for Additional Information
                </Label>
                <Textarea
                  readOnly
                  placeholder="Suggestions for additional details will appear here..."
                  value={recommendations}
                  className="w-full h-20 pr-16 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <Button onClick={prevStep} className="py-2 px-4">
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
