import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

let catalogo = [];

try {

    catalogo = JSON.parse(

        fs.readFileSync(

            path.join(
                process.cwd(),
                "dados",
                "catalogo_vision.json"
            ),

            "utf8"

        )

    );

    console.log(
        "Catálogo carregado:",
        catalogo.length,
        "produtos"
    );

} catch (erro) {

    console.error(
        "Erro carregando catálogo:",
        erro.message
    );

    catalogo = [];

}

function normalizar(texto = "") {

    return texto
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}

function palavras(texto = "") {

    return normalizar(texto)

        .split(" ")

        .filter(p =>

            p.length > 2 &&

            ![
                "para",
                "com",
                "sem",
                "dos",
                "das",
                "de",
                "da",
                "do",
                "em",
                "no",
                "na",
                "por",
                "uma",
                "uns",
                "umas",
                "que",
                "the",
                "and"

            ].includes(p)

        );

} 

export default async function handler(req, res) {

    const origin = req.headers.origin || "";

    const originsPermitidos = [

        "https://www.ingafert.com.br",
        "https://ingafert.com.br",
        "https://ingafert-vision.vercel.app"

    ];

    if (originsPermitidos.includes(origin)) {

        res.setHeader(
            "Access-Control-Allow-Origin",
            origin
        );

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

            mensagem: "API Ingafert Vision",

            catalogo: catalogo.length,

            exemplo: {

                imagem: "data:image/jpeg;base64,..."

            }

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

        console.log("Recebendo imagem...");

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

Analise cuidadosamente a imagem.

Nunca invente códigos.

Caso exista código visível informe.

Caso não exista deixe vazio.

Responda SOMENTE JSON.

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

        console.log("Resposta recebida da OpenAI.");

        let resultado;

  function buscarProdutos(analise) {

    console.log("========== BUSCA ==========");
    console.log("Produtos:", catalogo.length);

    const resultados = [];

    const palavrasIA = [

        ...palavras(analise.tipo_peca),
        ...palavras(analise.nome_comercial),
        ...palavras(analise.descricao),
        ...palavras(analise.categoria),
        ...palavras(analise.fabricante)

    ];

    console.log("Palavras IA:", palavrasIA);

    const codigoIA = normalizar(
        analise.codigo_original || ""
    );

    const refsIA = (analise.referencias || [])
        .map(normalizar);

    for (const produto of catalogo) {

        let score = 0;

        const textoProduto = [

            produto.nome || "",
            produto.descricao || "",
            produto.marca || "",
            produto.categoria || "",
            produto.codigo_original || "",
            ...(produto.referencias || [])

        ].join(" ");

        const palavrasProduto = palavras(textoProduto);

        // comparação por palavras

        for (const palavraIA of palavrasIA) {

            for (const palavraProduto of palavrasProduto) {

                if (

                    palavraProduto === palavraIA ||

                    palavraProduto.includes(palavraIA) ||

                    palavraIA.includes(palavraProduto)

                ) {

                    score += 40;
                    break;

                }

            }

        }

        // código OEM

        if (

            codigoIA &&
            normalizar(produto.codigo_original) === codigoIA

        ) {

            score += 1000;

        }

        // referências

        for (const ref of refsIA) {

            if (

                (produto.referencias || [])
                    .map(normalizar)
                    .includes(ref)

            ) {

                score += 800;

            }

        }

        // marca

        if (

            analise.marca &&
            normalizar(produto.marca)
                .includes(normalizar(analise.marca))

        ) {

            score += 150;

        }

        if (score > 0) {

            resultados.push({

                ...produto,

                score

            });

        }

    }

    resultados.sort((a, b) => b.score - a.score);

    console.log(
        "Resultados:",
        resultados.length
    );

    return resultados.slice(0, 5);

}
