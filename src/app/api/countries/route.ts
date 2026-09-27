import { NextResponse } from "next/server";

const API = "https://api2.sms4sats.com";

export async function GET() {
  try {
    const res = await fetch(`${API}/getCountries`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
