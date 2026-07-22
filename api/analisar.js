import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      erro: "Método não permitido"
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
