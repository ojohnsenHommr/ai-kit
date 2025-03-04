// src/app/api/integrations/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Updated Integration interface includes custom name.
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

export async function GET(): Promise<NextResponse> {
  const config = await getIntegrations();
  return NextResponse.json(config.integrations);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { name, type, endpoint, apiKey } = body;

    // "name", "type", and "endpoint" are always required.
    // "apiKey" is required only if type is not "ollama".
    if (!name || !type || !endpoint || (type !== "ollama" && !apiKey)) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: name, type, and endpoint are required, and apiKey is required for non-ollama integrations.",
        },
        { status: 400 }
      );
    }

    const newIntegration: Integration = {
      id: Date.now().toString(),
      name,
      type,
      endpoint,
      apiKey: type === "ollama" ? "" : apiKey,
      active: false,
    };

    const config = await getIntegrations();
    config.integrations.push(newIntegration);
    await saveIntegrations(config);

    return NextResponse.json(newIntegration, { status: 201 });
  } catch (error) {
    console.error("POST /api/integrations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
