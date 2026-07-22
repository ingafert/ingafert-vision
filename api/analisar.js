import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      status: "ok",
      mensagem: "Envie uma imagem em Base64 usando POST.",
      exemplo: {
        imagem: "data:image/jpeg;base64,...",
      },
    });
  }

  try {
    const { imagem } = req.body;

    if (!imagem) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Imagem não enviada.",
      });
    }

    const resposta = await openai.responses.create({
      model: "gpt-4.1",

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Você é o maior especialista do mundo em peças para máquinas agrícolas.

Analise cuidadosamente a imagem enviada.

Sua missão é identificar a peça com a maior precisão possível.

Responda SOMENTE um JSON válido.

Formato obrigatório:

{
  "tipo_peca":"",
  "nome_comercial":"",
  "marca":"",
  "modelo":"",
  "categoria":"",
  "codigo_original":"",
  "referencias":[],
  "fabricante":"",
  "descricao":"",
  "compatibilidade":[],
  "nivel_confianca":0,
  "observacoes":""
}

Regras:

- Procure números gravados na peça.
- Procure etiquetas.
- Procure logotipos.
- Procure gravações em baixo relevo.
- Nunca invente códigos.
- Se não encontrar um campo, deixe vazio.
- nivel_confianca deve ser de 0 a 100.
- Não escreva explicações.
- Não utilize markdown.
- Retorne apenas JSON.
`,
            },
            {
              type: "input_image",
              image_url: imagem,
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      status: "ok",
      resposta: resposta.output_text,
    });
  } catch (erro) {
    console.error(erro);

    return res.status(500).json({
      status: "erro",
      mensagem: erro.message,
      detalhe: erro,
    });
  }
}
