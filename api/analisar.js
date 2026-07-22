import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {

  try {

    const resposta = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: "Responda apenas com a palavra: OK"
    });

    return res.status(200).json({
      status: "ok",
      openai: true,
      resposta: resposta.output_text
    });

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({
      status: "erro",
      mensagem: erro.message
    });

  }

}
