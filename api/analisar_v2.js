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

        console.log("Imagem recebida.");

    } catch (erro) {

        console.error(erro);

        return res.status(500).json({
            status: "erro",
            mensagem: erro.message
        });

    }

}
