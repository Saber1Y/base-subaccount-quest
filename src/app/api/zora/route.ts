import { NextRequest, NextResponse } from "next/server";

const ZORA_API_URL = "https://api.zora.co/graphql";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(ZORA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any required Zora API headers here
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Zora API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Zora API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Zora API" },
      { status: 500 }
    );
  }
}
