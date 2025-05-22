// utils/nluService.js
const fetch = require('node-fetch');
const { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } = require('date-fns');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Usa GEMINI_MODEL_NAME do .env, ou 'gemini-1.5-flash-latest' como padrão
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

async function callGeminiAPI(promptText) {
    if (!GEMINI_API_KEY) {
        // Este console.error é mais para debug do lado do servidor, não será visto pelo cliente.
        console.error("utils/nluService.js: Chave da API Gemini (GEMINI_API_KEY) não configurada no .env");
        throw new Error("Chave da API Gemini (GEMINI_API_KEY) não configurada no .env");
    }
    // ... resto da função callGeminiAPI como definimos antes ...
    // (com o payload correto para :generateContent)
    const payload = {
        contents: [{ parts: [{ text: promptText }] }],
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // ... tratamento de resposta e erro ...
        const responseData = await response.json();

        if (!response.ok) {
            console.error('Erro da API Gemini (payload):', JSON.stringify(payload, null, 2));
            console.error('Erro da API Gemini (resposta):', JSON.stringify(responseData, null, 2));
            const errorMessage = responseData.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(`Gemini API (${response.status}): ${errorMessage}`);
        }
        // ... extração do texto da resposta ...
        if (responseData.candidates && responseData.candidates.length > 0 &&
            responseData.candidates[0].content && responseData.candidates[0].content.parts &&
            responseData.candidates[0].content.parts.length > 0) {
            let extractedText = responseData.candidates[0].content.parts[0].text.trim();
            if (extractedText.startsWith('```json')) {
                extractedText = extractedText.substring(7);
            }
            if (extractedText.endsWith('```')) {
                extractedText = extractedText.substring(0, extractedText.length - 3);
            }
            return extractedText.trim();
        } else if (responseData.promptFeedback && responseData.promptFeedback.blockReason) {
            console.error('Prompt bloqueado pela API Gemini:', responseData.promptFeedback.blockReason, responseData.promptFeedback.safetyRatings);
            throw new Error(`Prompt bloqueado pela API Gemini: ${responseData.promptFeedback.blockReason}`);
        } else {
            console.warn('Resposta inesperada ou vazia da API Gemini:', JSON.stringify(responseData, null, 2));
            throw new Error('Resposta inesperada ou sem conteúdo da API Gemini.');
        }

    } catch (error) {
        console.error("Falha na chamada à API Gemini ou no processamento da resposta:", error);
        throw error;
    }
}

async function determineIntentAndExtractData(userInputText) {
    // ... (prompt como definido antes) ...
    const today = format(new Date(), "yyyy-MM-dd");
    const prompt = `
        Você é um assistente de sistema de reservas de restaurante altamente preciso.
        A data de hoje é ${today}.
        Analise o seguinte texto do usuário...
        // INCLUA O RESTO DO SEU PROMPT DETALHADO AQUI
        Texto do usuário: "${userInputText}"
        Objeto JSON:
    `;
    try {
        const rawJsonResponse = await callGeminiAPI(prompt);
        return JSON.parse(rawJsonResponse);
    } catch (error) {
        console.error("NLU error (determineIntentAndExtractData):", error.message);
        return { intent: "ERROR_NLU", data: { message: error.message || "Falha no processamento NLU." } };
    }
}

module.exports = { determineIntentAndExtractData };