// netlify/functions/get-feedback.js
// Chamada: POST /.netlify/functions/get-feedback
// Body: { tom, grau, acorde_correto, acorde_errado, acertou }

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    const { tom, grau, acorde_correto, acorde_errado, acertou } = body;

    if (!tom || !grau || !acorde_correto) {
        return { statusCode: 400, body: 'Missing required fields' };
    }

    const funcoes = {
        'I':   'Tônica',
        'ii':  'Super Tônica',
        'iii': 'Mediante',
        'IV':  'Subdominante',
        'V':   'Dominante',
        'vi':  'Relativa Menor'
    };

    const funcaoNome = funcoes[grau] || grau;

    const promptAcerto = `
Você é o Mestre Harmônico, um professor de harmonia gospel experiente e encorajador.
O aluno acabou de ACERTAR que o grau ${grau} (${funcaoNome}) do tom ${tom} é ${acorde_correto}.

Responda em 2 frases curtas:
1. Um reforço do porquê esse acorde é o ${grau} nesse tom (conecte com a função harmônica de forma simples).
2. Um exemplo real: cite UMA música gospel conhecida no Brasil que usa essa progressão ou esse acorde nessa função.

Seja direto, caloroso e use linguagem de músico de igreja. Máximo 60 palavras.
`;

    const promptErro = `
Você é o Mestre Harmônico, um professor de harmonia gospel experiente e encorajador.
O aluno ERROU: escolheu ${acorde_errado} mas o grau ${grau} (${funcaoNome}) do tom ${tom} é ${acorde_correto}.

Responda em 2 frases curtas:
1. Explique de forma simples e memorável por que ${acorde_correto} é o ${grau} de ${tom} — use um truque mental ou analogia.
2. Cite UMA música gospel brasileira que usa esse acorde nessa função para fixar a memória.

Seja encorajador, nunca punitivo. Máximo 60 palavras.
`;

    const prompt = acertou ? promptAcerto : promptErro;

    try {
        const geminiRes = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 150,
                }
            })
        });

        if (!geminiRes.ok) {
            throw new Error(`Gemini error: ${geminiRes.status}`);
        }

        const geminiData = await geminiRes.json();
        const feedback = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!feedback) throw new Error('Empty response from Gemini');

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback })
        };

    } catch (err) {
        console.error('get-feedback error:', err);

        // Fallback local inteligente
        const fallback = acertou
            ? `${acorde_correto} é o ${grau} de ${tom} — ${funcaoNome}. Cada acerto é um passo para ministrar de ouvido.`
            : `No tom ${tom}, o ${grau} (${funcaoNome}) é sempre ${acorde_correto}. Grave essa relação — ela vai aparecer em muitas músicas!`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback: fallback, fallback: true })
        };
    }
};
