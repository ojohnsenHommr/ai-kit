// src/app/api/integrations/active/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface Integration {
  id: string;
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

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing integration id" }, { status: 400 });
    }

    const config = await getIntegrations();
    let integrationFound = false;

    config.integrations = config.integrations.map((integration) => {
      if (integration.id === id) {
        integrationFound = true;
        return { ...integration, active: true };
      }
      return { ...integration, active: false };
    });

    if (!integrationFound) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    await saveIntegrations(config);
    return NextResponse.json({ message: "Active integration updated" });
  } catch (error) {
    console.error("PATCH /api/integrations/active error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
