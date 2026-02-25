import { NextResponse } from "next/server";

type ExplainRequestBody = {
  prediction?: {
    energy_kbtu?: number;
    co2_tons?: number;
  };
  payload?: Record<string, unknown>;
};

function stripMarkdown(text: string): string {
  return text
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function limitWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function sanitizeExplanation(text: string): string {
  const withoutMarkdown = stripMarkdown(text);
  const compact = withoutMarkdown
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return limitWords(compact, 200);
}

export async function POST(request: Request) {
  const cohereApiKey = process.env.COHERE_API_KEY;
  const cohereModel = process.env.COHERE_MODEL ?? "command-a-03-2025";

  if (!cohereApiKey) {
    return NextResponse.json(
      { error: "COHERE_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as ExplainRequestBody;
    const prediction = body.prediction;

    if (!prediction || typeof prediction.energy_kbtu !== "number" || typeof prediction.co2_tons !== "number") {
      return NextResponse.json(
        { error: "Missing or invalid prediction values." },
        { status: 400 },
      );
    }

    const prompt = [
      "Tu es un analyste energie et carbone pour des batiments.",
      "Reponds en francais, ton professionnel, texte brut uniquement.",
      "Interdiction d'utiliser markdown: pas de #, ##, ###, pas de **, pas de listes a puces markdown.",
      "",
      "Format obligatoire, 4 sections dans cet ordre exact:",
      "Lecture rapide:",
      "Interpretation:",
      "Risques:",
      "Actions:",
      "",
      "Consignes obligatoires:",
      "- Maximum 200 mots au total.",
      "- Utilise uniquement les donnees d'entree. N'invente aucun contexte non present.",
      "- Si deduction, ecris explicitement probablement ou a confirmer.",
      "- ENERGY STAR: ne pas dire meilleur/moins bon que X% sans definition fournie.",
      "- Pour ENERGY STAR, utilise seulement: performance faible, moyenne, ou bonne selon le score.",
      "- Dans Interpretation, ajoute une note methodologique de 1 a 2 lignes:",
      "  resultats = estimations d'un modele ML dependantes des variables saisies, a confirmer par audit/mesures.",
      "- Dans Actions, propose un plan priorise en trois horizons:",
      "  0-30 jours, 30-60 jours, 60-90 jours.",
      "- Commence par quick wins (LED, reglages HVAC, detection presence, consignes),",
      "  puis modernisation et ENR selon faisabilite et ROI.",
      "",
      `Resultat energie (kBtu): ${prediction.energy_kbtu}`,
      `Resultat CO2 (tonnes): ${prediction.co2_tons}`,
      `Payload utilisateur (JSON): ${JSON.stringify(body.payload ?? {}, null, 0).slice(0, 1600)}`,
    ].join("\n");

    const response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cohereApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cohereModel,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Cohere request failed (${response.status}): ${errorText}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      message?: {
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      };
    };

    const explanationRaw =
      data.message?.content?.find((item) => item.type === "text")?.text?.trim() ??
      "Explication indisponible pour le moment.";
    const explanation = sanitizeExplanation(explanationRaw);

    return NextResponse.json({
      explanation,
      model: cohereModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
