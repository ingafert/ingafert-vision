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

                            text: `Você é um especialista em peças agrícolas.


Sua missão é identificar a peça da imagem com a maior precisão possível.

Regras:

- Observe atentamente o formato da peça.
- Observe furos, rasgos, dentes, roscas, chavetas, rolamentos, soldas e acabamento.
- Leia qualquer gravação, número, letra ou logotipo existente.
- Nunca invente códigos ou referências.
- Se não tiver certeza, informe apenas o que realmente conseguir identificar.

Responda SOMENTE neste JSON:

{
  "nome":"",
  "marca":"",
  "codigo_original":"",
  "referencias":[],
  "descricao":""
}`

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

        // ==========================
        // LINK GOOGLE
        // ==========================

        const pesquisa = encodeURIComponent(

            [
                "site:ingafert.com.br",
                analise.nome,
                analise.marca,
                analise.codigo_original
            ]

            .filter(Boolean)

            .join(" ")

        );

        const google =
            `https://www.google.com/search?q=${pesquisa}`;

        // ==========================
        // RETORNO
        // ==========================

        return res.status(200).json({

            status: "ok",

            analise,

            google

        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({

            status: "erro",

            mensagem: erro.message

        });

    }

}
