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
  "confianca":0,
  "buscas":[]
}
Além do nome principal, gere entre 5 e 10 termos comerciais utilizados no Brasil para procurar esta peça.

Os termos devem ser curtos.

Exemplo:

"buscas":[
"lâmina de corte",
"faca barra de corte",
"lâmina barra de corte",
"barra de corte",
"faca plataforma"
]

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

    const buscas = Array.isArray(analise.buscas)
    ? analise.buscas
    : [];

    // ==========================
    // GOOGLE
    // ==========================

   const listaBuscas = [];

if (analise.nome)
    listaBuscas.push(analise.nome);

if (analise.codigo_original)
    listaBuscas.push(analise.codigo_original);

if (analise.marca)
    listaBuscas.push(analise.marca);

buscas.forEach(item => {
    if (item && !listaBuscas.includes(item))
        listaBuscas.push(item);
});
}

const pesquisa = encodeURIComponent(
  buscas[0] || "site:ingafert.com.br"
);

const busca = [
    analise.nome,
    analise.codigo_original,
    analise.marca
]
.filter(Boolean)
.join(" ");

const urlBusca =
    "https://www.ingafert.com.br/busca?q=" +
    encodeURIComponent(listaBuscas[0] || "");
  
const produto = {
    nome: analise.nome,
    marca: analise.marca,
    codigo: analise.codigo_original,
    categoria: analise.categoria,
    descricao: analise.descricao,
    confianca: analise.confianca,
    imagem: "",
    url: urlBusca
};
    
    // ==========================
    // RETORNO
    // ==========================

   return res.status(200).json({

    status: "ok",

    analise,

    buscas: listaBuscas,

    produto,

    google: urlBusca

});

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({

      status: "erro",

      mensagem: erro.message

    });

  }

}
