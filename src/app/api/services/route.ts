import { NextRequest, NextResponse } from "next/server";

const API = "https://api2.sms4sats.com";

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country") || "0";
  try {
    const res = await fetch(`${API}/getServices?country=${country}`, {
      next: { revalidate: 300 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}
