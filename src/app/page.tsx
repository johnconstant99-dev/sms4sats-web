"use client";

import { useState, useEffect, useCallback, useRef } from "react";
// QR via image API
// Icons as simple SVGs to avoid extra deps

type Country = {
  id: number;
  eng: string;
  visible?: number;
  rent?: number;
};

type Service = {
  code: string;
  name: string;
};

type OrderState =
  | { step: "select" }
  | { step: "creating" }
  | {
      step: "pay";
      orderId: string;
      payreq: string;
      priceSats?: number;
    }
  | {
      step: "waiting";
      orderId: string;
      payreq: string;
      number?: string | number;
      paid: boolean;
    }
  | {
      step: "success";
      orderId: string;
      number: string | number;
      code: string | number;
      country?: string;
      service?: string;
    }
  | { step: "error"; message: string; orderId?: string }
  | { step: "cancelled"; message: string };

export default function Home() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [countryId, setCountryId] = useState<number>(999);
  const [serviceCode, setServiceCode] = useState("ot");
  const [price, setPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [state, setState] = useState<OrderState>({ step: "select" });
  const [copied, setCopied] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => {
            if (a.id === 999 || a.eng === "Auto-Select") return -1;
            if (b.id === 999 || b.eng === "Auto-Select") return 1;
            return (a.eng || "").localeCompare(b.eng || "");
          });
          setCountries(sorted);
          const auto = sorted.find(
            (c) => c.id === 999 || c.eng === "Auto-Select" || c.id === 0
          );
          if (auto) setCountryId(auto.id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const c = countryId === 999 ? 0 : countryId;
    fetch(`/api/services?country=${c}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data);
          if (!data.find((s: Service) => s.code === serviceCode)) {
            setServiceCode("ot");
          }
        }
      })
      .catch(console.error);
  }, [countryId]);

  useEffect(() => {
    if (state.step !== "select") return;
    setLoadingPrice(true);
    const c = countryId === 999 ? 0 : countryId;
    fetch(`/api/price?country=${c}&service=${serviceCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.price !== undefined) setPrice(data.price);
        else if (typeof data === "number") setPrice(data);
        else setPrice(null);
      })
      .catch(() => setPrice(null))
      .finally(() => setLoadingPrice(false));
  }, [countryId, serviceCode, state.step]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (orderId: string, payreq: string) => {
      stopPolling();
      const poll = async () => {
        try {
          const res = await fetch(`/api/order-status?orderId=${orderId}`);
          const data = await res.json();
          if (data.error) {
            stopPolling();
            setState({
              step: "error",
              message: data.error,
              orderId,
            });
            return;
          }
          if (data.code != null && data.number != null) {
            stopPolling();
            setState({
              step: "success",
              orderId,
              number: data.number,
              code: data.code,
              country: data.country,
              service: data.service,
            });
            return;
          }
          if (data.paid) {
            setState((prev) => {
              if (prev.step === "pay" || prev.step === "waiting") {
                return {
                  step: "waiting",
                  orderId,
                  payreq,
                  number: data.number,
                  paid: true,
                };
              }
              return prev;
            });
          }
        } catch (e) {
          console.error("Poll error", e);
        }
      };
      poll();
      pollRef.current = setInterval(poll, 5000);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const createOrder = async () => {
    setState({ step: "creating" });
    try {
      const c = countryId === 999 ? 0 : countryId;
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: c, service: serviceCode }),
      });
      const data = await res.json();
      if (data.status === "OK" && data.orderId && data.payreq) {
        setState({
          step: "pay",
          orderId: data.orderId,
          payreq: data.payreq,
        });
        startPolling(data.orderId, data.payreq);
      } else {
        setState({
          step: "error",
          message: data.reason || data.error || "Failed to create order",
        });
      }
    } catch (e) {
      setState({
        step: "error",
        message: "Network error creating order",
      });
    }
  };

  const cancelOrder = async () => {
    if (state.step !== "pay" && state.step !== "waiting") return;
    const orderId = state.orderId;
    stopPolling();
    try {
      await fetch("/api/cancel-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      setState({
        step: "cancelled",
        message:
          "Order cancelled. If paid, funds will return to your wallet (hold invoice).",
      });
    } catch {
      setState({
        step: "error",
        message: "Failed to cancel",
        orderId,
      });
    }
  };

  const reset = () => {
    stopPolling();
    setState({ step: "select" });
    setCopied(null);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(String(text));
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const lnurl = (payreq: string) => `lightning:${payreq}`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
              ⚡
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight">
                SMS<span className="text-amber-400">4</span>Sats
              </h1>
              <p className="text-xs text-zinc-500 -mt-0.5">
                Lightning SMS verification
              </p>
            </div>
          </div>
          <a
            href="https://docs.sms4sats.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-400 hover:text-amber-400 transition"
          >
            API Docs
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {state.step === "select" && (
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Receive SMS codes{" "}
              <span className="text-amber-400">anonymously</span>
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Disposable numbers · Pay only if code arrives · Bitcoin Lightning
              · No accounts · No KYC
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">🛡 Hold invoices</span>
              <span className="flex items-center gap-1.5">₿ Lightning only</span>
              <span className="flex items-center gap-1.5">💬 400+ services</span>
            </div>
          </div>
        )}

        {state.step === "select" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">🌐 Country</label>
                <select
                  value={countryId}
                  onChange={(e) => setCountryId(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 appearance-none"
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.eng || `Country ${c.id}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">📱 Service</label>
                <select
                  value={serviceCode}
                  onChange={(e) => setServiceCode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 appearance-none"
                >
                  {services.length === 0 && <option value="ot">Any other</option>}
                  {services.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-zinc-400">
                {loadingPrice ? (
                  <span className="flex items-center gap-2">⏳ Checking price…</span>
                ) : price != null ? (
                  <span>Price: <strong className="text-amber-400 text-lg">{price.toLocaleString()} sats</strong></span>
                ) : (
                  <span>~1500–4000 sats (varies)</span>
                )}
              </div>
              <button
                onClick={createOrder}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-amber-500/20"
              >
                Get Number →
              </button>
            </div>
          </div>
        )}

        {state.step === "creating" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
            <span className="text-4xl animate-pulse">⏳</span>
            <p className="text-zinc-300">Creating order…</p>
          </div>
        )}

        {(state.step === "pay" || state.step === "waiting") && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-1">
                {state.step === "waiting" && state.paid
                  ? state.number
                    ? "Number assigned — waiting for SMS"
                    : "Payment received — allocating number…"
                  : "Pay with Lightning"}
              </h3>
              <p className="text-sm text-zinc-400">
                {state.step === "waiting" && state.paid
                  ? "Enter the number on the service. Code will appear here automatically."
                  : "Scan the QR or open in your Lightning wallet. Hold invoice — you only pay if code arrives."}
              </p>
            </div>
            {state.step === "pay" && (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-2xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(state.payreq)}`}
                    alt="Lightning invoice QR"
                    width={220}
                    height={220}
                  />
                </div>
                <a href={lnurl(state.payreq)} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium px-5 py-2.5 rounded-xl transition">
                  ⚡ Open in wallet
                </a>
                <button onClick={() => copy(state.payreq, "invoice")} className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
                  {copied === "invoice" ? <>✓ Copied</> : <>📋 Copy invoice</>}
                </button>
              </div>
            )}
            {state.step === "waiting" && state.number && (
              <div className="bg-zinc-950 border border-zinc-700 rounded-xl p-5 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Phone number</p>
                <p className="text-2xl font-mono font-semibold tracking-wide text-amber-400">+{state.number}</p>
                <button onClick={() => copy(String(state.number), "number")} className="mt-2 text-sm text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1">
                  {copied === "number" ? <>✓ Copied</> : <>📋 Copy</>}
                </button>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">⏳ Polling for code…</div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={cancelOrder} className="text-sm text-zinc-500 hover:text-red-400 flex items-center gap-1.5 transition">✕ Cancel order</button>
              <button onClick={reset} className="text-sm text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition">↻ Start over</button>
            </div>
          </div>
        )}

        {state.step === "success" && (
          <div className="bg-zinc-900/60 border border-emerald-800/50 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">✓</div>
              <h3 className="text-xl font-semibold text-emerald-400">Code received!</h3>
              <p className="text-sm text-zinc-400 mt-1">Payment settled. Use the code below.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-zinc-950 border border-zinc-700 rounded-xl p-5 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Phone number</p>
                <p className="text-xl font-mono font-semibold text-amber-400">+{state.number}</p>
                <button onClick={() => copy(String(state.number), "number")} className="mt-2 text-sm text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1">
                  {copied === "number" ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
              <div className="bg-zinc-950 border border-emerald-700/50 rounded-xl p-5 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Activation code</p>
                <p className="text-3xl font-mono font-bold text-emerald-400 tracking-widest">{state.code}</p>
                <button onClick={() => copy(String(state.code), "code")} className="mt-2 text-sm text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1">
                  {copied === "code" ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            </div>
            {(state.country || state.service) && (
              <p className="text-center text-xs text-zinc-500">{state.service}{state.country ? ` · ${state.country}` : ""}</p>
            )}
            <div className="text-center">
              <button onClick={reset} className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium px-5 py-2.5 rounded-xl transition">↻ New order</button>
            </div>
          </div>
        )}

        {(state.step === "error" || state.step === "cancelled") && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
            <span className={`text-5xl ${state.step === "cancelled" ? "text-zinc-500" : "text-red-400"}`}>✕</span>
            <p className="text-zinc-300 max-w-md mx-auto">{state.message}</p>
            <button onClick={reset} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium px-5 py-2.5 rounded-xl transition">Try again</button>
          </div>
        )}

        {state.step === "select" && (
          <div className="mt-12 grid sm:grid-cols-3 gap-6 text-center">
            {[
              { n: "1", title: "Select", desc: "Country & service (or Auto + Any other)" },
              { n: "2", title: "Pay", desc: "Lightning invoice. Hold invoice — refund if no code" },
              { n: "3", title: "Receive", desc: "Number + code appear. Use them to verify" },
            ].map((s) => (
              <div key={s.n} className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 text-amber-400 font-bold flex items-center justify-center mx-auto text-sm">{s.n}</div>
                <h4 className="font-medium text-zinc-200">{s.title}</h4>
                <p className="text-sm text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
        <p>
          Powered by{" "}
          <a href="https://sms4sats.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/80 hover:text-amber-400">sms4sats.com</a>
          {" · "}
          <a href="https://api.sms4sats.com/skill.md" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">Agent skill</a>
          {" · "}Independent integration demo
        </p>
      </footer>
    </div>
  );
}
