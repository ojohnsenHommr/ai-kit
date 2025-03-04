// src/app/api/integrations/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface Integration {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  apiKey: string;
  active: boolean;
}

interface IntegrationsConfig {
  integrations: Integration[];
}

const filePath = path.join(process.cwd(), "src/app/db/integrations.json");

async function getIntegrations(): Promise<IntegrationsConfig> {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data) as IntegrationsConfig;
  } catch (error) {
    return { integrations: [] };
  }
}

async function saveIntegrations(config: IntegrationsConfig): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(config, null, 2));
}

// GET a single integration by ID.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;
  const config = await getIntegrations();
  const integration = config.integrations.find((item) => item.id === id);
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }
  return NextResponse.json(integration);
}

// PATCH to update the "active" flag of an integration.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const { active } = await request.json();
    const config = await getIntegrations();
    let found = false;
    config.integrations = config.integrations.map((integration) => {
      if (integration.id === id) {
        found = true;
        return { ...integration, active };
      }
      return integration;
    });
    if (!found) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }
    await saveIntegrations(config);
    return NextResponse.json({ message: "Integration updated" });
  } catch (error) {
    console.error("PATCH /api/integrations/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE an integration by its ID.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const config = await getIntegrations();
    const initialCount = config.integrations.length;
    config.integrations = config.integrations.filter(
      (integration) => integration.id !== id
    );
    if (config.integrations.length === initialCount) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }
    await saveIntegrations(config);
    return NextResponse.json({ message: "Integration deleted" });
  } catch (error) {
    console.error("DELETE /api/integrations/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
