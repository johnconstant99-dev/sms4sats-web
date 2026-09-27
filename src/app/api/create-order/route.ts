import { NextRequest, NextResponse } from "next/server";

const API = "https://api2.sms4sats.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API}/createorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: body.country ?? 0,
        service: body.service ?? "ot",
        isRental: body.isRental ?? false,
      }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { status: "error", reason: "Failed to create order" },
      { status: 500 }
    );
  }
}
