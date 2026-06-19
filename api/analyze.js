// Vercel Serverless Function
// Atua como intermediário seguro entre o browser e a API da Anthropic.
// A chave fica protegida como variável de ambiente (ANTHROPIC_API_KEY),
// nunca é exposta no código do navegador.

export default async function handler(req, res) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'ANTHROPIC_API_KEY não configurada no servidor.' }
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({
      error: { message: 'Erro ao contatar a API da Anthropic: ' + err.message }
    });
  }
}
