"use client";

import React, { useMemo, useState } from "react";

type YearRow = {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  rentNet: number;
  ownerCosts: number;
  taxableRentalIncome: number;
  taxOnRentalIncome: number;
  cashflowAfterTax: number;
  balance: number;
};

function parseNumber(v: string) {
  return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function euro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " %";
}

function yearsMonths(totalMonths: number) {
  if (!Number.isFinite(totalMonths)) return "nicht tilgbar";
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return `${y} J ${m} M`;
}

function calculateRequiredMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  years: number,
  targetBalance: number
) {
  const months = Math.max(1, Math.round(years * 12));
  const r = annualRate / 100 / 12;
  const balloon = Math.max(0, targetBalance);

  if (loanAmount <= 0) return 0;
  if (r === 0) return Math.max(0, (loanAmount - balloon) / months);

  const factor = Math.pow(1 + r, months);
  return ((loanAmount * factor - balloon) * r) / (factor - 1);
}

function calculateFullRepaymentMonths(
  loanAmount: number,
  annualRate: number,
  monthlyPayment: number,
  annualExtraPayment: number
) {
  const monthlyRate = annualRate / 100 / 12;
  let balance = Math.max(0, loanAmount);
  let month = 0;

  if (balance <= 0) return 0;
  if (monthlyRate > 0 && monthlyPayment <= balance * monthlyRate) return Infinity;

  while (balance > 0.01 && month < 2400) {
    month += 1;
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
    let principal = monthlyPayment - interest;
    if (principal < 0) principal = 0;
    if (principal > balance) principal = balance;
    balance -= principal;

    if (annualExtraPayment > 0 && month % 12 === 0 && balance > 0) {
      const extra = Math.min(annualExtraPayment, balance);
      balance -= extra;
    }
  }

  return balance <= 0.01 ? month : Infinity;
}

function simulateYears(params: {
  loanAmount: number;
  annualRate: number;
  monthlyPayment: number;
  annualExtraPayment: number;
  years: number;
  rentNetAnnual: number;
  ownerCostsAnnual: number;
  depreciationAnnual: number;
  taxRate: number;
}) {
  const {
    loanAmount,
    annualRate,
    monthlyPayment,
    annualExtraPayment,
    years,
    rentNetAnnual,
    ownerCostsAnnual,
    depreciationAnnual,
    taxRate,
  } = params;

  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = Math.max(1, Math.round(years * 12));
  let balance = Math.max(0, loanAmount);
  let totalInterest = 0;
  let totalPayment = 0;
  let totalExtra = 0;
  const rows: YearRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    let paymentYear = 0;
    let interestYear = 0;
    let principalYear = 0;
    let extraYear = 0;

    for (let m = 1; m <= 12; m += 1) {
      const absoluteMonth = (year - 1) * 12 + m;
      if (absoluteMonth > totalMonths || balance <= 0.01) break;

      const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
      let principal = monthlyPayment - interest;
      if (principal < 0) principal = 0;
      if (principal > balance) principal = balance;

      const payment = interest + principal;
      balance -= principal;

      paymentYear += payment;
      interestYear += interest;
      principalYear += principal;
      totalInterest += interest;
      totalPayment += payment;
    }

    if (annualExtraPayment > 0 && balance > 0) {
      const extra = Math.min(annualExtraPayment, balance);
      balance -= extra;
      extraYear += extra;
      totalExtra += extra;
      totalPayment += extra;
    }

    const taxableRentalIncome = rentNetAnnual - ownerCostsAnnual - interestYear - depreciationAnnual;
    const taxOnRentalIncome = taxableRentalIncome > 0 ? taxableRentalIncome * (taxRate / 100) : 0;
    const cashflowAfterTax = rentNetAnnual - ownerCostsAnnual - paymentYear - extraYear - taxOnRentalIncome;

    rows.push({
      year,
      payment: paymentYear,
      interest: interestYear,
      principal: principalYear,
      extra: extraYear,
      rentNet: rentNetAnnual,
      ownerCosts: ownerCostsAnnual,
      taxableRentalIncome,
      taxOnRentalIncome,
      cashflowAfterTax,
      balance: Math.max(0, balance),
    });
  }

  return {
    rows,
    remainingBalance: Math.max(0, balance),
    totalInterest,
    totalPayment,
    totalExtra,
  };
}

export default function Page() {
  const [purchasePrice, setPurchasePrice] = useState("320.000");
  const [purchaseCostsPercent, setPurchaseCostsPercent] = useState("10");
  const [renovation, setRenovation] = useState("15.000");
  const [equity, setEquity] = useState("70.000");

  const [annualRate, setAnnualRate] = useState("4");
  const [initialRepayment, setInitialRepayment] = useState("1,5");
  const [annualExtraPayment, setAnnualExtraPayment] = useState("0");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState("");

  const [scenarioMode, setScenarioMode] = useState<"full" | "fixed">("full");
  const [fixedYears, setFixedYears] = useState("10");
  const [targetBalance, setTargetBalance] = useState("0");

  const [monthlyRentCold, setMonthlyRentCold] = useState("1.150");
  const [monthlyNonApportionableCosts, setMonthlyNonApportionableCosts] = useState("85");
  const [monthlyReserve, setMonthlyReserve] = useState("45");
  const [depreciationAnnual, setDepreciationAnnual] = useState("5.120");
  const [personalTaxRate, setPersonalTaxRate] = useState("35");

  const calc = useMemo(() => {
    const kp = parseNumber(purchasePrice);
    const nkp = parseNumber(purchaseCostsPercent);
    const ren = parseNumber(renovation);
    const eq = parseNumber(equity);
    const z = parseNumber(annualRate);
    const t = parseNumber(initialRepayment);
    const extra = parseNumber(annualExtraPayment);
    const manualRate = parseNumber(manualMonthlyPayment);
    const years = Math.max(1, Math.round(parseNumber(fixedYears)));
    const balloon = parseNumber(targetBalance);

    const rentAnnual = parseNumber(monthlyRentCold) * 12;
    const ownerCostsAnnual = (parseNumber(monthlyNonApportionableCosts) + parseNumber(monthlyReserve)) * 12;
    const depreciation = parseNumber(depreciationAnnual);
    const taxRate = parseNumber(personalTaxRate);

    const purchaseCosts = kp * (nkp / 100);
    const projectCost = kp + purchaseCosts + ren;
    const loan = Math.max(0, projectCost - eq);

    let monthlyRate = loan * ((z + t) / 100) / 12;
    if (manualRate > 0) monthlyRate = manualRate;

    const fullRepaymentMonths = calculateFullRepaymentMonths(loan, z, monthlyRate, extra);
    const fixedTermMonthlyPayment = calculateRequiredMonthlyPayment(loan, z, years, balloon);
    const effectiveMonthlyRate = scenarioMode === "fixed" ? fixedTermMonthlyPayment : monthlyRate;

    const preview = simulateYears({
      loanAmount: loan,
      annualRate: z,
      monthlyPayment: effectiveMonthlyRate,
      annualExtraPayment: extra,
      years,
      rentNetAnnual: rentAnnual,
      ownerCostsAnnual,
      depreciationAnnual: depreciation,
      taxRate,
    });

    const fixedTermPreview = simulateYears({
      loanAmount: loan,
      annualRate: z,
      monthlyPayment: fixedTermMonthlyPayment,
      annualExtraPayment: extra,
      years,
      rentNetAnnual: rentAnnual,
      ownerCostsAnnual,
      depreciationAnnual: depreciation,
      taxRate,
    });

    const taxableRentalYear1 = preview.rows[0]?.taxableRentalIncome ?? 0;
    const taxYear1 = preview.rows[0]?.taxOnRentalIncome ?? 0;

    return {
      purchaseCosts,
      projectCost,
      loan,
      monthlyRate,
      effectiveMonthlyRate,
      fullRepaymentMonths,
      fixedTermMonthlyPayment,
      years,
      balloon,
      rentAnnual,
      ownerCostsAnnual,
      depreciation,
      taxRate,
      taxableRentalYear1,
      taxYear1,
      annualExtraPaymentValue: extra,
      preview,
      fixedTermPreview,
    };
  }, [
    purchasePrice,
    purchaseCostsPercent,
    renovation,
    equity,
    annualRate,
    initialRepayment,
    annualExtraPayment,
    manualMonthlyPayment,
    fixedYears,
    targetBalance,
    monthlyRentCold,
    monthlyNonApportionableCosts,
    monthlyReserve,
    depreciationAnnual,
    personalTaxRate,
    scenarioMode,
  ]);

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    fontSize: 16,
  };

  const label: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
  };

  function handleFocus(setter: (v: string) => void) {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      if (e.target.value === "0") setter("");
    };
  }

  function handleBlur(setter: (v: string) => void) {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      const v = parseNumber(e.target.value);
      setter(formatNumber(v));
    };
  }

  const maxBalance = Math.max(...calc.preview.rows.map((r) => r.balance), 1);

  return (
    <main style={{ minHeight: "100vh", background: "#f3f4f6", padding: 20, fontFamily: "Arial" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Finanzierungsrechner</h1>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
          Du siehst sowohl die vollständige Laufzeit bis zur kompletten Tilgung als auch eine Vorschau für z. B. 10 Jahre mit optionaler offener Restschuld.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginTop: 20 }}>
          <div style={card}>
            <h2>Objekt</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Kaufpreis</label>
              <input style={input} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} onFocus={handleFocus(setPurchasePrice)} onBlur={handleBlur(setPurchasePrice)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nebenkosten %</label>
              <input style={input} value={purchaseCostsPercent} onChange={(e) => setPurchaseCostsPercent(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Renovierung</label>
              <input style={input} value={renovation} onChange={(e) => setRenovation(e.target.value)} onFocus={handleFocus(setRenovation)} onBlur={handleBlur(setRenovation)} />
            </div>
            <div>
              <label style={label}>Eigenkapital</label>
              <input style={input} value={equity} onChange={(e) => setEquity(e.target.value)} onFocus={handleFocus(setEquity)} onBlur={handleBlur(setEquity)} />
            </div>
          </div>

          <div style={card}>
            <h2>Finanzierung</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Zins %</label>
              <input style={input} value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Tilgung %</label>
              <input style={input} value={initialRepayment} onChange={(e) => setInitialRepayment(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Sondertilgung p.a.</label>
              <input style={input} value={annualExtraPayment} onChange={(e) => setAnnualExtraPayment(e.target.value)} onFocus={handleFocus(setAnnualExtraPayment)} onBlur={handleBlur(setAnnualExtraPayment)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Optionale manuelle Monatsrate</label>
              <input style={input} value={manualMonthlyPayment} onChange={(e) => setManualMonthlyPayment(e.target.value)} onFocus={handleFocus(setManualMonthlyPayment)} onBlur={handleBlur(setManualMonthlyPayment)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Szenario</label>
              <select style={input} value={scenarioMode} onChange={(e) => setScenarioMode(e.target.value as "full" | "fixed")}>
                <option value="full">Volltilgung berechnen</option>
                <option value="fixed">Feste Dauer mit Restschuld</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Vorgabedauer in Jahren</label>
              <input style={input} value={fixedYears} onChange={(e) => setFixedYears(e.target.value)} />
            </div>
            <div>
              <label style={label}>Gewünschte offene Restschuld / Schlussrate</label>
              <input style={input} value={targetBalance} onChange={(e) => setTargetBalance(e.target.value)} onFocus={handleFocus(setTargetBalance)} onBlur={handleBlur(setTargetBalance)} />
            </div>
          </div>

          <div style={card}>
            <h2>Miete & Steuer</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Kaltmiete pro Monat</label>
              <input style={input} value={monthlyRentCold} onChange={(e) => setMonthlyRentCold(e.target.value)} onFocus={handleFocus(setMonthlyRentCold)} onBlur={handleBlur(setMonthlyRentCold)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nicht umlagefähige Kosten pro Monat</label>
              <input style={input} value={monthlyNonApportionableCosts} onChange={(e) => setMonthlyNonApportionableCosts(e.target.value)} onFocus={handleFocus(setMonthlyNonApportionableCosts)} onBlur={handleBlur(setMonthlyNonApportionableCosts)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Rücklage pro Monat</label>
              <input style={input} value={monthlyReserve} onChange={(e) => setMonthlyReserve(e.target.value)} onFocus={handleFocus(setMonthlyReserve)} onBlur={handleBlur(setMonthlyReserve)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Abschreibung / AfA pro Jahr</label>
              <input style={input} value={depreciationAnnual} onChange={(e) => setDepreciationAnnual(e.target.value)} onFocus={handleFocus(setDepreciationAnnual)} onBlur={handleBlur(setDepreciationAnnual)} />
            </div>
            <div>
              <label style={label}>Persönlicher Steuersatz %</label>
              <input style={input} value={personalTaxRate} onChange={(e) => setPersonalTaxRate(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginTop: 20 }}>
          <div style={card}><div style={{ color: "#6b7280" }}>Gesamtprojektkosten</div><div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.projectCost)}</div></div>
          <div style={card}><div style={{ color: "#6b7280" }}>Darlehen</div><div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.loan)}</div></div>
          <div style={card}><div style={{ color: "#6b7280" }}>Monatsrate aktuell</div><div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.effectiveMonthlyRate)}</div><div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{scenarioMode === "fixed" ? "aus fester Dauer berechnet" : "aus Zins + Tilgung"}</div></div>
          <div style={card}><div style={{ color: "#6b7280" }}>Gesamtlaufzeit bis 0 € Restschuld</div><div style={{ fontSize: 26, fontWeight: 700 }}>{yearsMonths(calc.fullRepaymentMonths)}</div></div>
          <div style={card}><div style={{ color: "#6b7280" }}>Rate für {calc.years} Jahre</div><div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.fixedTermMonthlyPayment)}</div><div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>mit Restschuld {euro(calc.balloon)}</div></div>
          <div style={card}><div style={{ color: "#6b7280" }}>Steuerpflichtige Mieteinnahmen Jahr 1</div><div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.taxableRentalYear1)}</div></div>
          <div style={card}><div style={{ color: "#6b7280" }}>Steuer auf Mieteinnahmen Jahr 1</div><div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.taxYear1)}</div></div>
          <div style={card}><div style={{ color: "#6b7280" }}>Nettomietrendite</div><div style={{ fontSize: 26, fontWeight: 700 }}>{percent(calc.preview.rows.length ? ((calc.rentAnnual - calc.ownerCostsAnnual) / calc.projectCost) * 100 : 0)}</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginTop: 20 }}>
          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Restschuldverlauf für die aktuelle Monatsrate</h2>
            <div style={{ display: "flex", alignItems: "end", gap: 6, height: 220, overflowX: "auto", paddingTop: 10 }}>
              {calc.preview.rows.map((r) => (
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
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Interpretation</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div><strong>Modus Volltilgung:</strong> Dann ist für dich die relevante Kennzahl die vollständige Laufzeit bis 0 € Restschuld.</div>
              <div><strong>Modus feste Dauer:</strong> Dann zeigt dir der Rechner, welche Rate nötig ist, um nach 10 Jahren genau die gewünschte Restschuld offen zu lassen.</div>
              <div><strong>Zu versteuern:</strong> Vereinfacht = Netto-Mieteinnahmen minus nicht umlagefähige Kosten minus Zinsen minus AfA.</div>
              <div><strong>Nicht enthalten:</strong> Leerstand wurde auf Wunsch entfernt.</div>
              <div><strong>Aktives Szenario:</strong> {scenarioMode === "fixed" ? "Feste Dauer mit Restschuld" : "Volltilgung"}</div>
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>Tilgungsplan für die aktuelle Monatsrate</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#e5e7eb" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Jahr</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Rate</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Zinsen</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Tilgung</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Sondertilgung</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Zu versteuern</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Steuer</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Cashflow n. Steuer</th>
                  <th style={{ padding: 10, textAlign: "right" }}>Restschuld</th>
                </tr>
              </thead>
              <tbody>
                {calc.preview.rows.map((r) => (
                  <tr key={r.year} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 10 }}>{r.year}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.payment)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.interest)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.principal)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.extra)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.taxableRentalIncome)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.taxOnRentalIncome)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.cashflowAfterTax)}</td>
                    <td style={{ padding: 10, textAlign: "right" }}>{euro(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
