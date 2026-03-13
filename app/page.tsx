"use client";

import React, { useMemo, useState } from "react";

function euro(value: number) { return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2, }).format(value); }

function num(value: number, digits = 2) { return new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits, }).format(value); }

type Row = { month: number; year: number; payment: number; interest: number; principal: number; extra: number; balance: number; };

function amortize({ loanAmount, annualRate, monthlyPayment, annualExtraPayment, }: { loanAmount: number; annualRate: number; monthlyPayment: number; annualExtraPayment: number; }) { const monthlyRate = annualRate / 100 / 12; let balance = Math.max(0, loanAmount); let month = 0; let totalInterest = 0; let totalPayment = 0; const rows: Row[] = [];

if (balance <= 0) { return { rows, months: 0, totalInterest: 0, totalPayment: 0, repaid: true, }; }

if (monthlyPayment <= balance * monthlyRate) { return { rows, months: Infinity, totalInterest: Infinity, totalPayment: Infinity, repaid: false, }; }

while (balance > 0.01 && month < 1440) { month += 1; const interest = balance * monthlyRate; let principal = monthlyPayment - interest;

if (principal > balance) principal = balance;

let payment = interest + principal;
balance -= principal;

let extra = 0;
if (annualExtraPayment > 0 && month % 12 === 0 && balance > 0) {
  extra = Math.min(annualExtraPayment, balance);
  balance -= extra;
}

totalInterest += interest;
totalPayment += payment + extra;

rows.push({
  month,
  year: Math.ceil(month / 12),
  payment,
  interest,
  principal,
  extra,
  balance: Math.max(0, balance),
});

}

return { rows, months: month, totalInterest, totalPayment, repaid: balance <= 0.01, }; }

export default function Page() { const [purchasePrice, setPurchasePrice] = useState(320000); const [purchaseCostsPercent, setPurchaseCostsPercent] = useState(10); const [renovation, setRenovation] = useState(15000); const [equity, setEquity] = useState(70000);

const [annualRate, setAnnualRate] = useState(3.8); const [initialRepayment, setInitialRepayment] = useState(2.0); const [annualExtraPayment, setAnnualExtraPayment] = useState(0); const [manualMonthlyPayment, setManualMonthlyPayment] = useState(0); const [calculationMode, setCalculationMode] = useState<"rate" | "duration">("duration"); const [targetYears, setTargetYears] = useState(30);

const [monthlyRentCold, setMonthlyRentCold] = useState(1150); const [monthlyNonApportionableCosts, setMonthlyNonApportionableCosts] = useState(85); const [monthlyReserve, setMonthlyReserve] = useState(45); const [vacancyPercent, setVacancyPercent] = useState(2);

const result = useMemo(() => { const purchaseCosts = purchasePrice * (purchaseCostsPercent / 100); const projectCost = purchasePrice + purchaseCosts + renovation; const loanAmount = Math.max(0, projectCost - equity);

let monthlyPayment = 0;

if (calculationMode === "duration") {
  monthlyPayment = loanAmount * ((annualRate + initialRepayment) / 100) / 12;
  if (manualMonthlyPayment > 0) {
    monthlyPayment = manualMonthlyPayment;
  }
} else {
  const months = Math.max(1, Math.round(targetYears * 12));
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / months;
  } else {
    monthlyPayment = loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  }
}

const sim = amortize({
  loanAmount,
  annualRate,
  monthlyPayment,
  annualExtraPayment,
});

const years = Number.isFinite(sim.months) ? Math.floor(sim.months / 12) : Infinity;
const remainingMonths = Number.isFinite(sim.months) ? sim.months % 12 : Infinity;

const annualColdRent = monthlyRentCold * 12;
const annualVacancy = annualColdRent * (vacancyPercent / 100);
const annualNetRent = annualColdRent - annualVacancy;
const annualOwnerCosts = monthlyNonApportionableCosts * 12 + monthlyReserve * 12;
const annualDebtService = Number.isFinite(monthlyPayment) ? monthlyPayment * 12 + annualExtraPayment : Infinity;
const cashflowBeforeTax = annualNetRent - annualOwnerCosts - annualDebtService;

const grossYield = purchasePrice > 0 ? (annualColdRent / purchasePrice) * 100 : 0;
const netYield = projectCost > 0 ? ((annualNetRent - annualOwnerCosts) / projectCost) * 100 : 0;

const yearlyRows = sim.rows.reduce((acc: Array<{
  year: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  balance: number;
}>, row) => {
  const existing = acc.find((x) => x.year === row.year);
  if (existing) {
    existing.payment += row.payment;
    existing.interest += row.interest;
    existing.principal += row.principal;
    existing.extra += row.extra;
    existing.balance = row.balance;
  } else {
    acc.push({
      year: row.year,
      payment: row.payment,
      interest: row.interest,
      principal: row.principal,
      extra: row.extra,
      balance: row.balance,
    });
  }
  return acc;
}, []);

return {
  purchaseCosts,
  projectCost,
  loanAmount,
  monthlyPayment,
  years,
  remainingMonths,
  annualDebtService,
  cashflowBeforeTax,
  annualColdRent,
  annualNetRent,
  annualOwnerCosts,
  grossYield,
  netYield,
  ...sim,
  yearlyRows,
};

}, [ purchasePrice, purchaseCostsPercent, renovation, equity, annualRate, initialRepayment, annualExtraPayment, manualMonthlyPayment, calculationMode, targetYears, monthlyRentCold, monthlyNonApportionableCosts, monthlyReserve, vacancyPercent, ]);

const card: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 14px rgba(0,0,0,0.08)", };

const input: React.CSSProperties = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #d1d5db", boxSizing: "border-box", fontSize: 16, };

const label: React.CSSProperties = { display: "block", marginBottom: 6, fontWeight: 600, };

const summaryCard = (title: string, value: string, sub?: string) => ( <div style={card}> <div style={{ color: "#6b7280", fontSize: 14 }}>{title}</div> <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div> {sub ? <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{sub}</div> : null} </div> );

const maxBalance = Math.max(...result.yearlyRows.map((r) => r.balance), 1);

return ( <main style={{ minHeight: "100vh", background: "#f3f4f6", padding: 20, fontFamily: "Arial, sans-serif" }}> <div style={{ maxWidth: 1300, margin: "0 auto" }}> <h1 style={{ fontSize: 34, marginBottom: 8 }}>Immobilien- & Finanzierungsrechner</h1> <p style={{ color: "#4b5563", marginBottom: 24 }}> Mit Laufzeit, Tilgungsplan, Restschuldverlauf und Vermietungskennzahlen. </p>

<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 20 }}>
      <div style={card}>
        <h2>Objekt</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Kaufpreis (€)</label>
          <input style={input} type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Kaufnebenkosten (%)</label>
          <input style={input} type="number" step="0.1" value={purchaseCostsPercent} onChange={(e) => setPurchaseCostsPercent(Number(e.target.value))} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Renovierung (€)</label>
          <input style={input} type="number" value={renovation} onChange={(e) => setRenovation(Number(e.target.value))} />
        </div>
        <div>
          <label style={label}>Eigenkapital (€)</label>
          <input style={input} type="number" value={equity} onChange={(e) => setEquity(Number(e.target.value))} />
        </div>
      </div>

      <div style={card}>
        <h2>Finanzierung</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Berechnungsart</label>
          <select style={input} value={calculationMode} onChange={(e) => setCalculationMode(e.target.value as "rate" | "duration")}>
            <option value="duration">Rate vorgeben → Laufzeit berechnen</option>
            <option value="rate">Laufzeit vorgeben → Rate berechnen</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Sollzins p.a. (%)</label>
          <input style={input} type="number" step="0.01" value={annualRate} onChange={(e) => setAnnualRate(Number(e.target.value))} />
        </div>

        {calculationMode === "duration" ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Anfängliche Tilgung p.a. (%)</label>
              <input style={input} type="number" step="0.01" value={initialRepayment} onChange={(e) => setInitialRepayment(Number(e.target.value))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Optionale manuelle Monatsrate (€)</label>
              <input style={input} type="number" value={manualMonthlyPayment} onChange={(e) => setManualMonthlyPayment(Number(e.target.value))} />
            </div>
          </>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Gewünschte Laufzeit (Jahre)</label>
            <input style={input} type="number" step="1" value={targetYears} onChange={(e) => setTargetYears(Number(e.target.value))} />
          </div>
        )}

        <div>
          <label style={label}>Sondertilgung pro Jahr (€)</label>
          <input style={input} type="number" value={annualExtraPayment} onChange={(e) => setAnnualExtraPayment(Number(e.target.value))} />
        </div>
      </div>

      <div style={card}>
        <h2>Vermietung</h2>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Kaltmiete pro Monat (€)</label>
          <input style={input} type="number" value={monthlyRentCold} onChange={(e) => setMonthlyRentCold(Number(e.target.value))} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Nicht umlagefähige Kosten pro Monat (€)</label>
          <input style={input} type="number" value={monthlyNonApportionableCosts} onChange={(e) => setMonthlyNonApportionableCosts(Number(e.target.value))} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Rücklage pro Monat (€)</label>
          <input style={input} type="number" value={monthlyReserve} onChange={(e) => setMonthlyReserve(Number(e.target.value))} />
        </div>
        <div>
          <label style={label}>Leerstand (%)</label>
          <input style={input} type="number" step="0.1" value={vacancyPercent} onChange={(e) => setVacancyPercent(Number(e.target.value))} />
        </div>
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
      {summaryCard("Gesamtprojektkosten", euro(result.projectCost))}
      {summaryCard("Darlehenssumme", euro(result.loanAmount))}
      {summaryCard("Monatsrate", Number.isFinite(result.monthlyPayment) ? euro(result.monthlyPayment) : "nicht möglich")}
      {summaryCard("Laufzeit", Number.isFinite(result.months) ? `${result.years} J ${result.remainingMonths} M` : "Rate zu niedrig")}
      {summaryCard("Gesamtzins", Number.isFinite(result.totalInterest) ? euro(result.totalInterest) : "unendlich")}
      {summaryCard("Gesamtauszahlung", Number.isFinite(result.totalPayment) ? euro(result.totalPayment) : "unendlich")}
      {summaryCard("Bruttorendite", `${num(result.grossYield)} %`)}
      {summaryCard("Cashflow vor Steuer", euro(result.cashflowBeforeTax), `Jahresrate ${euro(result.annualDebtService)}`)}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 20 }}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Restschuldverlauf</h2>
        <div style={{ display: "flex", alignItems: "end", gap: 6, height: 220, overflowX: "auto", paddingTop: 10 }}>
          {result.yearlyRows.slice(0, 40).map((r) => (
            <div key={r.year} style={{ minWidth: 24, textAlign: "center" }}>
              <div
                title={`Jahr ${r.year}: ${euro(r.balance)}`}
                style={{
                  height: `${Math.max(6, (r.balance / maxBalance) * 180)}px`,
                  background: "#1f2937",
                  borderRadius: 6,
                  marginBottom: 6,
                }}
              />
              <div style={{ fontSize: 11, color: "#6b7280" }}>{r.year}</div>
            </div>
          ))}
        </div>
        <p style={{ color: "#6b7280", fontSize: 13, marginTop: 10 }}>
          Balken zeigen die Restschuld pro Jahr. Damit siehst du den zeitlichen Verlauf der Finanzierung direkt.
        </p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Jahr 1 im Überblick</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <div><strong>Kaltmiete p.a.:</strong> {euro(result.annualColdRent)}</div>
          <div><strong>Nettomiete nach Leerstand:</strong> {euro(result.annualNetRent)}</div>
          <div><strong>Eigentümerkosten p.a.:</strong> {euro(result.annualOwnerCosts)}</div>
          <div><strong>Nettomietrendite:</strong> {num(result.netYield)} %</div>
          <div><strong>Kaufnebenkosten:</strong> {euro(result.purchaseCosts)}</div>
          <div><strong>Restschuld nach Jahr 1:</strong> {result.yearlyRows[0] ? euro(result.yearlyRows[0].balance) : euro(0)}</div>
        </div>
      </div>
    </div>

    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Tilgungsplan ähnlich Kreditrechner</h2>
      <p style={{ color: "#6b7280", marginTop: 0 }}>
        Jahresübersicht mit Rate, Zinsen, Tilgung, Sondertilgung und Restschuld. Das orientiert sich an einem klassischen Annuitäten- bzw. Kreditrechner mit Tilgungsplan, Laufzeit und Restschuld. ([zinsen-berechnen.de](https://www.zinsen-berechnen.de/kreditrechner.php?utm_source=chatgpt.com))
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#e5e7eb" }}>
              <th style={{ padding: 10, textAlign: "left" }}>Jahr</th>
              <th style={{ padding: 10, textAlign: "right" }}>Rate</th>
              <th style={{ padding: 10, textAlign: "right" }}>Zinsen</th>
              <th style={{ padding: 10, textAlign: "right" }}>Tilgung</th>
              <th style={{ padding: 10, textAlign: "right" }}>Sondertilgung</th>
              <th style={{ padding: 10, textAlign: "right" }}>Restschuld</th>
            </tr>
          </thead>
          <tbody>
            {result.yearlyRows.slice(0, 40).map((r) => (
              <tr key={r.year} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 10 }}>{r.year}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{euro(r.payment)}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{euro(r.interest)}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{euro(r.principal)}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{euro(r.extra)}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{euro(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</main>

); }
