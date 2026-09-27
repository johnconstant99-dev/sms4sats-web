import { NextRequest, NextResponse } from "next/server";

const API = "https://api2.sms4sats.com";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json(
      { status: "error", reason: "orderId required" },
      { status: 400 }
    );
  }
  try {
    const res = await fetch(`${API}/orderstatus?orderId=${orderId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { status: "error", reason: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
