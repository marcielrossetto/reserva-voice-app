// utils/nluService.js

const fetch = require('node-fetch');
const { format } = require('date-fns'); // <<<<---- CORREÇÃO ESSENCIAL AQUI

// Carregar variáveis de ambiente
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest'; // Ou o modelo que você estiver usando
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Chama a API Gemini com o texto de prompt fornecido.
 */
async function callGeminiAPI(promptText) {
    if (!GEMINI_API_KEY) {
        console.error("Chave da API Gemini (GEMINI_API_KEY) não configurada no .env");
        // É importante lançar um erro aqui para que a função chamadora saiba que algo deu errado.
        throw new Error("Chave da API Gemini (GEMINI_API_KEY) não configurada no .env. Verifique suas variáveis de ambiente.");
    }

    const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        // Adicionar configurações de segurança pode ser útil para evitar bloqueios,
        // mas use com cautela e ajuste conforme a necessidade e as políticas da API.
        // safetySettings: [
        //   { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        //   { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        //   { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        //   { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        // ],
        // generationConfig: { // Opcional: para controlar a saída
        //   temperature: 0.7, // Ajuste para mais criatividade vs mais determinismo
        //   maxOutputTokens: 2048,
        // }
    };

    try {
        console.log("Chamando API Gemini com payload:", JSON.stringify(payload.contents, null, 2)); // Log para depuração (sem a chave)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Erro da API Gemini (payload):', JSON.stringify(payload, null, 2)); // Log do payload enviado
            console.error('Erro da API Gemini (resposta):', JSON.stringify(responseData, null, 2)); // Log da resposta de erro
            const errorMessage = responseData.error?.message || `HTTP error! status: ${response.status}`;
            // Lança um erro mais específico para o chamador tratar
            throw new Error(`Gemini API Error (${response.status}): ${errorMessage}. Response: ${JSON.stringify(responseData.error)}`);
        }

        const candidate = responseData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (candidate) {
            // A limpeza do ```json ... ``` já será feita na função chamadora,
            // mas podemos fazer uma limpeza básica aqui também se preferir.
            // Por ora, retornaremos o texto como está, pois a função determineIntentAndExtractData já faz isso.
            return candidate;
        }

        // Verifica se o prompt foi bloqueado
        if (responseData.promptFeedback?.blockReason) {
            console.error('Prompt bloqueado pela API Gemini:', responseData.promptFeedback.blockReason, responseData.promptFeedback.safetyRatings);
            throw new Error(`Prompt bloqueado pela API Gemini: ${responseData.promptFeedback.blockReason}. Detalhes: ${JSON.stringify(responseData.promptFeedback.safetyRatings)}`);
        }

        // Se não houver candidato e nem bloqueio, é uma resposta inesperada
        console.warn('Resposta inesperada ou vazia da API Gemini:', JSON.stringify(responseData, null, 2));
        throw new Error('Resposta inesperada ou sem conteúdo da API Gemini.');

    } catch (error) {
        // Captura erros de fetch (rede) ou erros lançados acima
        console.error("Falha na chamada à API Gemini ou no processamento da resposta:", error);
        // Relança o erro para que determineIntentAndExtractData possa capturá-lo
        // e retornar um objeto de erro NLU apropriado.
        throw error;
    }
}

/**
 * Determina a intenção e extrai dados do texto do usuário.
 */
async function determineIntentAndExtractData(userInputText) {
    const today = format(new Date(), "yyyy-MM-dd"); // Formato AAAA-MM-DD

    const prompt = `
        Você é um assistente de sistema de reservas de restaurante altamente preciso.
        Sua tarefa é analisar o texto do usuário para identificar a intenção e extrair informações relevantes para uma reserva de restaurante.
        A data de hoje é ${today}. Se o usuário mencionar "hoje", use esta data. Se mencionar "amanhã", calcule a data correspondente (some 1 dia a ${today}). Se mencionar uma data como "dia 15 do próximo mês", calcule corretamente. Se o ano não for especificado para uma data futura, assuma o ano atual ou o próximo, o que fizer mais sentido.

        O texto do usuário é: "${userInputText}"

        Instruções para extração:
        1.  **Intenção (intent)**:
            *   Se o texto claramente indicar um pedido para criar ou agendar uma reserva, defina 'intent' como "fazer_reserva".
            *   Se o texto parecer uma consulta sobre disponibilidade, cardápio, endereço, etc., defina 'intent' como "consultar_informacao".
            *   Se o texto for uma saudação, agradecimento, ou algo não relacionado a reservas ou consultas, defina 'intent' como "geral_dialogo".
            *   Se não for possível determinar a intenção ou faltarem dados críticos para uma reserva (como nome, telefone, data, horário, numPessoas após uma tentativa de reserva), defina 'intent' como "intencao_incompleta" ou "intencao_desconhecida".
            *   Por enquanto, o foco principal é "fazer_reserva".

        2.  **Dados da Reserva (data)**: Extraia os seguintes campos para um objeto aninhado chamado 'data'.
            *   **nome**: (String, Obrigatório para 'fazer_reserva') O nome da pessoa para a reserva.
            *   **telefone**: (String, Obrigatório para 'fazer_reserva') O número de telefone principal do cliente. Extraia apenas os dígitos numéricos.
            *   **data**: (String, Obrigatório para 'fazer_reserva') A data da reserva. Converta para o formato AAAA-MM-DD.
                *   Exemplos de entrada: "dia 25 de dezembro", "25/12/2024", "amanhã", "hoje", "15 de janeiro".
            *   **horario**: (String, Obrigatório para 'fazer_reserva') O horário da reserva. Tente formatar como HH:MM (ex: "18:00", "09:30", "meio-dia e trinta").
                *   Exemplos de entrada: "às seis da tarde", "19h30", "para as 20 horas".
            *   **numPessoas**: (Number, Obrigatório para 'fazer_reserva') O número de pessoas para a reserva. Se dito por extenso (ex: "duas"), converta para número.
            *   **telefoneAlternativo**: (String, Opcional) Um número de telefone alternativo, se fornecido. Extraia apenas os dígitos numéricos.
            *   **formaPagamento**: (String, Opcional) A forma de pagamento, se mencionada.
            *   **tipoEvento**: (String, Opcional) O tipo de evento (ex: "aniversário", "confraternização"), se mencionado.
            *   **valorRodizio**: (String, Opcional) Informações sobre valor do rodízio, se mencionado.
            *   **numeroMesa**: (String, Opcional) Número da mesa específico, se solicitado.
            *   **observacoes**: (String, Opcional) Quaisquer observações ou pedidos adicionais.

        3.  **Formato de Saída**: Retorne EXCLUSIVAMENTE um objeto JSON bem formado. Não inclua explicações ou texto adicional fora do JSON.
            O JSON deve ter a seguinte estrutura:
            {
              "intent": "...",
              "data": {
                "nome": "..." | null,
                "telefone": "..." | null,
                "data": "AAAA-MM-DD" | null,
                "horario": "HH:MM" | null,
                "numPessoas": ... | null,
                "telefoneAlternativo": "..." | null,
                "formaPagamento": "..." | null,
                "tipoEvento": "..." | null,
                "valorRodizio": "..." | null,
                "numeroMesa": "..." | null,
                "observacoes": "..." | null
              }
            }
        4.  **Campos Não Encontrados**: Se um campo (obrigatório ou opcional) não for encontrado no texto, seu valor no JSON deve ser \`null\`.
            A lógica do backend deverá tratar campos obrigatórios ausentes para a intenção 'fazer_reserva'.

        Objeto JSON resultante:
    `;

    console.log("Enviando prompt para Gemini..."); // Log antes de chamar a API
    try {
        const rawJsonResponse = await callGeminiAPI(prompt);
        console.log("Resposta bruta recebida do Gemini:", rawJsonResponse); // Log da resposta bruta

        // Tenta limpar e parsear o JSON
        let cleanJsonResponse = rawJsonResponse;
        if (typeof cleanJsonResponse === 'string') {
            if (cleanJsonResponse.startsWith('```json')) {
                cleanJsonResponse = cleanJsonResponse.substring(7);
            }
            if (cleanJsonResponse.endsWith('```')) {
                cleanJsonResponse = cleanJsonResponse.substring(0, cleanJsonResponse.length - 3);
            }
            cleanJsonResponse = cleanJsonResponse.trim();
        } else {
            // Se não for string, algo muito errado aconteceu ou a API retornou um objeto direto (improvável para este endpoint)
            console.error("Resposta do Gemini não é uma string:", cleanJsonResponse);
            return { intent: "ERROR_NLU_RESPONSE_TYPE", error: "Resposta da IA não é uma string JSON válida.", rawResponse: JSON.stringify(cleanJsonResponse), data: {} };
        }
        

        try {
            const parsedJson = JSON.parse(cleanJsonResponse);
            console.log("JSON parseado com sucesso:", parsedJson);
            return parsedJson;
        } catch (parseError) {
            console.error("Erro ao parsear JSON da resposta Gemini:", parseError.message);
            console.error("String que falhou no parse:", cleanJsonResponse); // Log da string que causou o erro de parse
            return { intent: "ERROR_NLU_PARSE", error: "Erro ao interpretar resposta da IA: " + parseError.message, rawResponse: rawJsonResponse, data: {} };
        }

    } catch (apiError) { // Captura erros de callGeminiAPI (incluindo chave, bloqueio, rede, etc.)
        console.error("NLU error (determineIntentAndExtractData pegou erro da callGeminiAPI):", apiError.message);
        // Retorna um objeto de erro padronizado
        return { intent: "ERROR_NLU_API_CALL", error: apiError.message || "Falha na comunicação com a IA.", data: {} };
    }
}

module.exports = { determineIntentAndExtractData, callGeminiAPI }; // Exporta callGeminiAPI se quiser testá-la separadamente