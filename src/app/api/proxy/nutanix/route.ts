// src/app/api/proxy/nutanix/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Define your Integration interface (should match your integration configuration)
interface Integration {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  apiKey: string;
  active: boolean;
}

// Read the integrations from your JSON file
async function getIntegrations(): Promise<{ integrations: Integration[] }> {
  const filePath = path.join(process.cwd(), "src/app/db/integrations.json");
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return { integrations: [] };
  }
}

// Get the active Nutanix integration (you might adjust the logic if needed)
async function getActiveNutanixIntegration(): Promise<Integration | null> {
  const config = await getIntegrations();
  const nutanix = config.integrations.find(
    (int) => int.type === "nutanix" && int.active
  );
  return nutanix || null;
}

export async function POST(request: NextRequest) {
  // Read the Nutanix integration from configuration
  const nutanix = await getActiveNutanixIntegration();
  if (!nutanix) {
    return NextResponse.json(
      { error: "No active Nutanix integration found" },
      { status: 404 }
    );
  }

  // Build the full URL dynamically from the integration config.
  // For example, if nutanix.endpoint is "https://ai.nutanix.com",
  // then the full URL becomes "https://ai.nutanix.com/api/v1/chat/completions"
  const url = nutanix.endpoint.replace(/\/$/, "") + "/api/v1/chat/completions";

  // Forward the request body as-is.
  const body = await request.text();

  // Make the external API call.
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${nutanix.apiKey}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body,
  });

  const responseText = await response.text();
  return new NextResponse(responseText, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
