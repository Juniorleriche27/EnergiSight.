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

type FormDataMap = Record<string, string>;

type FieldGroup = {
  title: string;
  fields: string[];
};

const navItems: NavItem[] = [
  { id: "overview", label: "Apercu", caption: "Resume de la plateforme" },
  { id: "predictor", label: "Laboratoire de prediction", caption: "Previsions en direct" },
  { id: "insights", label: "Performance modele", caption: "Resultats de validation" },
  { id: "workflow", label: "Flux de travail", caption: "Methode en 4 etapes" },
  { id: "faq", label: "FAQ", caption: "Questions frequentes" },
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

const numericFields = new Set([
  "DataYear",
  "CouncilDistrictCode",
  "Latitude",
  "Longitude",
  "NumberofBuildings",
  "NumberofFloors",
  "PropertyGFATotal",
  "PropertyGFAParking",
  "LargestPropertyUseTypeGFA",
  "SecondLargestPropertyUseTypeGFA",
  "ENERGYSTARScore",
  "HasSecondProperty",
  "BuildingAge",
  "GFA_per_floor",
  "Floors_is_zero",
]);

const fieldLabels: Record<string, string> = {
  DataYear: "Annee des donnees",
  CouncilDistrictCode: "Code district",
  Latitude: "Latitude",
  Longitude: "Longitude",
  NumberofBuildings: "Nombre de batiments",
  NumberofFloors: "Nombre d'etages",
  PropertyGFATotal: "Surface totale (GFA)",
  PropertyGFAParking: "Surface parking (GFA)",
  LargestPropertyUseTypeGFA: "Surface usage principal",
  SecondLargestPropertyUseTypeGFA: "Surface second usage",
  ENERGYSTARScore: "Score ENERGY STAR",
  HasSecondProperty: "Second usage present (0/1)",
  BuildingAge: "Age du batiment",
  GFA_per_floor: "Surface moyenne par etage",
  Floors_is_zero: "Indicateur etages nuls (0/1)",
  BuildingType: "Type de batiment",
  PrimaryPropertyType: "Type de propriete principal",
  Neighborhood: "Quartier",
  LargestPropertyUseType: "Type d'usage principal",
  SecondLargestPropertyUseType: "Type de second usage",
  ComplianceStatus: "Etat de conformite",
};

const selectOptions: Record<string, string[]> = {
  BuildingType: ["NonResidential", "MultifamilyMR", "Campus"],
  PrimaryPropertyType: ["Office", "Hotel", "School", "Retail Store", "Other"],
  Neighborhood: ["DOWNTOWN", "SOUTHEAST", "NORTH", "SOUTHWEST", "EAST", "Other"],
  LargestPropertyUseType: ["Office", "Hotel", "Retail", "School", "Parking", "Other"],
  SecondLargestPropertyUseType: ["Parking", "Office", "Retail", "School", "Other", ""],
  ComplianceStatus: ["Compliant", "Error - Correct DefaultData", "Non-Compliant"],
};

const fieldGroups: FieldGroup[] = [
  {
    title: "Localisation",
    fields: ["DataYear", "CouncilDistrictCode", "Latitude", "Longitude", "Neighborhood"],
  },
  {
    title: "Caracteristiques batiment",
    fields: [
      "NumberofBuildings",
      "NumberofFloors",
      "PropertyGFATotal",
      "PropertyGFAParking",
      "BuildingAge",
      "GFA_per_floor",
      "Floors_is_zero",
    ],
  },
  {
    title: "Usage et performance",
    fields: [
      "BuildingType",
      "PrimaryPropertyType",
      "LargestPropertyUseType",
      "SecondLargestPropertyUseType",
      "LargestPropertyUseTypeGFA",
      "SecondLargestPropertyUseTypeGFA",
      "ENERGYSTARScore",
      "HasSecondProperty",
      "ComplianceStatus",
    ],
  },
];

const workflowSteps = [
  {
    title: "Collecte des donnees batiment",
    description:
      "Renseignez les caracteristiques essentielles: localisation, surfaces, typologie et statut de conformite.",
  },
  {
    title: "Pretraitement automatique",
    description:
      "L'API applique l'imputation, la transformation categorielle et la normalisation avant l'inference.",
  },
  {
    title: "Prediction energie et CO2",
    description:
      "Une seule requete permet d'obtenir les deux estimations: consommation energetique et emissions de CO2.",
  },
  {
    title: "Interpretation metier",
    description:
      "Comparez les scenarios pour orienter les decisions de performance energetique et de reporting climat.",
  },
];

const faqItems = [
  {
    question: "Faut-il remplir tous les champs ?",
    answer:
      "Il est recommande de renseigner un maximum de champs. Les valeurs manquantes restent gerees automatiquement.",
  },
  {
    question: "Pourquoi masquer les details techniques dans cette vue ?",
    answer:
      "Cette interface est optimisee pour la decision metier. Les details API/Dev restent disponibles en mode avance.",
  },
  {
    question: "Peut-on envoyer un JSON personnalise ?",
    answer: "Oui. Le mode avance permet d'editer puis d'appliquer un JSON complet au formulaire.",
  },
];

function toStringMap(payload: Record<string, string | number | null>): FormDataMap {
  const output: FormDataMap = {};
  Object.entries(payload).forEach(([key, value]) => {
    output[key] = value === null || value === undefined ? "" : String(value);
  });
  return output;
}

function formatNumber(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits,
  }).format(value);
}

export default function Home() {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

  const [formData, setFormData] = useState<FormDataMap>(() => toStringMap(defaultPayload));
  const [payloadText, setPayloadText] = useState(JSON.stringify(defaultPayload, null, 2));
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>(Object.keys(defaultPayload));
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [useJsonMode, setUseJsonMode] = useState(false);

  const hasApiBase = useMemo(() => apiBaseUrl.length > 0, [apiBaseUrl]);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);

    if (!sections.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (current?.target.id) {
          setActiveSection(current.target.id);
        }
      },
      {
        rootMargin: "-35% 0px -50% 0px",
        threshold: [0.25, 0.45, 0.6],
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

  function setFormAndJson(payload: Record<string, string | number | null>) {
    setFormData(toStringMap(payload));
    setPayloadText(JSON.stringify(payload, null, 2));
  }

  function handleFieldChange(field: string, value: string) {
    setFormData((previous) => {
      const updated = { ...previous, [field]: value };
      const payloadFromUpdated = requiredFeatures.reduce<Record<string, string | number | null>>(
        (accumulator, currentField) => {
          const currentValue = updated[currentField] ?? "";
          accumulator[currentField] = currentValue.trim() ? currentValue : null;
          return accumulator;
        },
        {},
      );
      setPayloadText(JSON.stringify(payloadFromUpdated, null, 2));
      return updated;
    });
  }

  function buildPayloadFromForm(): Record<string, string | number | null> {
    const payload: Record<string, string | number | null> = {};

    requiredFeatures.forEach((feature) => {
      const rawValue = formData[feature] ?? "";
      const cleanedValue = rawValue.trim();

      if (!cleanedValue) {
        payload[feature] = null;
        return;
      }

      payload[feature] = numericFields.has(feature) ? Number(cleanedValue) : cleanedValue;
    });

    return payload;
  }

  async function loadSamplePayload() {
    if (!hasApiBase) {
      setError("Variable NEXT_PUBLIC_API_BASE_URL manquante.");
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
        throw new Error(`Chargement exemple impossible (${response.status})`);
      }

      const data = (await response.json()) as SamplePayloadResponse;
      const featureList =
        data.required_features?.length > 0 ? data.required_features : Object.keys(defaultPayload);
      setRequiredFeatures(featureList);

      const completePayload = featureList.reduce<Record<string, string | number | null>>(
        (accumulator, feature) => {
          accumulator[feature] = data.example?.[feature] ?? null;
          return accumulator;
        },
        {},
      );

      setFormAndJson(completePayload);
      setResult(null);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Erreur de chargement.";
      setError(message);
    } finally {
      setIsLoadingSample(false);
    }
  }

  function resetForm() {
    setRequiredFeatures(Object.keys(defaultPayload));
    setFormAndJson(defaultPayload);
    setResult(null);
    setError("");
    setUseJsonMode(false);
  }

  function applyJsonToForm() {
    try {
      const parsed = JSON.parse(payloadText) as Record<string, string | number | null>;
      const featureList = requiredFeatures.length ? requiredFeatures : Object.keys(defaultPayload);
      const normalized = featureList.reduce<Record<string, string | number | null>>(
        (accumulator, feature) => {
          accumulator[feature] = parsed[feature] ?? null;
          return accumulator;
        },
        {},
      );
      setFormAndJson(normalized);
      setError("");
    } catch {
      setError("JSON invalide. Verifiez la syntaxe avant d'appliquer.");
    }
  }

  async function predictBoth() {
    if (!hasApiBase) {
      setError("Variable NEXT_PUBLIC_API_BASE_URL manquante.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoadingPrediction(true);

    try {
      const payload = useJsonMode
        ? (JSON.parse(payloadText) as Record<string, string | number | null>)
        : buildPayloadFromForm();

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
        throw new Error(`Prediction impossible (${response.status}) ${body}`);
      }

      const prediction = (await response.json()) as PredictionResponse;
      setResult(prediction);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Erreur de prediction.";
      setError(message);
    } finally {
      setIsLoadingPrediction(false);
    }
  }

  const sidebar = (
    <>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-500)]">EnergiSight</p>
        <p className="mt-1 text-sm font-semibold text-[var(--ink-900)]">Console de decision</p>
      </div>

      <nav className="mt-5 space-y-2">
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

      <div className="mt-auto rounded-2xl border border-[var(--line)] bg-white p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-500)]">Systeme</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-[var(--ink-700)]">Backend</span>
          <span className={`status-badge ${hasApiBase ? "status-good" : "status-warn"}`}>
            {hasApiBase ? "Connecte" : "Non configure"}
          </span>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-500)]">Pret pour la demonstration.</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen pb-7">
      {isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          aria-label="Fermer le menu lateral"
        />
      )}

      <aside
        className={`surface-panel fixed left-0 top-0 z-50 flex h-full w-[86vw] max-w-[320px] flex-col p-4 transition-transform duration-300 lg:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs text-[var(--ink-700)]"
          >
            Fermer
          </button>
        </div>
        {sidebar}
      </aside>

      <div className="mx-auto flex w-full max-w-[1500px] gap-4 px-3 pt-4 md:px-5 md:pt-5">
        <aside className="surface-panel sticky top-4 hidden h-[calc(100vh-2rem)] w-[300px] flex-col p-4 lg:flex">
          {sidebar}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="surface-panel mb-4 flex items-center justify-between px-4 py-3 md:px-6">
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
                  Section active
                </p>
                <p className="text-sm font-semibold text-[var(--ink-900)]">
                  {navItems.find((item) => item.id === activeSection)?.label ?? "Apercu"}
                </p>
              </div>
            </div>
            <span className="status-badge status-good">Systeme operationnel</span>
          </header>

          <main className="space-y-4">
            <section id="overview" className="surface-panel scroll-mt-24 p-5 md:p-7">
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-500)]">
                    Intelligence durable
                  </p>
                  <h1 className="mt-2 max-w-3xl text-3xl leading-tight font-semibold md:text-5xl">
                    Tableau de bord professionnel pour les previsions energetiques et carbone
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-700)] md:text-base">
                    EnergiSight relie le profil de votre batiment a des modeles d&apos;apprentissage
                    automatique de production et fournit des estimations exploitables pour la prise
                    de decision.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection("predictor")}
                      className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                    >
                      Laboratoire de prediction ouvert
                    </button>
                    <button
                      type="button"
                      onClick={loadSamplePayload}
                      disabled={isLoadingSample}
                      className="rounded-full border border-[var(--line)] bg-white px-5 py-2 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingSample ? "Chargement..." : "Charger un echantillon"}
                    </button>
                  </div>
                </div>

                <article className="surface-subtle p-4 md:p-5">
                  <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">
                    Vue metier
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-700)]">
                    Cette interface presente uniquement les informations utiles a la decision. Les
                    details techniques API sont masques pour une lecture claire en soutenance.
                  </p>
                </article>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className="metric-card">
                  <p className="metric-label">Energie prevue</p>
                  <p className="metric-value">{result ? formatNumber(result.energy_kbtu, 0) : "--"}</p>
                  <p className="metric-unit">kBtu</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">CO2 prevu</p>
                  <p className="metric-value text-[var(--good)]">
                    {result ? formatNumber(result.co2_tons, 2) : "--"}
                  </p>
                  <p className="metric-unit">tonnes</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Fonctionnalites requises</p>
                  <p className="metric-value">{requiredFeatures.length}</p>
                  <p className="metric-unit">entrees du modele</p>
                </article>
                <article className="metric-card">
                  <p className="metric-label">Etat de l&apos;API</p>
                  <p className="metric-value">{hasApiBase ? "Pret" : "A configurer"}</p>
                  <p className="metric-unit">URL de base</p>
                </article>
              </div>
            </section>

            <section id="predictor" className="surface-panel scroll-mt-24 p-5 md:p-7">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">
                    Laboratoire de prediction
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                    Executez les deux predictions avec une seule charge utile
                  </h2>
                </div>
                <p className="text-xs text-[var(--ink-500)]">Mode standard: formulaire | Mode avance: JSON</p>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <article className="surface-subtle p-4 md:p-5">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={loadSamplePayload}
                      disabled={isLoadingSample}
                      className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingSample ? "Chargement..." : "Charger un echantillon"}
                    </button>
                    <button
                      type="button"
                      onClick={predictBoth}
                      disabled={isLoadingPrediction}
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingPrediction ? "Prediction..." : "Predire les deux"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-700)] transition hover:border-[var(--ink-500)]"
                    >
                      Reinitialiser
                    </button>
                  </div>

                  {error && (
                    <div className="mt-4 rounded-lg border border-[var(--warn)] bg-orange-50 p-3 text-sm text-[var(--warn)]">
                      {error}
                    </div>
                  )}

                  <div className="mt-4 grid gap-4">
                    {fieldGroups.map((group) => (
                      <fieldset key={group.title} className="rounded-xl border border-[var(--line)] bg-white p-3">
                        <legend className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-500)]">
                          {group.title}
                        </legend>
                        <div className="grid gap-2 md:grid-cols-2">
                          {group.fields.map((field) => {
                            const isSelect = Array.isArray(selectOptions[field]);
                            const step = field === "Latitude" || field === "Longitude" ? "0.0001" : "1";
                            return (
                              <label key={field} className="space-y-1">
                                <span className="text-xs text-[var(--ink-700)]">{fieldLabels[field] ?? field}</span>
                                {isSelect ? (
                                  <select
                                    value={formData[field] ?? ""}
                                    onChange={(event) => handleFieldChange(field, event.target.value)}
                                    className="h-10 w-full rounded-lg border border-[var(--line)] bg-white px-2 text-sm text-[var(--ink-900)] outline-none focus:border-[var(--accent)]"
                                  >
                                    <option value="">--</option>
                                    {selectOptions[field].map((option) => (
                                      <option key={option || "empty"} value={option}>
                                        {option || "Aucun"}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={numericFields.has(field) ? "number" : "text"}
                                    step={numericFields.has(field) ? step : undefined}
                                    value={formData[field] ?? ""}
                                    onChange={(event) => handleFieldChange(field, event.target.value)}
                                    className="h-10 w-full rounded-lg border border-[var(--line)] bg-white px-2 text-sm text-[var(--ink-900)] outline-none focus:border-[var(--accent)]"
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </article>

                <article className="surface-subtle p-4 md:p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-xl border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">Energie</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--ink-900)]">
                        {result ? formatNumber(result.energy_kbtu, 0) : "--"}
                      </p>
                      <p className="text-xs text-[var(--ink-500)]">kBtu</p>
                    </article>
                    <article className="rounded-xl border border-[var(--line)] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">CO2</p>
                      <p className="mt-2 text-3xl font-semibold text-[var(--good)]">
                        {result ? formatNumber(result.co2_tons, 2) : "--"}
                      </p>
                      <p className="text-xs text-[var(--ink-500)]">tonnes</p>
                    </article>
                  </div>

                  <details className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-900)]">
                      Mode avance (JSON)
                    </summary>
                    <div className="mt-3 space-y-3">
                      <label className="flex items-center gap-2 text-xs text-[var(--ink-700)]">
                        <input
                          type="checkbox"
                          checked={useJsonMode}
                          onChange={(event) => setUseJsonMode(event.target.checked)}
                        />
                        Utiliser le JSON pour l&apos;envoi
                      </label>
                      <textarea
                        value={payloadText}
                        onChange={(event) => setPayloadText(event.target.value)}
                        className="h-[290px] w-full resize-y rounded-xl border border-[var(--line)] bg-[#0f1823] p-3 font-mono text-xs leading-6 text-[#d5ecff] outline-none"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={applyJsonToForm}
                        className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-900)] transition hover:border-[var(--accent)]"
                      >
                        Appliquer le JSON au formulaire
                      </button>
                    </div>
                  </details>
                </article>
              </div>
            </section>

            <section id="insights" className="surface-panel scroll-mt-24 p-5 md:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">Apercu du modele</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">
                Resume de validation de la derniere phase d&apos;entrainement
              </h2>

              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <article className="surface-subtle p-4 md:p-5">
                  <h3 className="text-lg font-semibold">Modele energetique</h3>
                  <p className="mt-1 text-sm text-[var(--ink-700)]">Cible : Consommation d&apos;energie du site (kBtu)</p>
                  <div className="mt-3 rounded-xl border border-[var(--line)] bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">Indicateur principal</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--ink-900)]">R2 = 0,852</p>
                    <p className="mt-1 text-xs text-[var(--ink-500)]">Precision elevee sur donnees de test</p>
                  </div>
                  <details className="mt-3 rounded-xl border border-[var(--line)] bg-white p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-900)]">Details techniques</summary>
                    <p className="mt-2 text-xs text-[var(--ink-700)]">RMSE test: 6 342 842 | MAE test: 1 955 957</p>
                  </details>
                </article>

                <article className="surface-subtle p-4 md:p-5">
                  <h3 className="text-lg font-semibold">Modele CO2</h3>
                  <p className="mt-1 text-sm text-[var(--ink-700)]">Objectif : Emissions totales de GES</p>
                  <div className="mt-3 rounded-xl border border-[var(--line)] bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">Indicateur principal</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--ink-900)]">R2 = 0,841</p>
                    <p className="mt-1 text-xs text-[var(--ink-500)]">Precision elevee sur donnees de test</p>
                  </div>
                  <details className="mt-3 rounded-xl border border-[var(--line)] bg-white p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-900)]">Details techniques</summary>
                    <p className="mt-2 text-xs text-[var(--ink-700)]">RMSE test: 239,95 | MAE test: 68,64</p>
                  </details>
                </article>
              </div>
            </section>

            <section id="workflow" className="surface-panel scroll-mt-24 p-5 md:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">Flux de travail</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Flux operationnel typique en quatre etapes</h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {workflowSteps.map((step, index) => (
                  <article key={step.title} className="surface-subtle p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-500)]">Etape {index + 1}</p>
                    <h3 className="mt-2 text-base font-semibold text-[var(--ink-900)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="faq" className="surface-panel scroll-mt-24 p-5 md:p-7">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-500)]">FAQ</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Reponses aux questions frequentes</h2>

              <div className="mt-5 space-y-2">
                {faqItems.map((item) => (
                  <details key={item.question} className="rounded-xl border border-[var(--line)] bg-white p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-[var(--ink-900)]">{item.question}</summary>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-700)]">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
