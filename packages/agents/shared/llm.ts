
export interface RefactorRequest {
  filePath: string;
  code: string;
  instructions: string; // ex: "extrair função", "simplificar", etc.
}

/**
 * Chama o modelo GPT-5.1 (ou similar) para gerar um diff unificado de refatoração.
 * O endpoint padrão é o Chat Completions da OpenAI, mas pode ser configurado via LLM_API_URL.
 */
export async function generateRefactorDiff(
  req: RefactorRequest
): Promise<string> {
  const { filePath, code, instructions } = req;

  const apiUrl =
    process.env.LLM_API_URL ??
    "https://api.openai.com/v1/chat/completions";
  const apiKey = "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";
  const model = process.env.LLM_MODEL ?? "gpt-5.1";

  if (!apiKey) {
    throw new Error("LLM_API_KEY não definida no .env");
  }

  const prompt = `
Você é um assistente de refatoração de código TypeScript.

Objetivo:
- Refatorar o arquivo abaixo de acordo com as instruções.
- Responder **apenas** com um patch no formato "unified diff" compatível com git apply.

Regras:
- Use o caminho do arquivo exatamente como: ${filePath}
- Comece o diff com:
  --- a/${filePath}
  +++ b/${filePath}
- Use hunks com @@ ... @@
- Não explique nada em texto, não coloque comentários fora do diff.

Instruções de refatoração:
${instructions}

Código original:
\`\`\`ts
${code}
\`\`\`
`.trim();

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a code refactoring assistant." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error: ${response.status} ${text}`);
  }

  const data: any = await response.json();
  // Compatível com Chat Completions (choices) e com Responses API (output)
  const diffText =
    data.choices?.[0]?.message?.content?.trim?.() ??
    data.output?.[0]?.content?.[0]?.text?.value?.trim?.() ??
    "";

  if (!diffText) {
    throw new Error("LLM returned empty diff");
  }

  return diffText;
}
