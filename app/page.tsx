"use client";

import React, { useMemo, useState } from "react";

type YearRow = {
  year: number;
  payment: number;
  interest: number;
  principal: number;
  extra: number;
  rentalIncome: number;
  ownerCosts: number;
  cashflow: number;
  balance: number;
};

function parseDeNumber(input: string): number {
  if (!input || input.trim() === "") return 0;
  const cleaned = input.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function formatMoneyInput(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function euro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} %`;
}

function yearsAndMonths(totalMonths: number): string {
  if (!Number.isFinite(totalMonths)) return "nicht tilgbar";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years} J ${months} M`;
}

function MoneyField({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.,]/g, "");
          setValue(raw);
        }}
        onFocus={() => {
          if (value === "0") setValue("");
        }}
        onBlur={() => {
          const parsed = parseDeNumber(value);
          setValue(parsed === 0 ? "0" : formatMoneyInput(parsed));
        }}
      />
    </div>
  );
}

function PercentField({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.,]/g, "");
          setValue(raw);
        }}
        onFocus={() => {
          if (value === "0" || value === "0,0" || value === "0,00") setValue("");
        }}
      />
    </div>
  );
}

function IntField({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, "");
          setValue(raw);
        }}
        onFocus={() => {
          if (value === "0") setValue("");
        }}
        onBlur={() => {
          const parsed = parseDeNumber(value);
          setValue(String(Math.max(1, Math.round(parsed))));
        }}
      />
    </div>
  );
}

function calculateRequiredMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  years: number,
  balloonPayment: number
): number {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;
  const targetRemaining = Math.max(0, balloonPayment);

  if (loanAmount <= 0) return 0;

  if (monthlyRate === 0) {
    return Math.max(0, (loanAmount - targetRemaining) / months);
  }

  const factor = Math.pow(1 + monthlyRate, months);
  return ((loanAmount * factor - targetRemaining) * monthlyRate) / (factor - 1);
}

function simulateLoan({
  loanAmount,
  annualRate,
  monthlyPayment,
  annualExtraPayment,
  fixedYears,
  balloonPayment,
  annualRentalIncome,
  annualOwnerCosts,
}: {
  loanAmount: number;
  annualRate: number;
  monthlyPayment: number;
  annualExtraPayment: number;
  fixedYears: number;
  balloonPayment: number;
  annualRentalIncome: number;
  annualOwnerCosts: number;
}) {
  const monthlyRate = annualRate / 100 / 12;
  const maxMonths = Math.max(1, Math.round(fixedYears * 12));
  let balance = Math.max(0, loanAmount);
  let totalInterest = 0;
  let totalPayment = 0;
  let totalExtra = 0;
  const yearlyRows: YearRow[] = [];

  if (loanAmount <= 0) {
    return {
      yearlyRows,
      months: 0,
      totalInterest: 0,
      totalPayment: 0,
      totalExtra: 0,
      remainingBalance: 0,
    };
  }

  let currentYear: YearRow = {
    year: 1,
    payment: 0,
    interest: 0,
    principal: 0,
    extra: 0,
    rentalIncome: annualRentalIncome,
    ownerCosts: annualOwnerCosts,
    cashflow: 0,
    balance,
  };

  for (let month = 1; month <= maxMonths; month += 1) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
    let principal = monthlyPayment - interest;

    if (principal < 0) principal = 0;
    if (principal > balance) principal = balance;

    const payment = interest + principal;
    balance -= principal;

    let extra = 0;
    if (annualExtraPayment > 0 && month % 12 === 0 && balance > balloonPayment) {
      extra = Math.min(annualExtraPayment, Math.max(0, balance - balloonPayment));
      balance -= extra;
    }

    totalInterest += interest;
    totalPayment += payment + extra;
    totalExtra += extra;

    currentYear.payment += payment;
    currentYear.interest += interest;
    currentYear.principal += principal;
    currentYear.extra += extra;
    currentYear.balance = Math.max(0, balance);

    const atYearEnd = month % 12 === 0 || month === maxMonths;
    if (atYearEnd) {
      currentYear.cashflow =
        currentYear.rentalIncome -
        currentYear.ownerCosts -
        currentYear.payment -
        currentYear.extra;

      yearlyRows.push({ ...currentYear });

      currentYear = {
        year: currentYear.year + 1,
        payment: 0,
        interest: 0,
        principal: 0,
        extra: 0,
        rentalIncome: annualRentalIncome,
        ownerCosts: annualOwnerCosts,
        cashflow: 0,
        balance: Math.max(0, balance),
      };
    }
  }

  return {
    yearlyRows,
    months: maxMonths,
    totalInterest,
    totalPayment,
    totalExtra,
    remainingBalance: Math.max(0, balance),
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: 1400,
    margin: "0 auto",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    boxSizing: "border-box",
    fontSize: 16,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
  },
  tableCell: {
    padding: 10,
    borderTop: "1px solid #e5e7eb",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
};

export default function Page() {
  const [purchasePrice, setPurchasePrice] = useState("320.000");
  const [purchaseCostsPercent, setPurchaseCostsPercent] = useState("10");
  const [renovation, setRenovation] = useState("15.000");
  const [equity, setEquity] = useState("70.000");

  const [annualRate, setAnnualRate] = useState("4");
  const [initialRepayment, setInitialRepayment] = useState("1,5");
  const [annualExtraPayment, setAnnualExtraPayment] = useState("0");

  const [mode, setMode] = useState<"annuity" | "fixed-term">("annuity");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState("");
  const [fixedYears, setFixedYears] = useState("10");
  const [balloonPayment, setBalloonPayment] = useState("0");

  const [monthlyRentCold, setMonthlyRentCold] = useState("1.150");
  const [monthlyNonApportionableCosts, setMonthlyNonApportionableCosts] = useState("85");
  const [monthlyReserve, setMonthlyReserve] = useState("45");
  const [vacancyPercent, setVacancyPercent] = useState("2");

  const result = useMemo(() => {
    const kp = parseDeNumber(purchasePrice);
    const nkp = parseDeNumber(purchaseCostsPercent);
    const ren = parseDeNumber(renovation);
    const eq = parseDeNumber(equity);
    const zins = parseDeNumber(annualRate);
    const tilgung = parseDeNumber(initialRepayment);
    const sonder = parseDeNumber(annualExtraPayment);
    const manualRate = parseDeNumber(manualMonthlyPayment);
    const years = Math.max(1, parseDeNumber(fixedYears));
    const balloon = parseDeNumber(balloonPayment);

    const rentMonth = parseDeNumber(monthlyRentCold);
    const nonAllocMonth = parseDeNumber(monthlyNonApportionableCosts);
    const reserveMonth = parseDeNumber(monthlyReserve);
    const vacancy = parseDeNumber(vacancyPercent);

    const purchaseCosts = kp * (nkp / 100);
    const projectCost = kp + purchaseCosts + ren;
    const loanAmount = Math.max(0, projectCost - eq);

    const annualColdRent = rentMonth * 12;
    const annualVacancyLoss = annualColdRent * (vacancy / 100);
    const annualNetRent = annualColdRent - annualVacancyLoss;
    const annualOwnerCosts = nonAllocMonth * 12 + reserveMonth * 12;

    let monthlyPayment = 0;
    if (mode === "annuity") {
      monthlyPayment = loanAmount * ((zins + tilgung) / 100) / 12;
      if (manualRate > 0) monthlyPayment = manualRate;
    } else {
      monthlyPayment = calculateRequiredMonthlyPayment(
        loanAmount,
        zins,
        years,
        balloon
      );
    }

    const simulation = simulateLoan({
      loanAmount,
      annualRate: zins,
      monthlyPayment,
      annualExtraPayment: sonder,
      fixedYears: years,
      balloonPayment: balloon,
      annualRentalIncome: annualNetRent,
      annualOwnerCosts,
    });

    const annualDebtService = monthlyPayment * 12 + sonder;
    const cashflowBeforeTax = annualNetRent - annualOwnerCosts - annualDebtService;
    const grossYield = kp > 0 ? (annualColdRent / kp) * 100 : 0;
    const netYield =
      projectCost > 0
        ? ((annualNetRent - annualOwnerCosts) / projectCost) * 100
        : 0;
    const equityRatio = projectCost > 0 ? (eq / projectCost) * 100 : 0;

    return {
      purchaseCosts,
      projectCost,
      loanAmount,
      monthlyPayment,
      annualColdRent,
      annualNetRent,
      annualOwnerCosts,
      annualDebtService,
      annualVacancyLoss,
      cashflowBeforeTax,
      grossYield,
      netYield,
      equityRatio,
      fixedYearsNumeric: years,
      balloon,
      ...simulation,
    };
  }, [
    purchasePrice,
    purchaseCostsPercent,
    renovation,
    equity,
    annualRate,
    initialRepayment,
    annualExtraPayment,
    mode,
    manualMonthlyPayment,
    fixedYears,
    balloonPayment,
    monthlyRentCold,
    monthlyNonApportionableCosts,
    monthlyReserve,
    vacancyPercent,
  ]);

  const maxBalance = Math.max(...result.yearlyRows.map((r) => r.balance), 1);

  const summaryCard = (title: string, value: string, sub?: string) => (
    <div style={styles.card}>
      <div style={{ color: "#6b7280", fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {sub ? <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>
          Immobilien- & Finanzierungsrechner
        </h1>
        <p style={{ color: "#4b5563", marginBottom: 24 }}>
          Mit Dauer des Darlehens, offener Schlussrate, Mieteinnahmen, Cashflow und Tilgungsplan.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            marginBottom: 20,
          }}
        >
          <div style={styles.card}>
            <h2>Objekt</h2>
            <MoneyField label="Kaufpreis (€)" value={purchasePrice} setValue={setPurchasePrice} />
            <PercentField
              label="Kaufnebenkosten (%)"
              value={purchaseCostsPercent}
              setValue={setPurchaseCostsPercent}
            />
            <MoneyField label="Renovierung (€)" value={renovation} setValue={setRenovation} />
            <MoneyField label="Eigenkapital (€)" value={equity} setValue={setEquity} />
          </div>

          <div style={styles.card}>
            <h2>Finanzierung</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={styles.label}>Berechnungsart</label>
              <select
                style={styles.input}
                value={mode}
                onChange={(e) => setMode(e.target.value as "annuity" | "fixed-term")}
              >
                <option value="annuity">Annuität aus Zins + Tilgung</option>
                <option value="fixed-term">
                  Feste Darlehensdauer mit optionaler Schlussrate
                </option>
              </select>
            </div>

            <PercentField label="Zins p.a. (%)" value={annualRate} setValue={setAnnualRate} />
            <PercentField
              label="Tilgung p.a. (%)"
              value={initialRepayment}
              setValue={setInitialRepayment}
            />
            <MoneyField
              label="Sondertilgung pro Jahr (€)"
              value={annualExtraPayment}
              setValue={setAnnualExtraPayment}
            />
            <IntField
              label="Dauer des Darlehens (Jahre)"
              value={fixedYears}
              setValue={setFixedYears}
            />
            <MoneyField
              label="Offene Schlussrate / Restschuld (€)"
              value={balloonPayment}
              setValue={setBalloonPayment}
            />

            {mode === "annuity" ? (
              <MoneyField
                label="Optionale manuelle Monatsrate (€)"
                value={manualMonthlyPayment}
                setValue={setManualMonthlyPayment}
              />
            ) : null}
          </div>

          <div style={styles.card}>
            <h2>Mieteinnahmen</h2>
            <MoneyField
              label="Kaltmiete pro Monat (€)"
              value={monthlyRentCold}
              setValue={setMonthlyRentCold}
            />
            <MoneyField
              label="Nicht umlagefähige Kosten pro Monat (€)"
              value={monthlyNonApportionableCosts}
              setValue={setMonthlyNonApportionableCosts}
            />
            <MoneyField
              label="Rücklage pro Monat (€)"
              value={monthlyReserve}
              setValue={setMonthlyReserve}
            />
            <PercentField
              label="Leerstand (%)"
              value={vacancyPercent}
              setValue={setVacancyPercent}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {summaryCard("Gesamtprojektkosten", euro(result.projectCost))}
          {summaryCard("Darlehenssumme", euro(result.loanAmount))}
          {summaryCard("Monatsrate", euro(result.monthlyPayment))}
          {summaryCard(
            "Dauer des Darlehens",
            yearsAndMonths(result.months),
            `${result.fixedYearsNumeric} Jahre eingestellt`
          )}
          {summaryCard(
            "Schlussrate / Restschuld",
            euro(result.remainingBalance),
            result.balloon > 0
              ? `Ziel-Schlussrate ${euro(result.balloon)}`
              : "vollständige Tilgung angestrebt"
          )}
          {summaryCard("Gesamtzins bis Laufzeitende", euro(result.totalInterest))}
          {summaryCard(
            "Mieteinnahmen netto p.a.",
            euro(result.annualNetRent),
            `${euro(result.annualVacancyLoss)} Leerstand`
          )}
          {summaryCard(
            "Cashflow vor Steuer p.a.",
            euro(result.cashflowBeforeTax),
            `Belastung p.a. ${euro(result.annualDebtService)}`
          )}
          {summaryCard("Bruttomietrendite", percent(result.grossYield))}
          {summaryCard("Nettomietrendite", percent(result.netYield))}
          {summaryCard("Eigenkapitalquote", percent(result.equityRatio))}
          {summaryCard("Sondertilgung gesamt", euro(result.totalExtra))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 20,
            marginBottom: 20,
          }}
        >
          <div style={styles.card}>
            <h2 style={{ marginTop: 0 }}>Restschuldverlauf</h2>
            <div
              style={{
                display: "flex",
                alignItems: "end",
                gap: 6,
                height: 230,
                overflowX: "auto",
                paddingTop: 10,
              }}
            >
              {result.yearlyRows.map((row) => (
                <div key={row.year} style={{ minWidth: 28, textAlign: "center" }}>
                  <div
                    title={`Jahr ${row.year}: ${euro(row.balance)}`}
                    style={{
                      height: `${Math.max(6, (row.balance / maxBalance) * 185)}px`,
                      background: "#1f2937",
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{row.year}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={{ marginTop: 0 }}>Übersicht Jahr 1</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <strong>Kaufnebenkosten:</strong> {euro(result.purchaseCosts)}
              </div>
              <div>
                <strong>Netto-Mieteinnahmen p.a.:</strong> {euro(result.annualNetRent)}
              </div>
              <div>
                <strong>Eigentümerkosten p.a.:</strong> {euro(result.annualOwnerCosts)}
              </div>
              <div>
                <strong>Schuldendienst p.a.:</strong> {euro(result.annualDebtService)}
              </div>
              <div>
                <strong>Restschuld nach Jahr 1:</strong>{" "}
                {result.yearlyRows[0] ? euro(result.yearlyRows[0].balance) : euro(0)}
              </div>
              <div>
                <strong>Cashflow Jahr 1:</strong>{" "}
                {result.yearlyRows[0] ? euro(result.yearlyRows[0].cashflow) : euro(0)}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={{ marginTop: 0 }}>Tilgungsplan</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#e5e7eb" }}>
                  <th style={{ ...styles.tableCell, textAlign: "left", borderTop: "none" }}>
                    Jahr
                  </th>
                  <th style={{ ...styles.tableCell, borderTop: "none" }}>Rate</th>
                  <th style={{ ...styles.tableCell, borderTop: "none" }}>Zinsen</th>
                  <th style={{ ...styles.tableCell, borderTop: "none" }}>Tilgung</th>
                  <th style={{ ...styles.tableCell, borderTop: "none" }}>Sondertilgung</th>
                  <th style={{ ...styles.tableCell, borderTop: "none" }}>Miete netto</th>
                  <th style={{ ...styles.tableCell, borderTop: "none" }}>Cashflow</th>
                  <th style={{ ...styles.tableCell, borderTop: "none" }}>Restschuld</th>
                </tr>
              </thead>
              <tbody>
                {result.yearlyRows.map((row) => (
                  <tr key={row.year}>
                    <td style={{ ...styles.tableCell, textAlign: "left" }}>{row.year}</td>
                    <td style={styles.tableCell}>{euro(row.payment)}</td>
                    <td style={styles.tableCell}>{euro(row.interest)}</td>
                    <td style={styles.tableCell}>{euro(row.principal)}</td>
                    <td style={styles.tableCell}>{euro(row.extra)}</td>
                    <td style={styles.tableCell}>{euro(row.rentalIncome)}</td>
                    <td style={styles.tableCell}>{euro(row.cashflow)}</td>
                    <td style={styles.tableCell}>{euro(row.balance)}</td>
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
