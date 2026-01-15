const { format } = require('date-fns');
require('dotenv').config();


/**
 * Faz a chamada à API do Gemini
 */
async function callGeminiAPI(promptText) {
    if (!GEMINI_API_KEY) {
        throw new Error("Chave da API Gemini (GEMINI_API_KEY) não configurada no .env");
    }

    const payload = { contents: [{ parts: [{ text: promptText }] }] };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(`Gemini API Error (${response.status}): ${errorMessage}`);
        }

        const candidate = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (candidate) return candidate;

        if (responseData.promptFeedback?.blockReason) {
            throw new Error(`Prompt bloqueado pela API Gemini: ${responseData.promptFeedback.blockReason}`);
        }

        throw new Error('Resposta inesperada ou sem conteúdo da API Gemini.');

    } catch (error) {
        console.error("[NLU] Erro na chamada à API Gemini:", error.message);
        throw error;
    }
}

/**
 * Analisa texto e retorna JSON com intenção e dados extraídos
 */
async function determineIntentAndExtractData(userInputText) {
    const today = format(new Date(), "yyyy-MM-dd");

    const prompt = `
Você é um assistente para um sistema de reservas de restaurante.
Extraia as informações do texto do usuário e normalize as datas e horários corretamente.

📌 Regras importantes para DATA:
- Use sempre o formato AAAA-MM-DD (ex: 2025-05-23).
- Considere a data atual: ${today}.
- Se mencionar "hoje", use ${today}.
- Se mencionar "amanhã", some 1 dia a ${today}.
- Se mencionar "depois de amanhã", some 2 dias.
- Se mencionar "próximo mês", calcule corretamente para o mesmo dia do próximo mês (se não houver, ajuste para o último dia).
- Se mencionar "semana que vem", adicione 7 dias.
- Se mencionar "mês que vem dia 10", ajuste corretamente.
- Se o usuário fornecer uma data explícita (ex: "23-05-25", "23/05/2025"), converta para AAAA-MM-DD.

Texto do usuário: "${userInputText}"

Retorne APENAS um objeto JSON:
{
  "intent": "fazer_reserva|consultar_informacao|geral_dialogo|intencao_incompleta|intencao_desconhecida",
  "data": {
    "nome": "...",
    "telefone": "...",
    "data": "AAAA-MM-DD",
    "horario": "HH:MM",
    "numPessoas": ...,
    "telefoneAlternativo": "...",
    "formaPagamento": "...",
    "tipoEvento": "...",
    "valorRodizio": "...",
    "numeroMesa": "...",
    "observacoes": "..."
  }
}
Se não encontrar algum campo, coloque null.
`;

    try {
        const rawJsonResponse = await callGeminiAPI(prompt);

        let cleanJson = rawJsonResponse.replace(/```json|```/g, '').trim();

        const parsed = JSON.parse(cleanJson);

        // ✅ Ajuste para garantir que a data seja interpretada corretamente no horário local
        if (parsed.data?.data) {
            const [year, month, day] = parsed.data.data.split('-').map(Number);
            const safeDate = new Date(year, month - 1, day);
            safeDate.setHours(12, 0, 0, 0); // ✅ Evita problema de timezone
            parsed.data.data = format(safeDate, "yyyy-MM-dd");
        }

        return parsed;
    } catch (err) {
        console.error("[NLU] Erro ao interpretar resposta Gemini:", err.message);
        return { intent: "ERROR_NLU_PARSE", error: err.message, rawResponse: userInputText, data: {} };
    }
}

module.exports = { determineIntentAndExtractData, callGeminiAPI };
