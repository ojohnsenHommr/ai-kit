// src/app/config/page.tsx
"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Integration {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  apiKey: string;
  active: boolean;
}

export default function ConfigPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newName, setNewName] = useState<string>("");
  const [newType, setNewType] = useState<string>("ollama");
  const [newEndpoint, setNewEndpoint] = useState<string>("");
  const [newApiKey, setNewApiKey] = useState<string>("");

  // Fetch integrations on mount
  useEffect(() => {
    async function fetchIntegrations() {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
      setLoading(false);
    }
    fetchIntegrations();
  }, []);

  // When the type changes, clear API key if type is "ollama"
  useEffect(() => {
    if (newType === "ollama") {
      setNewApiKey("");
    }
  }, [newType]);

  // Handler for adding a new integration
  async function handleAddIntegration(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: newName,
      type: newType,
      endpoint: newEndpoint,
      apiKey: newType === "ollama" ? "" : newApiKey,
    };
    console.log("Sending payload:", payload);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      // Refresh integrations list after adding
      const updatedRes = await fetch("/api/integrations");
      const data = await updatedRes.json();
      setIntegrations(data);
      // Clear form fields
      setNewName("");
      setNewEndpoint("");
      if (newType !== "ollama") {
        setNewApiKey("");
      }
    } else {
      console.error("Failed to add integration");
    }
  }

  // Handler for toggling the enabled state of an integration using the switch
  async function handleToggleIntegration(id: string, newActive: boolean) {
    const res = await fetch(`/api/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: newActive }),
    });
    if (res.ok) {
      setIntegrations((prev) =>
        prev.map((intg) => (intg.id === id ? { ...intg, active: newActive } : intg))
      );
    } else {
      console.error("Failed to update integration", id);
    }
  }

  // Handler for deleting an integration
  async function handleDeleteIntegration(id: string) {
    const res = await fetch(`/api/integrations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setIntegrations((prev) => prev.filter((intg) => intg.id !== id));
    } else {
      console.error("Failed to delete integration", id);
    }
  }

  if (loading) return <p>Loading integrations...</p>;

  return (
    <div className="container mx-auto p-4 space-y-10">
      <h1 className="text-2xl font-bold">Integration Configuration</h1>

      {/* Add New Integration Form */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Add New AI Integration</h2>
        <form onSubmit={handleAddIntegration} className="space-y-4">
          <div>
            <Label htmlFor="integrationName">Integration Name</Label>
            <Input
              id="integrationName"
              name="integrationName"
              type="text"
              placeholder="Custom integration name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="integrationType">Integration Type</Label>
            <select
              id="integrationType"
              name="integrationType"
              className="border p-2 rounded w-full"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              <option value="ollama">Ollama</option>
              <option value="nutanix">Nutanix AI</option>
            </select>
          </div>
          <div>
            <Label htmlFor="endpoint">Endpoint</Label>
            <Input
              id="endpoint"
              name="endpoint"
              type="text"
              placeholder="https://api.example.com"
              value={newEndpoint}
              onChange={(e) => setNewEndpoint(e.target.value)}
            />
          </div>
          {/* Only show API Key input if type is not "ollama" */}
          {newType !== "ollama" && (
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="text"
                placeholder="Your API Key"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
              />
            </div>
          )}
          <Button type="submit">Add Integration</Button>
        </form>
      </section>

      {/* List of Integrations with Toggle and Delete */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Manage Integrations</h2>
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-center space-x-4">
              <Switch
                id={`switch-${integration.id}`}
                checked={integration.active}
                onCheckedChange={(checked: boolean) =>
                  handleToggleIntegration(integration.id, checked)
                }
              />
              <Label htmlFor={`switch-${integration.id}`}>
                {integration.name} ({integration.type} - {integration.endpoint})
              </Label>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteIntegration(integration.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
