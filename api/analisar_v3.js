import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SITE = "https://www.ingafert.com.br";
async function buscarProduto(termo) {

    const buscaUrl =
        SITE + "/busca?q=" + encodeURIComponent(termo);

    const buscaHtml =
        await fetch(buscaUrl).then(r => r.text());

    const linkProduto =
        buscaHtml.match(/href="(https:\/\/www\.ingafert\.com\.br\/produto\/[^"]+)"/i);

    if (!linkProduto) {

        return {

            url: buscaUrl,

            foto: ""

        };

    }

    const produtoUrl = linkProduto[1];

    const produtoHtml =
        await fetch(produtoUrl).then(r => r.text());

    const foto =
        produtoHtml.match(/https:\/\/images\.yampi\.me[^"' ]+\.(jpg|jpeg|png|webp)/i);

    return {

        url: produtoUrl,

        foto: foto ? foto[0] : ""

    };

}
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

console.log(texto);

const json =
    texto
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

let analise;

try {
    analise = JSON.parse(json);
} catch (e) {
    console.error("JSON RECEBIDO:");
    console.error(json);
    throw e;
}
const catalogo = JSON.parse(
    fs.readFileSync(
        path.join(process.cwd(), "dados", "catalogo.json"),
        "utf8"
    )
);

    const catalogoArray = Array.isArray(catalogo)
    ? catalogo
    : Object.values(catalogo);
    
    function procurarProduto(analise) {

    const termos = [
        analise.codigo_original,
        ...(analise.referencias || []),
        analise.nome,
    ]
    .filter(Boolean)
    .map(t => String(t).toLowerCase());

   for (const produto of catalogoArray) {

        const texto = JSON.stringify(produto).toLowerCase();

        if (termos.some(t => texto.includes(t))) {
            return produto;
        }

    }

    return null;

}
      const produtoCatalogo = procurarProduto(analise);
    
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
    encodeURIComponent(
        buscas[0] ||
        buscas[1] ||
        buscas[2] ||
        analise.nome ||
        ""
    );

    const encontrado =
    await buscarProduto(
        buscas[0] ||
        buscas[1] ||
        buscas[2] ||
        analise.nome ||
        ""
    );
const produto = {
    ...(produtoCatalogo || {}),
    nome: analise.nome,
    marca: analise.marca,
    codigo: analise.codigo_original,
    categoria: analise.categoria,
    descricao: analise.descricao,
    confianca: analise.confianca,
    foto: encontrado.foto,
    url: encontrado.url || urlBusca
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
