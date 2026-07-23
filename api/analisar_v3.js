import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {

  // ==========================
  // CORS
  // ==========================

  const origin = req.headers.origin || "";

  const permitidos = [
    "https://www.ingafert.com.br",
    "https://ingafert.com.br",
    "https://ingafert-vision.vercel.app"
  ];

  if (permitidos.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ==========================
  // TESTE
  // ==========================

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      versao: "Ingafert Vision V3"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "erro",
      mensagem: "Método não permitido."
    });
  }

  try {

    const { imagem } = req.body;

    if (!imagem) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Imagem não enviada."
      });
    }

    // ==========================
    // PROMPT
    // ==========================

    const PROMPT = `
Você é um engenheiro especialista em peças agrícolas.

Sua função é identificar exatamente a peça mostrada.

Analise cuidadosamente:

- formato
- espessura
- diâmetro
- quantidade e posição dos furos
- dentes
- chavetas
- rasgos
- buchas
- rolamentos
- soldas
- pintura
- acabamento
- roscas
- gravações
- números gravados
- letras gravadas
- logotipo
- fabricante

Antes de responder compare mentalmente a peça com milhares de peças agrícolas existentes.

Caso exista alguma gravação, utilize-a para identificar a peça.

Nunca invente:

- marca
- código
- referência

Se não tiver certeza deixe vazio.

Se conhecer o nome comercial utilizado no Brasil utilize-o.

A descrição deve ser curta, técnica e objetiva.

No campo confiança informe um valor entre 0 e 1.

Retorne SOMENTE este JSON:

{
  "nome":"",
  "marca":"",
  "codigo_original":"",
  "referencias":[],
  "categoria":"",
  "descricao":"",
  "confianca":0
}
}
`;

    // ==========================
    // OPENAI
    // ==========================

    const resposta = await openai.responses.create({

      model: "gpt-4.1",

      input: [

        {

          role: "user",

          content: [

            {
              type: "input_text",
              text: PROMPT
            },

            {
              type: "input_image",
              image_url: imagem,
              detail: "high"
            }

          ]

        }

      ]

    });

    const texto = resposta.output_text.trim();

    const analise = JSON.parse(texto);

    // ==========================
    // GOOGLE
    // ==========================

    const buscas = [];

if (analise.nome) {
  buscas.push(`site:ingafert.com.br ${analise.nome}`);
}

if (analise.nome && analise.marca) {
  buscas.push(
    `site:ingafert.com.br ${analise.nome} ${analise.marca}`
  );
}

if (analise.codigo_original) {
  buscas.push(
    `site:ingafert.com.br ${analise.codigo_original}`
  );
}

const pesquisa = encodeURIComponent(
  buscas[0] || "site:ingafert.com.br"
);

const google =
  `https://www.google.com/search?q=${pesquisa}`;
    
    // ==========================
    // RETORNO
    // ==========================

   return res.status(200).json({

    status: "ok",

    analise,

    buscas,

    google

});

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({

      status: "erro",

      mensagem: erro.message

    });

  }

}
