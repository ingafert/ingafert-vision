import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {

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

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      versao: "Ingafert Vision 3.0"
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

    const resposta = await openai.responses.create({

      model: "gpt-4.1",

      input: [

        {

          role: "user",

          content: [

            {
              type: "input_text",
              text: `
Você é especialista em peças agrícolas.

Analise cuidadosamente a imagem.

Responda SOMENTE este JSON.

{
  "nome":"",
  "marca":"",
  "codigo_original":"",
  "referencias":[],
  "descricao":"",
  "confianca":0
}
`
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

   const produto = {

    encontrou: true,

    nome: analise.nome || "",

    marca: analise.marca || "",

    descricao: analise.descricao || "",

    referencias: analise.referencias || [],

    foto: "",

    
const termoBusca =
    analise.codigo_original ||
    (analise.referencias && analise.referencias[0]) ||
    analise.nome ||
    "";

const produto = {

    encontrou: true,

    nome: analise.nome || "",

    marca: analise.marca || "",

    descricao: analise.descricao || "",

    referencias: analise.referencias || [],

    foto: "",

    url: `https://www.ingafert.com.br/busca?q=${encodeURIComponent(termoBusca)}`

};

return res.status(200).json({

    status: "ok",

    analise,

    produto

});

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({

      status: "erro",

      mensagem: erro.message

    });

  }

}
