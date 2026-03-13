"use client";

import React, { useMemo, useState } from "react";

function formatNumber(n: number) { return new Intl.NumberFormat("de-DE").format(n); }

function parseNumber(v: string) { return Number(v.replace(/./g, "").replace(",", ".")) || 0; }

function euro(value: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0, }).format(value); }

export default function Page() { const [purchasePrice, setPurchasePrice] = useState("320.000"); const [purchaseCostsPercent, setPurchaseCostsPercent] = useState("10"); const [renovation, setRenovation] = useState("15.000"); const [equity, setEquity] = useState("70.000");

const [annualRate, setAnnualRate] = useState("4"); const [initialRepayment, setInitialRepayment] = useState("1,5");

const calc = useMemo(() => { const kp = parseNumber(purchasePrice); const nkp = parseNumber(purchaseCostsPercent); const ren = parseNumber(renovation); const eq = parseNumber(equity); const z = parseNumber(annualRate); const t = parseNumber(initialRepayment);

const purchaseCosts = kp * (nkp / 100);
const projectCost = kp + purchaseCosts + ren;
const loan = Math.max(0, projectCost - eq);

const monthlyRate = loan * ((z + t) / 100) / 12;

return {
  purchaseCosts,
  projectCost,
  loan,
  monthlyRate,
};

}, [purchasePrice, purchaseCostsPercent, renovation, equity, annualRate, initialRepayment]);

const card: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 14px rgba(0,0,0,0.08)", };

const input: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: 16, };

const label: React.CSSProperties = { display: "block", marginBottom: 6, fontWeight: 600, };

function handleFocus(setter: any) { return (e: any) => { if (e.target.value === "0") setter(""); }; }

function handleBlur(setter: any) { return (e: any) => { const v = parseNumber(e.target.value); setter(formatNumber(v)); }; }

return ( <main style={{ minHeight: "100vh", background: "#f3f4f6", padding: 20, fontFamily: "Arial" }}> <div style={{ maxWidth: 900, margin: "0 auto" }}> <h1 style={{ fontSize: 34 }}>Finanzierungsrechner</h1>

<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
      <div style={card}>
        <h2>Objekt</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Kaufpreis</label>
          <input
            style={input}
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            onFocus={handleFocus(setPurchasePrice)}
            onBlur={handleBlur(setPurchasePrice)}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nebenkosten %</label>
          <input
            style={input}
            value={purchaseCostsPercent}
            onChange={(e) => setPurchaseCostsPercent(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Renovierung</label>
          <input
            style={input}
            value={renovation}
            onChange={(e) => setRenovation(e.target.value)}
            onFocus={handleFocus(setRenovation)}
            onBlur={handleBlur(setRenovation)}
          />
        </div>

        <div>
          <label style={label}>Eigenkapital</label>
          <input
            style={input}
            value={equity}
            onChange={(e) => setEquity(e.target.value)}
            onFocus={handleFocus(setEquity)}
            onBlur={handleBlur(setEquity)}
          />
        </div>
      </div>

      <div style={card}>
        <h2>Finanzierung</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Zins %</label>
          <input
            style={input}
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
          />
        </div>

        <div>
          <label style={label}>Tilgung %</label>
          <input
            style={input}
            value={initialRepayment}
            onChange={(e) => setInitialRepayment(e.target.value)}
          />
        </div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginTop: 20 }}>
      <div style={card}>
        <div style={{ color: "#6b7280" }}>Gesamtkosten</div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.projectCost)}</div>
      </div>

      <div style={card}>
        <div style={{ color: "#6b7280" }}>Darlehen</div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.loan)}</div>
      </div>

      <div style={card}>
        <div style={{ color: "#6b7280" }}>Monatsrate</div>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.monthlyRate)}</div>
      </div>
    </div>
  </div>
</main>

); }
