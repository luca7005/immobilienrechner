"use client";

import React, { useMemo, useState } from "react";

type YearRow = {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  taxableRentalIncome: number;
  taxOnRentalIncome: number;
  cashflowAfterTax: number;
  balance: number;
};

function parseNumber(v: string): number {
  if (!v || v.trim() === "") return 0;
  const cleaned = v.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function euro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number): string {
  return (
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + " %"
  );
}

function yearsMonths(totalMonths: number): string {
  if (!Number.isFinite(totalMonths)) return "nicht tilgbar";
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return `${y} J ${m} M`;
}

function calculateFullRepaymentMonths(
  loanAmount: number,
  annualRate: number,
  monthlyPayment: number,
  annualExtraPayment: number
): number {
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
  rentAnnual: number;
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
    rentAnnual,
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

    const taxableRentalIncome =
      rentAnnual - ownerCostsAnnual - interestYear - depreciationAnnual;

    const taxOnRentalIncome =
      taxableRentalIncome > 0 ? taxableRentalIncome * (taxRate / 100) : 0;

    const cashflowAfterTax =
      rentAnnual - ownerCostsAnnual - paymentYear - extraYear - taxOnRentalIncome;

    rows.push({
      year,
      payment: paymentYear,
      interest: interestYear,
      principal: principalYear,
      extra: extraYear,
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
  const [scenarioMode, setScenarioMode] = useState<"full" | "fixed">("full");

  const [purchasePrice, setPurchasePrice] = useState("320.000");
  const [purchaseCostsPercent, setPurchaseCostsPercent] = useState("10");
  const [renovation, setRenovation] = useState("15.000");
  const [equity, setEquity] = useState("70.000");

  const [annualRate, setAnnualRate] = useState("4");
  const [initialRepayment, setInitialRepayment] = useState("1,5");
  const [annualExtraPayment, setAnnualExtraPayment] = useState("0");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState("");

  const [fixedYears, setFixedYears] = useState("10");

  const [monthlyRentCold, setMonthlyRentCold] = useState("1.150");
  const [monthlyNonApportionableCosts, setMonthlyNonApportionableCosts] =
    useState("85");
  const [monthlyReserve, setMonthlyReserve] = useState("45");

  const [buildingSharePercent, setBuildingSharePercent] = useState("80");
  const [afaPercent, setAfaPercent] = useState("2");
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

    const rentAnnual = parseNumber(monthlyRentCold) * 12;
    const ownerCostsAnnual =
      (parseNumber(monthlyNonApportionableCosts) + parseNumber(monthlyReserve)) *
      12;

    const buildingShare = parseNumber(buildingSharePercent);
    const afaRate = parseNumber(afaPercent);
    const taxRate = parseNumber(personalTaxRate);

    const purchaseCosts = kp * (nkp / 100);
    const projectCost = kp + purchaseCosts + ren;
    const loan = Math.max(0, projectCost - eq);

    let monthlyRate = loan * ((z + t) / 100) / 12;
    if (manualRate > 0) monthlyRate = manualRate;

    const fullRepaymentMonths = calculateFullRepaymentMonths(
      loan,
      z,
      monthlyRate,
      extra
    );

    const buildingValue = kp * (buildingShare / 100);
    const depreciationAnnual = buildingValue * (afaRate / 100);

    const preview = simulateYears({
      loanAmount: loan,
      annualRate: z,
      monthlyPayment: monthlyRate,
      annualExtraPayment: extra,
      years,
      rentAnnual,
      ownerCostsAnnual,
      depreciationAnnual,
      taxRate,
    });

    const taxableRentalYear1 = preview.rows[0]?.taxableRentalIncome ?? 0;
    const taxYear1 = preview.rows[0]?.taxOnRentalIncome ?? 0;
    const cashflowYear1 = preview.rows[0]?.cashflowAfterTax ?? 0;

    const grossYield = kp > 0 ? (rentAnnual / kp) * 100 : 0;
    const netYield =
      projectCost > 0 ? ((rentAnnual - ownerCostsAnnual) / projectCost) * 100 : 0;

    return {
      purchaseCosts,
      projectCost,
      loan,
      monthlyRate,
      fullRepaymentMonths,
      years,
      rentAnnual,
      ownerCostsAnnual,
      depreciationAnnual,
      taxableRentalYear1,
      taxYear1,
      cashflowYear1,
      grossYield,
      netYield,
      buildingValue,
      preview,
      extra,
      scenarioMode,
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
    monthlyRentCold,
    monthlyNonApportionableCosts,
    monthlyReserve,
    buildingSharePercent,
    afaPercent,
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
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: 20,
        fontFamily: "Arial",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>Finanzierungsrechner</h1>
        <p style={{ color: "#6b7280", marginBottom: 20 }}>
          Volltilgung oder feste Dauer mit Anzeige der Restschuld nach z. B. 10 Jahren.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            marginTop: 20,
          }}
        >
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
              <label style={label}>Szenario</label>
              <select
                style={input}
                value={scenarioMode}
                onChange={(e) =>
                  setScenarioMode(e.target.value as "full" | "fixed")
                }
              >
                <option value="full">Volltilgung berechnen</option>
                <option value="fixed">Restschuld nach fester Dauer anzeigen</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Zins %</label>
              <input
                style={input}
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Tilgung %</label>
              <input
                style={input}
                value={initialRepayment}
                onChange={(e) => setInitialRepayment(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Sondertilgung p.a.</label>
              <input
                style={input}
                value={annualExtraPayment}
                onChange={(e) => setAnnualExtraPayment(e.target.value)}
                onFocus={handleFocus(setAnnualExtraPayment)}
                onBlur={handleBlur(setAnnualExtraPayment)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Optionale manuelle Monatsrate</label>
              <input
                style={input}
                value={manualMonthlyPayment}
                onChange={(e) => setManualMonthlyPayment(e.target.value)}
                onFocus={handleFocus(setManualMonthlyPayment)}
                onBlur={handleBlur(setManualMonthlyPayment)}
              />
            </div>

            <div>
              <label style={label}>Betrachtungsdauer in Jahren</label>
              <input
                style={input}
                value={fixedYears}
                onChange={(e) => setFixedYears(e.target.value)}
              />
            </div>
          </div>

          <div style={card}>
            <h2>Miete & Steuer</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Kaltmiete pro Monat</label>
              <input
                style={input}
                value={monthlyRentCold}
                onChange={(e) => setMonthlyRentCold(e.target.value)}
                onFocus={handleFocus(setMonthlyRentCold)}
                onBlur={handleBlur(setMonthlyRentCold)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Nicht umlagefähige Kosten pro Monat</label>
              <input
                style={input}
                value={monthlyNonApportionableCosts}
                onChange={(e) =>
                  setMonthlyNonApportionableCosts(e.target.value)
                }
                onFocus={handleFocus(setMonthlyNonApportionableCosts)}
                onBlur={handleBlur(setMonthlyNonApportionableCosts)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Rücklage pro Monat</label>
              <input
                style={input}
                value={monthlyReserve}
                onChange={(e) => setMonthlyReserve(e.target.value)}
                onFocus={handleFocus(setMonthlyReserve)}
                onBlur={handleBlur(setMonthlyReserve)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>Gebäudeanteil %</label>
              <input
                style={input}
                value={buildingSharePercent}
                onChange={(e) => setBuildingSharePercent(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={label}>AfA %</label>
              <input
                style={input}
                value={afaPercent}
                onChange={(e) => setAfaPercent(e.target.value)}
              />
            </div>

            <div>
              <label style={label}>Persönlicher Steuersatz %</label>
              <input
                style={input}
                value={personalTaxRate}
                onChange={(e) => setPersonalTaxRate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginTop: 20,
          }}
        >
          <div style={card}>
            <div style={{ color: "#6b7280" }}>Gesamtprojektkosten</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.projectCost)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Darlehen</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{euro(calc.loan)}</div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Monatsrate aktuell</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.monthlyRate)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Gesamtlaufzeit bis 0 € Restschuld</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {yearsMonths(calc.fullRepaymentMonths)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>
              Restschuld nach {calc.years} Jahren
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.preview.remainingBalance)}
            </div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
              bei aktueller Monatsrate
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Steuerpflichtige Mieteinnahmen Jahr 1</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.taxableRentalYear1)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Steuer auf Vermietung Jahr 1</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.taxYear1)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Cashflow nach Steuer Jahr 1</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.cashflowYear1)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>AfA pro Jahr</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.depreciationAnnual)}
            </div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
              {percent(parseNumber(afaPercent))} auf {percent(parseNumber(buildingSharePercent))} Gebäudeanteil
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Bruttomietrendite</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {percent(calc.grossYield)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Nettomietrendite</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {percent(calc.netYield)}
            </div>
          </div>

          <div style={card}>
            <div style={{ color: "#6b7280" }}>Gebäudewert pauschal</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              {euro(calc.buildingValue)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 20,
            marginTop: 20,
          }}
        >
          <div style={card}>
            <h2 style={{ marginTop: 0 }}>Restschuldverlauf</h2>
            <div
              style={{
                display: "flex",
                alignItems: "end",
                gap: 6,
                height: 220,
                overflowX: "auto",
                paddingTop: 10,
              }}
            >
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
            <h2 style={{ marginTop: 0 }}>Was du eintragen solltest</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <strong>AfA %:</strong> Standardmäßig 2
              </div>
              <div>
                <strong>Gebäudeanteil %:</strong> pauschal 80
              </div>
              <div>
                <strong>Persönlicher Steuersatz %:</strong> pauschal 35
              </div>
              <div>
                <strong>Restschuld nach 10 Jahren:</strong> zeigt dir, was bei deiner
                aktuellen Rate nach 10 Jahren noch offen ist
              </div>
              <div>
                <strong>Gesamtlaufzeit:</strong> zeigt dir separat, wie lange es bis zur
                vollständigen Tilgung dauert
              </div>
            </div>
          </div>
        </div>

        <div style={{ ...card, marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>Tilgungsplan</h2>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
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
                    <td style={{ padding: 10, textAlign: "right" }}>
                      {euro(r.taxableRentalIncome)}
                    </td>
                    <td style={{ padding: 10, textAlign: "right" }}>
                      {euro(r.taxOnRentalIncome)}
                    </td>
                    <td style={{ padding: 10, textAlign: "right" }}>
                      {euro(r.cashflowAfterTax)}
                    </td>
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
