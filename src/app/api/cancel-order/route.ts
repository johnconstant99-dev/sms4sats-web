import { NextRequest, NextResponse } from "next/server";

const API = "https://api2.sms4sats.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body.orderId;
    if (!orderId) {
      return NextResponse.json(
        { status: "error", reason: "orderId required" },
        { status: 400 }
      );
    }
    const res = await fetch(`${API}/cancelorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { status: "error", reason: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
