// src/lib/apiHelper.ts

export interface Integration {
    id: string;
    name: string;
    type: string;
    endpoint: string;
    apiKey: string;
    active: boolean;
  }
  
  /**
   * Calls the Ollama API using the provided integration and prompt.
   * Processes a streaming response (multiple JSON objects separated by newlines)
   * and returns the combined and formatted reply.
   */
  export async function callOllamaAPI(
    integration: Integration,
    prompt: string
  ): Promise<string> {
    // Build the full URL by appending '/api/generate' to the endpoint.
    const url = integration.endpoint.replace(/\/$/, "") + "/api/generate";
    const payload = {
      model: "mistral", // Adjust as needed.
      prompt,
    };
  
    console.log("Ollama API Request URL:", url);
    console.log("Ollama API Request Payload:", payload);
  
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  
    console.log("Ollama API Response Status:", response.status);
    const responseText = await response.text();
    console.log("Ollama API Raw Response:", responseText);
  
    if (!response.ok) {
      throw new Error(`Ollama API error: HTTP ${response.status}: ${responseText}`);
    }
  
    // Process streaming response: split by newline and parse each JSON object.
    const lines = responseText.split("\n").filter((line) => line.trim() !== "");
    let combinedResponse = "";
    lines.forEach((line) => {
      try {
        const parsed = JSON.parse(line);
        combinedResponse += parsed.response;
      } catch (err) {
        console.error("Error parsing Ollama response line:", line, err);
      }
    });
    // Insert newlines before numbered items for readability.
    const formattedResponse = combinedResponse.replace(/(\d+\.\s)/g, "\n$1").trim();
    return formattedResponse || "No response from Ollama API.";
  }
  
  /**
   * Calls the Nutanix API via your proxy API route.
   * Returns the AI's reply from the API response.
   * @param integration The Nutanix integration configuration.
   * @param prompt The user's prompt.
   * @param maxTokens The maximum number of tokens (e.g. 256, 512, etc.)
   */
  export async function callNutanixAPI(
    integration: Integration,
    prompt: string,
    maxTokens: number
  ): Promise<string> {
    // Use your dynamic proxy API route so that CORS is bypassed.
    const url = "/api/proxy/nutanix";
    const payload = {
      model: "vllm-llama-3-1-8b", // Adjust as needed.
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      stream: false,
    };
  
    console.log("Nutanix Proxy API Request URL:", url);
    console.log("Nutanix Proxy API Request Payload:", payload);
  
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  
    console.log("Nutanix Proxy API Response Status:", response.status);
    const responseText = await response.text();
    console.log("Nutanix Proxy API Raw Response:", responseText);
  
    if (!response.ok) {
      throw new Error(`Nutanix API error: HTTP ${response.status}: ${responseText}`);
    }
  
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      throw new Error("Failed to parse Nutanix JSON: " + jsonError);
    }
    return data?.choices?.[0]?.message?.content || "No response from Nutanix API.";
  }
  