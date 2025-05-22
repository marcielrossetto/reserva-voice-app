// utils/nluService.js

const fetch = require('node-fetch');
const { format } = require('date-fns');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Chama a API Gemini com o texto de prompt fornecido.
 */
async function callGeminiAPI(promptText) {
    if (!GEMINI_API_KEY) {
        console.error("Chave da API Gemini (GEMINI_API_KEY) não configurada no .env");
        throw new Error("Chave da API Gemini (GEMINI_API_KEY) não configurada no .env");
    }

    const payload = {
        contents: [{ parts: [{ text: promptText }] }],
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Erro da API Gemini (payload):', JSON.stringify(payload, null, 2));
            console.error('Erro da API Gemini (resposta):', JSON.stringify(responseData, null, 2));
            const errorMessage = responseData.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(`Gemini API (${response.status}): ${errorMessage}`);
        }

        const candidate = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (candidate) {
            let extractedText = candidate;

            // Remove possíveis delimitadores de código ```json ... ```
            if (extractedText.startsWith('```json')) {
                extractedText = extractedText.slice(7);
            }
            if (extractedText.endsWith('```')) {
                extractedText = extractedText.slice(0, -3);
            }

            return extractedText.trim();
        }

        if (responseData.promptFeedback?.blockReason) {
            console.error('Prompt bloqueado pela API Gemini:', responseData.promptFeedback.blockReason, responseData.promptFeedback.safetyRatings);
            throw new Error(`Prompt bloqueado pela API Gemini: ${responseData.promptFeedback.blockReason}`);
        }

        console.warn('Resposta inesperada ou vazia da API Gemini:', JSON.stringify(responseData, null, 2));
        throw new Error('Resposta inesperada ou sem conteúdo da API Gemini.');

    } catch (error) {
        console.error("Falha na chamada à API Gemini ou no processamento da resposta:", error);
        throw error;
    }
}

/**
 * Determina a intenção e extrai dados do texto do usuário.
 */
async function determineIntentAndExtractData(userInputText) {
    const today = format(new Date(), "yyyy-MM-dd");

    const prompt = `
        Você é um assistente de sistema de reservas de restaurante altamente preciso.
        A data de hoje é ${today}.
        Analise o seguinte texto do usuário e extraia um objeto JSON com os dados.
        Texto do usuário: "${userInputText}"
        Objeto JSON:
    `;

    try {
        const rawJsonResponse = await callGeminiAPI(prompt);

        try {
            const parsedJson = JSON.parse(rawJsonResponse);
            return parsedJson;
        } catch (parseError) {
            console.error("Erro ao parsear JSON da resposta Gemini:", parseError.message, "Resposta recebida:", rawJsonResponse);
            return { intent: "ERROR_NLU", data: { message: "Erro ao interpretar resposta da IA: " + parseError.message } };
        }

    } catch (error) {
        console.error("NLU error (determineIntentAndExtractData):", error.message);
        return { intent: "ERROR_NLU", data: { message: error.message || "Falha no processamento NLU." } };
    }
}

module.exports = { determineIntentAndExtractData };
