import OpenAI from "openai";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

async function buscarNoGoogle(termo) {

    const url =
        `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(termo)}`;

    const resposta = await fetch(url);

    cconst dados = await resposta.json();

console.log("GOOGLE STATUS:", resposta.status);
console.log("GOOGLE RESPONSE:", JSON.stringify(dados, null, 2));

    if (!dados.items || !dados.items.length) {
        return null;
    }

    const item = dados.items[0];

    return {
        titulo: item.title,
        url: item.link,
        descricao: item.snippet,
        imagem:
            item.pagemap?.cse_image?.[0]?.src || ""
    };

}

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

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(200).json({
            status: "ok",
            versao: "Ingafert Vision 2.0"
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
Analise esta peça agrícola.

Responda SOMENTE este JSON:

{
  "nome":"",
  "marca":"",
  "codigo_original":"",
  "referencias":[],
  "descricao":""
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

const analise = JSON.parse(resposta.output_text);

const termo = [
    analise.nome,
    analise.marca,
    analise.codigo_original
]
.filter(Boolean)
.join(" ");

const produto = await buscarNoGoogle(
    `site:ingafert.com.br ${termo}`
);

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
