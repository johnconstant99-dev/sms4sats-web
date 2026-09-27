import { NextRequest, NextResponse } from "next/server";

const API = "https://api2.sms4sats.com";

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get("country") || "0";
  const service = req.nextUrl.searchParams.get("service") || "ot";
  try {
    const res = await fetch(
      `${API}/getPrice?country=${country}&service=${service}`,
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 500 }
    );
  }
}
