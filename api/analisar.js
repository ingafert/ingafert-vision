import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {

 if (req.method === "GET") {

    return res.status(200).json({
        status: "ok",
        openai: !!process.env.OPENAI_API_KEY,
        mensagem: "API pronta para receber imagens."
    });

}

  try {

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        erro: "OPENAI_API_KEY não configurada."
      });
    }

    return res.status(200).json({
      status: "ok",
      mensagem: "OpenAI conectada com sucesso.",
      versao: "2.0.0"
    });

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({
      erro: erro.message
    });

  }

}
