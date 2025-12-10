// packages/agents/shared/llm.ts
//import "cross-fetch/polyfill";
import dotenv from "dotenv";
import path from "path";

// garante que o .env da raiz será carregado
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

export interface RefactorRequest {
  filePath: string;        // caminho RELATIVO ao repo (ex: src/app/services/user.service.ts)
  code: string;            // código original do arquivo
  instructions?: string;   // instruções extras do orquestrador (opcional)
  eslint?: unknown;        // evidências do analyzer (opcional)
  metrics?: unknown;       // evidências do analyzer (opcional)
}

/**
 * Chama a LLM para gerar um diff de refatoração.
 * A chave de API está hardcoded aqui para simplificar os testes locais.
 * NÃO faça commit dessa chave em repositórios públicos.
 */
const API_URL = process.env.LLM_API_URL ?? "https://api.openai.com/v1/chat/completions";

const API_KEY = process.env.LLM_API_KEY

const MODEL = "gpt-5.1";


export async function generateRefactorDiff(req: RefactorRequest): Promise<string> {
  const { filePath, code, instructions, eslint, metrics } = req;

  const systemPrompt = `
Você é um engenheiro de software especialista em refatoração.
Seu objetivo é melhorar a qualidade interna do código mantendo o mesmo comportamento observável.

REGRAS GERAIS:

1. Preserve o DOMÍNIO:
   - Não invente conceitos que não existam no código original.
   - Se o código lida apenas com números, não crie entidades como "User", "Order", etc.
   - Use apenas abstrações coerentes com o que já está presente.

2. Comportamento:
   - A refatoração deve produzir exatamente o mesmo resultado para as mesmas entradas.
   - Não adicione validações, logs, exceções ou efeitos colaterais novos.

3. Refatoração ideal:
   - Você PODE e DEVE:
     * Renomear variáveis, parâmetros e funções internas para deixar mais claro.
     * Extrair funções ou métodos privados para reduzir duplicação ou complexidade.
     * Introduzir classes/objetos internos se isso melhorar o design.
     * Reorganizar o código para melhorar legibilidade e manutenibilidade.
   - Mantenha a refatoração focada no que traz ganho real de clareza/qualidade.
   - Evite mudanças cosméticas excessivas sem ganho de clareza.

4. Formato da resposta:
   - Responda APENAS com um diff unificado que possa ser aplicado com \`git apply\`.
   - Use cabeçalhos no formato:
     --- a/${filePath}
     +++ b/${filePath}
   - Não escreva nenhuma explicação em texto fora do diff.
`.trim();

  const staticContext = {
    eslint: eslint ?? null,
    metrics: metrics ?? null,
  };

  const userPrompt = `
Contexto da análise estática (pode conter valores aproximados ou stubados):
${JSON.stringify(staticContext, null, 2)}

Caminho do arquivo a refatorar: ${filePath}

Código original:
\`\`\`ts
${code}
\`\`\`

Instruções adicionais do orquestrador (se houver):
${instructions || "(nenhuma instrução específica)"}

Agora refatore o arquivo seguindo TODAS as regras do system prompt
e produza APENAS o diff unificado aplicável a esse arquivo.
`.trim();

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error: ${response.status} ${text}`);
  }

  const data: any = await response.json();

  // Compatível tanto com Chat Completions (choices) quanto com Responses API (output)
  const diffText: string =
    data.choices?.[0]?.message?.content?.trim?.() ??
    data.output?.[0]?.content?.[0]?.text?.value?.trim?.() ??
    "";

  if (!diffText) {
    throw new Error("LLM returned empty diff");
  }

  return diffText;
}

