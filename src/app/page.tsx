"use client";

import { useMemo, useState } from "react";

type SamplePayloadResponse = {
  required_features: string[];
  example: Record<string, string | number | null>;
};

type PredictionResponse = {
  energy_kbtu: number;
  co2_tons: number;
};

const defaultPayload = {
  DataYear: 2016,
  CouncilDistrictCode: 7,
  Latitude: 47.61,
  Longitude: -122.33,
  NumberofBuildings: 1,
  NumberofFloors: 12,
  PropertyGFATotal: 180000,
  PropertyGFAParking: 20000,
  LargestPropertyUseTypeGFA: 130000,
  SecondLargestPropertyUseTypeGFA: 30000,
  ENERGYSTARScore: 72,
  HasSecondProperty: 1,
  BuildingAge: 28,
  GFA_per_floor: 15000,
  Floors_is_zero: 0,
  BuildingType: "NonResidential",
  PrimaryPropertyType: "Office",
  Neighborhood: "DOWNTOWN",
  LargestPropertyUseType: "Office",
  SecondLargestPropertyUseType: "Parking",
  ComplianceStatus: "Compliant",
};

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export default function Home() {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  const [payloadText, setPayloadText] = useState(
    JSON.stringify(defaultPayload, null, 2),
  );
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([]);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);

  const hasApiBase = useMemo(() => apiBaseUrl.length > 0, [apiBaseUrl]);

  async function loadSamplePayload() {
    if (!hasApiBase) {
      setError("Missing NEXT_PUBLIC_API_BASE_URL in your environment variables.");
      return;
    }

    setError("");
    setIsLoadingSample(true);

    try {
      const response = await fetch(`${apiBaseUrl}/sample-input`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Sample request failed: ${response.status}`);
      }

      const data = (await response.json()) as SamplePayloadResponse;
      setRequiredFeatures(data.required_features ?? []);
      setPayloadText(JSON.stringify(data.example ?? {}, null, 2));
      setResult(null);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unknown sample error";
      setError(message);
    } finally {
      setIsLoadingSample(false);
    }
  }

  async function predictBoth() {
    if (!hasApiBase) {
      setError("Missing NEXT_PUBLIC_API_BASE_URL in your environment variables.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoadingPrediction(true);

    try {
      const payload = JSON.parse(payloadText) as Record<string, unknown>;
      const response = await fetch(`${apiBaseUrl}/predict/both`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Prediction failed: ${response.status} ${body}`);
      }

      const prediction = (await response.json()) as PredictionResponse;
      setResult(prediction);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unknown prediction error";
      setError(message);
    } finally {
      setIsLoadingPrediction(false);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <main className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[1.1fr_1fr]">
        <section className="fade-up rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 backdrop-blur-md md:p-7">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">
            EnergiSight
          </p>
          <h1 className="mt-2 text-3xl leading-tight font-semibold md:text-4xl">
            Energy + CO2 Predictor
          </h1>
          <p className="mt-3 max-w-lg text-sm text-[var(--ink-700)] md:text-base">
            Frontend for Phase 2 machine learning API. Load a sample payload or paste your own
            JSON, then run both predictions in one call.
          </p>

          <div className="mt-5 rounded-xl border border-[var(--line)] bg-white/80 p-4 text-sm">
            <p className="font-semibold text-[var(--ink-700)]">API Base URL</p>
            <p className="mt-1 break-all text-[var(--ink-900)]">
              {hasApiBase ? apiBaseUrl : "Not configured"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadSamplePayload}
              disabled={isLoadingSample}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingSample ? "Loading sample..." : "Load Sample Input"}
            </button>
            <button
              type="button"
              onClick={predictBoth}
              disabled={isLoadingPrediction}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingPrediction ? "Predicting..." : "Predict Both"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-[var(--warn)] bg-orange-50 p-3 text-sm text-[var(--warn)]">
              {error}
            </div>
          )}

          {result && (
            <div className="fade-up-slow mt-5 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-[var(--line)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">Energy</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--ink-900)]">
                  {formatNumber(result.energy_kbtu, 2)}
                </p>
                <p className="text-xs text-[var(--ink-500)]">kBtu</p>
              </article>
              <article className="rounded-xl border border-[var(--line)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">CO2</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--good)]">
                  {formatNumber(result.co2_tons, 2)}
                </p>
                <p className="text-xs text-[var(--ink-500)]">tons</p>
              </article>
            </div>
          )}
        </section>

        <section className="fade-up rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 backdrop-blur-md md:p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Payload JSON</h2>
            <span className="text-xs text-[var(--ink-500)]">
              {requiredFeatures.length > 0
                ? `${requiredFeatures.length} required features`
                : "Use sample input to fetch features"}
            </span>
          </div>

          <textarea
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            className="mt-3 h-[420px] w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 text-xs leading-6 text-[var(--ink-900)] outline-none transition focus:border-[var(--accent)]"
            spellCheck={false}
          />
        </section>
      </main>
    </div>
  );
}
