import { NextResponse } from "next/server";

type ExplainRequestBody = {
  prediction?: {
    energy_kbtu?: number;
    co2_tons?: number;
  };
  payload?: Record<string, unknown>;
};

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
      "Explique ces resultats en francais simple, ton professionnel, clair pour une audience non technique.",
      "Structure la reponse en 4 sections avec titres courts:",
      "1) Lecture rapide",
      "2) Interpretation metier",
      "3) Risques et points d'attention",
      "4) Actions recommandees",
      "",
      "Contraintes:",
      "- Maximum 180 mots",
      "- Pas de jargon inutile",
      "- Ne pas inventer de valeurs absentes",
      "",
      `Resultat energie (kBtu): ${prediction.energy_kbtu}`,
      `Resultat CO2 (tonnes): ${prediction.co2_tons}`,
      `Extrait payload: ${JSON.stringify(body.payload ?? {}, null, 0).slice(0, 1200)}`,
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

    const explanation =
      data.message?.content?.find((item) => item.type === "text")?.text?.trim() ??
      "Explication indisponible pour le moment.";

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
