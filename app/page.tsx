"use client";

import { useMemo, useState } from "react";

function euro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(2)} %`;
}

export default function Page() {
  const [kaufpreis, setKaufpreis] = useState(320000);
  const [nebenkostenProzent, setNebenkostenProzent] = useState(10);
  const [renovierung, setRenovierung] = useState(15000);
  const [eigenkapital, setEigenkapital] = useState(70000);
  const [zins, setZins] = useState(3.8);
  const [tilgung, setTilgung] = useState(2.0);

  const [kaltmieteMonat, setKaltmieteMonat] = useState(1150);
  const [nichtUmlagefaehigMonat, setNichtUmlagefaehigMonat] = useState(85);
  const [ruecklageMonat, setRuecklageMonat] = useState(45);
  const [leerstandProzent, setLeerstandProzent] = useState(2);

  const calc = useMemo(() => {
    const nebenkosten = kaufpreis * (nebenkostenProzent / 100);
    const gesamtProjektkosten = kaufpreis + nebenkosten + renovierung;
    const darlehen = Math.max(0, gesamtProjektkosten - eigenkapital);

    const monatlicheRate = darlehen * ((zins + tilgung) / 100) / 12;

    const jahresKaltmiete = kaltmieteMonat * 12;
    const leerstandAbzug = jahresKaltmiete * (leerstandProzent / 100);
    const nettoMieteNachLeerstand = jahresKaltmiete - leerstandAbzug;

    const eigentuemerKostenJahr =
      nichtUmlagefaehigMonat * 12 + ruecklageMonat * 12;

    const jahresRate = monatlicheRate * 12;
    const cashflowVorSteuer =
      nettoMieteNachLeerstand - eigentuemerKostenJahr - jahresRate;

    const bruttoRendite =
      kaufpreis > 0 ? (jahresKaltmiete / kaufpreis) * 100 : 0;

    const nettoRendite =
      gesamtProjektkosten > 0
        ? ((nettoMieteNachLeerstand - eigentuemerKostenJahr) /
            gesamtProjektkosten) *
          100
        : 0;

    const eigenkapitalQuote =
      gesamtProjektkosten > 0 ? (eigenkapital / gesamtProjektkosten) * 100 : 0;

    return {
      nebenkosten,
      gesamtProjektkosten,
      darlehen,
      monatlicheRate,
      jahresRate,
      jahresKaltmiete,
      nettoMieteNachLeerstand,
      eigentuemerKostenJahr,
      cashflowVorSteuer,
      bruttoRendite,
      nettoRendite,
      eigenkapitalQuote,
    };
  }, [
    kaufpreis,
    nebenkostenProzent,
    renovierung,
    eigenkapital,
    zins,
    tilgung,
    kaltmieteMonat,
    nichtUmlagefaehigMonat,
    ruecklageMonat,
    leerstandProzent,
  ]);

  const cardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 16,
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 34, marginBottom: 8 }}>
          Immobilien- & Baufinanzierungsrechner
        </h1>
        <p style={{ color: "#4b5563", marginBottom: 24 }}>
          Für Kauf, Finanzierung und Vermietung.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
            marginBottom: 20,
          }}
        >
          <div style={cardStyle}>
            <h2>Objekt & Finanzierung</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Kaufpreis (€)</label>
              <input
                style={inputStyle}
                type="number"
                value={kaufpreis}
                onChange={(e) => setKaufpreis(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Kaufnebenkosten (%)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.1"
                value={nebenkostenProzent}
                onChange={(e) => setNebenkostenProzent(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Renovierung (€)</label>
              <input
                style={inputStyle}
                type="number"
                value={renovierung}
                onChange={(e) => setRenovierung(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Eigenkapital (€)</label>
              <input
                style={inputStyle}
                type="number"
                value={eigenkapital}
                onChange={(e) => setEigenkapital(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Zins p.a. (%)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={zins}
                onChange={(e) => setZins(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={labelStyle}>Anfängliche Tilgung p.a. (%)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={tilgung}
                onChange={(e) => setTilgung(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={cardStyle}>
            <h2>Vermietung</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Kaltmiete pro Monat (€)</label>
              <input
                style={inputStyle}
                type="number"
                value={kaltmieteMonat}
                onChange={(e) => setKaltmieteMonat(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Nicht umlagefähige Kosten pro Monat (€)
              </label>
              <input
                style={inputStyle}
                type="number"
                value={nichtUmlagefaehigMonat}
                onChange={(e) =>
                  setNichtUmlagefaehigMonat(Number(e.target.value))
                }
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Rücklage pro Monat (€)</label>
              <input
                style={inputStyle}
                type="number"
                value={ruecklageMonat}
                onChange={(e) => setRuecklageMonat(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={labelStyle}>Leerstand (%)</label>
              <input
                style={inputStyle}
                type="number"
                step="0.1"
                value={leerstandProzent}
                onChange={(e) => setLeerstandProzent(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Gesamtprojektkosten</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {euro(calc.gesamtProjektkosten)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Darlehenssumme</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {euro(calc.darlehen)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Monatliche Rate</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {euro(calc.monatlicheRate)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Eigenkapitalquote</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {percent(calc.eigenkapitalQuote)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Bruttomietrendite</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {percent(calc.bruttoRendite)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Nettomietrendite</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {percent(calc.nettoRendite)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Jahresrate</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {euro(calc.jahresRate)}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Cashflow vor Steuer</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {euro(calc.cashflowVorSteuer)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
