"use client";

import { useEffect, useMemo, useState } from "react";

type SamplePayloadResponse = {
  required_features: string[];
  example: Record<string, string | number | null>;
};

type PredictionResponse = {
  energy_kbtu: number;
  co2_tons: number;
};

type NavItem = {
  id: string;
  label: string;
  caption: string;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", caption: "Platform summary" },
  { id: "predictor", label: "Predictor Lab", caption: "Run real predictions" },
  { id: "insights", label: "Model Insights", caption: "Performance metrics" },
  { id: "workflow", label: "Workflow", caption: "How it works" },
  { id: "api", label: "API", caption: "Endpoints and examples" },
  { id: "faq", label: "FAQ", caption: "Answers and guidance" },
];

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

const energyBenchmarks = [
  { label: "Test R2", value: "0.852" },
  { label: "Test RMSE", value: "6,342,842" },
  { label: "Test MAE", value: "1,955,957" },
];

const co2Benchmarks = [
  { label: "Test R2", value: "0.841" },
  { label: "Test RMSE", value: "239.95" },
  { label: "Test MAE", value: "68.64" },
];

const workflowSteps = [
  {
    title: "Capture Building Inputs",
    description:
      "Collect the required 21 features: physical dimensions, usage profile, location, and compliance fields.",
  },
  {
    title: "Normalize + Transform",
    description:
      "The backend applies preprocessing with imputers, scaling, and one-hot encoding for robust inference.",
  },
  {
    title: "Predict Energy and CO2",
    description:
      "Two trained XGBoost models run in one API call and return estimates for kBtu and CO2 tons.",
  },
  {
    title: "Interpret and Decide",
    description:
      "Use predicted values to compare scenarios, prioritize retrofits, and support sustainability reporting.",
  },
];

const endpointRows = [
  { method: "GET", path: "/health", note: "Simple uptime status" },
  { method: "GET", path: "/sample-input", note: "Returns example payload + required features" },
  { method: "POST", path: "/predict/energy", note: "Energy only prediction" },
  { method: "POST", path: "/predict/co2", note: "CO2 only prediction" },
  { method: "POST", path: "/predict/both", note: "Combined response in one call" },
];

const faqItems = [
  {
    question: "What format should input values use?",
    answer:
      "Use valid JSON with exact feature names. Numeric fields should be numbers whenever possible.",
  },
  {
    question: "Can I send partial payloads?",
    answer:
      "Yes. Missing values are handled by the preprocessing pipeline, but full payloads generally improve reliability.",
  },
  {
    question: "How do I connect another frontend client?",
    answer:
      "Point your client to the same HF Space URL and call the same REST endpoints documented in the API section.",
  },
  {
    question: "How is this deployed?",
    answer:
      "Frontend runs on Vercel. Backend runs on Hugging Face Spaces (Docker) with CORS configured through ALLOWED_ORIGINS.",
  },
];

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export default function Home() {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  const [payloadText, setPayloadText] = useState(JSON.stringify(defaultPayload, null, 2));
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>(Object.keys(defaultPayload));
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const hasApiBase = useMemo(() => apiBaseUrl.length > 0, [apiBaseUrl]);

  const curlSnippet = useMemo(() => {
    const target = hasApiBase ? apiBaseUrl : "https://your-space-name.hf.space";
    return [
      `curl -X POST "${target}/predict/both" \\`,
      '  -H "Content-Type: application/json" \\',
      "  -d '{",
      '    "DataYear": 2016,',
      '    "CouncilDistrictCode": 7,',
      '    "Latitude": 47.61,',
      '    "Longitude": -122.33,',
      '    "PropertyGFATotal": 180000,',
      '    "BuildingType": "NonResidential"',
      "  }'",
    ].join("\n");
  }, [apiBaseUrl, hasApiBase]);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);

    if (!sections.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-40% 0px -45% 0px",
        threshold: [0.2, 0.4, 0.65],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  function scrollToSection(sectionId: string) {
    setIsSidebarOpen(false);
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  function resetPayload() {
    setPayloadText(JSON.stringify(defaultPayload, null, 2));
    setResult(null);
    setError("");
  }

  async function copyApiSnippet() {
    try {
      await navigator.clipboard.writeText(curlSnippet);
      setCopiedSnippet(true);
      window.setTimeout(() => setCopiedSnippet(false), 1400);
    } catch {
      setError("Clipboard permission blocked. Copy snippet manually.");
    }
  }

  const sidebar = (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-500)]">EnergiSight</p>
          <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">Decision Console</p>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs text-[var(--ink-700)] lg:hidden"
        >
          Close
        </button>
      </div>

      <nav className="mt-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSection(item.id)}
            className={`nav-item ${activeSection === item.id ? "nav-item-active" : ""}`}
          >
            <span className="font-semibold">{item.label}</span>
            <span className="mt-1 block text-xs text-[var(--ink-500)]">{item.caption}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-[var(--line)] bg-white/70 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">System</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-[var(--ink-700)]">Backend</span>
          <span className={`rounded-full px-2 py-1 text-xs ${hasApiBase ? "chip-good" : "chip-warn"}`}>
            {hasApiBase ? "Connected" : "Missing URL"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-[var(--ink-700)]">Model target</span>
          <span className="text-xs text-[var(--ink-900)]">Energy + CO2</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen pb-8">
      {isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          aria-label="Close sidebar backdrop"
        />
      )}

      <aside
        className={`surface-panel fixed left-0 top-0 z-50 flex h-full w-[85vw] max-w-[300px] flex-col p-4 transition-transform duration-300 lg:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebar}
      </aside>

      <div className="mx-auto flex w-full max-w-[1520px] gap-4 px-3 pt-4 md:px-6 md:pt-6">
        <aside className="surface-panel sticky top-5 hidden h-[calc(100vh-2.5rem)] w-[280px] flex-col p-4 lg:flex">
          {sidebar}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="surface-panel sticky top-3 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold lg:hidden"
              >
                Menu
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">
                  Active section
                </p>
                <p className="text-sm font-semibold text-[var(--ink-900)]">
                  {navItems.find((item) => item.id === activeSection)?.label ?? "Overview"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="chip-neutral">Vercel Frontend</span>
              <span className="chip-neutral">HF Spaces API</span>
              <span className="chip-neutral">XGBoost Models</span>
            </div>
          </header>

          <main className="mt-4 space-y-4 md:space-y-5">
            <section id="overview" className="surface-panel section-reveal scroll-mt-28 p-5 md:p-7">
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-500)]">
                    Sustainable Intelligence
                  </p>
                  <h1 className="mt-2 max-w-2xl text-4xl leading-tight font-semibold md:text-5xl">
                    Professional dashboard for energy and carbon forecasts
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-700)] md:text-base">
                    EnergiSight connects your building profile to production ML models and returns
                    decision-ready estimates. Built for rapid scenario testing, operational planning,
                    and climate reporting workflows.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => scrollToSection("predictor")}
                      className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                    >
                      Open Predictor Lab
                    </button>
                    <button
                      type="button"
                      onClick={loadSamplePayload}
                      disabled={isLoadingSample}
                      className="rounded-full border border-[var(--line)] bg-white px-5 py-2 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingSample ? "Loading..." : "Load sample now"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-4 md:p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">
                    Deployment status
                  </p>
                  <p className="mt-3 text-sm text-[var(--ink-700)]">
                    Frontend and API are live in production. CORS and env variables are configured
                    for secure browser requests.
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-700)]">Frontend</span>
                      <span className="font-semibold text-[var(--ink-900)]">Vercel</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-700)]">Backend</span>
                      <span className="font-semibold text-[var(--ink-900)]">HF Spaces Docker</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-700)]">Model family</span>
                      <span className="font-semibold text-[var(--ink-900)]">XGBoost</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="metric-card">
                  <p className="metric-label">Predicted Energy</p>
                  <p className="metric-value">{result ? formatNumber(result.energy_kbtu, 2) : "--"}</p>
                  <p className="metric-unit">kBtu</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Predicted CO2</p>
                  <p className="metric-value text-[var(--good)]">
                    {result ? formatNumber(result.co2_tons, 2) : "--"}
                  </p>
                  <p className="metric-unit">tons</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Required features</p>
                  <p className="metric-value">{requiredFeatures.length}</p>
                  <p className="metric-unit">model inputs</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">API status</p>
                  <p className="metric-value">{hasApiBase ? "Ready" : "Missing"}</p>
                  <p className="metric-unit">base URL</p>
                </article>
              </div>
            </section>

            <section id="predictor" className="surface-panel section-reveal scroll-mt-28 p-5 md:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">
                    Predictor Lab
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                    Run both predictions with one payload
                  </h2>
                </div>
                <p className="text-xs text-[var(--ink-500)]">
                  Paste JSON manually or start from the live sample endpoint.
                </p>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <article className="surface-subtle p-4 md:p-5">
                  <div className="rounded-xl border border-[var(--line)] bg-white/85 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">API Base URL</p>
                    <p className="mt-2 break-all text-sm text-[var(--ink-900)]">
                      {hasApiBase ? apiBaseUrl : "Not configured"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={loadSamplePayload}
                      disabled={isLoadingSample}
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingSample ? "Loading sample..." : "Load Sample"}
                    </button>
                    <button
                      type="button"
                      onClick={predictBoth}
                      disabled={isLoadingPrediction}
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingPrediction ? "Predicting..." : "Predict Both"}
                    </button>
                    <button
                      type="button"
                      onClick={resetPayload}
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:border-[var(--ink-500)]"
                    >
                      Reset
                    </button>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-lg border border-[var(--warn)] bg-orange-50 p-3 text-sm text-[var(--warn)]">
                      {error}
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <article className="rounded-xl border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">Energy</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--ink-900)]">
                        {result ? formatNumber(result.energy_kbtu, 2) : "--"}
                      </p>
                      <p className="text-xs text-[var(--ink-500)]">kBtu</p>
                    </article>
                    <article className="rounded-xl border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">CO2</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--good)]">
                        {result ? formatNumber(result.co2_tons, 2) : "--"}
                      </p>
                      <p className="text-xs text-[var(--ink-500)]">tons</p>
                    </article>
                  </div>

                  <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">
                      Features in use
                    </p>
                    <div className="mt-2 flex max-h-[150px] flex-wrap gap-2 overflow-auto pr-1">
                      {requiredFeatures.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-[11px] text-[var(--ink-700)]"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="surface-subtle p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Payload JSON</h3>
                    <span className="text-xs text-[var(--ink-500)]">{requiredFeatures.length} fields</span>
                  </div>

                  <textarea
                    value={payloadText}
                    onChange={(event) => setPayloadText(event.target.value)}
                    className="mt-3 h-[540px] w-full resize-y rounded-xl border border-[var(--line)] bg-white p-3 font-mono text-xs leading-6 text-[var(--ink-900)] outline-none transition focus:border-[var(--accent)]"
                    spellCheck={false}
                  />
                </article>
              </div>
            </section>

            <section id="insights" className="surface-panel section-reveal scroll-mt-28 p-5 md:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">Model Insights</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                Validation summary from final training run
              </h2>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <article className="surface-subtle p-4 md:p-5">
                  <h3 className="text-lg font-semibold">Energy model</h3>
                  <p className="mt-1 text-sm text-[var(--ink-700)]">Target: SiteEnergyUse(kBtu)</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {energyBenchmarks.map((item) => (
                      <div key={item.label} className="rounded-xl border border-[var(--line)] bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">{item.label}</p>
                        <p className="mt-2 text-xl font-semibold text-[var(--ink-900)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="surface-subtle p-4 md:p-5">
                  <h3 className="text-lg font-semibold">CO2 model</h3>
                  <p className="mt-1 text-sm text-[var(--ink-700)]">Target: TotalGHGEmissions</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {co2Benchmarks.map((item) => (
                      <div key={item.label} className="rounded-xl border border-[var(--line)] bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">{item.label}</p>
                        <p className="mt-2 text-xl font-semibold text-[var(--ink-900)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section id="workflow" className="surface-panel section-reveal scroll-mt-28 p-5 md:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">Workflow</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                Typical operational flow in four steps
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {workflowSteps.map((step, index) => (
                  <article key={step.title} className="surface-subtle p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-[var(--ink-900)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="api" className="surface-panel section-reveal scroll-mt-28 p-5 md:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">API</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Endpoint map and request snippet</h2>

              <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <article className="surface-subtle p-4 md:p-5">
                  <h3 className="text-lg font-semibold">Endpoints</h3>
                  <div className="mt-3 space-y-2">
                    {endpointRows.map((row) => (
                      <div
                        key={row.path}
                        className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm"
                      >
                        <p>
                          <span className="rounded-md bg-[var(--paper)] px-2 py-1 text-xs font-semibold">
                            {row.method}
                          </span>
                          <span className="ml-2 font-mono text-[var(--ink-900)]">{row.path}</span>
                        </p>
                        <p className="mt-1 text-xs text-[var(--ink-500)]">{row.note}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="surface-subtle p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">cURL example</h3>
                    <button
                      type="button"
                      onClick={copyApiSnippet}
                      className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-700)] transition hover:border-[var(--accent)]"
                    >
                      {copiedSnippet ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="mt-3 overflow-auto rounded-xl border border-[var(--line)] bg-[#0f1823] p-4 text-xs leading-6 text-[#d5ecff]">
                    <code>{curlSnippet}</code>
                  </pre>
                </article>
              </div>
            </section>

            <section id="faq" className="surface-panel section-reveal scroll-mt-28 p-5 md:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">FAQ</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Common deployment and usage questions</h2>

              <div className="mt-5 space-y-2">
                {faqItems.map((item) => (
                  <details key={item.question} className="rounded-xl border border-[var(--line)] bg-white p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-900)]">
                      {item.question}
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </main>

          <footer className="mt-4 pb-2 text-center text-xs text-[var(--ink-500)] md:mt-5">
            EnergiSight | Phase 2 ML product frontend | DCLIC OIF
          </footer>
        </div>
      </div>
    </div>
  );
}
