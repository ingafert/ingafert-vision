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

const ranking = catalogo.produtos
    .map(p => {

        const texto = [
            p.referencia,
            p.codigo_original,
            ...(p.referencias || []),
            p.nome,
            p.marca,
            p.descricao,
            p.termos
        ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

        let pontos = 0;

      busca.forEach(item => {

    if (!item) return;

    if (texto === item) {

        pontos += 100;

    } else if (texto.includes(item)) {

        pontos += 20;

    }

});

       // Não pontuar por palavras do nome.
// A busca será feita apenas por referências e códigos.

      if (
    analise.codigo_original &&
    texto.includes(analise.codigo_original.toLowerCase())
) {

    pontos += 500;

}

(analise.referencias || []).forEach(ref => {

    if (texto.includes(ref.toLowerCase())) {

        pontos += 300;

    }

});

        return {
            produto: p,
            pontos
        };

   })
.sort((a, b) => b.pontos - a.pontos);

let encontrado = null;

// 1 - Procura por referência exata
for (const item of catalogo.produtos) {

    const refs = [
        item.referencia,
        item.codigo_original,
        ...(item.referencias || [])
    ]
    .filter(Boolean)
    .map(r => r.toLowerCase());

    const refsIA = [
        analise.codigo_original,
        ...(analise.referencias || [])
    ]
    .filter(Boolean)
    .map(r => r.toLowerCase());

    if (refsIA.some(r => refs.includes(r))) {

        encontrado = {
            produto: item
        };

        break;

    }

}

// 2 - Só usa o ranking se houver uma boa pontuação
if (!encontrado && ranking.length && ranking[0].pontos >= 300) {

    encontrado = ranking[0];

}

if (encontrado && encontrado.produto) {

    produto = {

        encontrou: true,

        nome: encontrado.produto.nome,

        marca: encontrado.produto.marca,

        descricao: encontrado.produto.descricao,

        referencias: encontrado.produto.referencias,

        foto: encontrado.produto.foto,

        url: encontrado.produto.url

    };

}
    
return res.status(200).json({

    status: "ok",

    analise,

    produto,

    ranking: ranking.slice(0,10).map(x => ({

        nome: x.produto.nome,

        referencia: x.produto.referencia,

        pontos: x.pontos

    }))

});

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({

      status: "erro",

      mensagem: erro.message

    });

  }

}
