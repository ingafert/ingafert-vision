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
Você é um especialista em peças agrícolas.

Analise cuidadosamente a fotografia.

NUNCA deixe campos vazios.

Mesmo que não tenha 100% de certeza, informe a MELHOR hipótese.

IMPORTANTE:

Se existirem referências equivalentes da mesma peça, retorne TODAS.

Inclua códigos John Deere, New Holland, Case, Massey Ferguson, Valtra, JF, Jumil, Baldan e códigos paralelos quando forem equivalentes.

Analise também a aplicação, formato da peça e compatibilidade para descobrir referências equivalentes.

Nunca retorne apenas uma referência se existirem outras compatíveis.

Identifique:

- nome da peça
- fabricante
- código original
- referências
- descrição curta

Retorne SOMENTE este JSON:

{
  "nome":"",
  "marca":"",
  "codigo_original":"",
  "referencias":[],
  "descricao":"",
  "confianca":0.0
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

    
const termoBusca =
    analise.codigo_original ||
    (analise.referencias && analise.referencias[0]) ||
    analise.nome ||
    "";
const respostaCatalogo = await fetch(
    "https://ingafert-vision.vercel.app/api/catalogo"
);

const catalogo = await respostaCatalogo.json();
    
let produto = {

    encontrou: false,

    nome: analise.nome || "",

    marca: analise.marca || "",

    descricao: analise.descricao || "",

    referencias: analise.referencias || [],

    foto: "",

    url: ""

};

const busca = [
    termoBusca,
    analise.codigo_original,
    ...(analise.referencias || []),
    analise.nome,
    analise.descricao
]
.filter(Boolean)
.map(v => String(v).toLowerCase().trim());

const encontrado = catalogo.produtos.find(p => {

    const texto = [
    p.referencia,
    ...(p.referencias || []),
    p.nome,
    p.marca,
    p.descricao,
    p.termos
]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

    return busca.some(item => texto.includes(item));

});

if (encontrado) {

    produto = {

        encontrou: true,

        nome: encontrado.nome,

        marca: analise.marca || "",

        descricao: analise.descricao || "",

        referencias: analise.referencias || [],

        foto: encontrado.foto,

        url: encontrado.url

    };

}
    
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
