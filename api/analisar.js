import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).json({
      status: "ok",
      mensagem: "Envie uma imagem em Base64 usando POST.",
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

    const resposta = await openai.responses.create({

      model: "gpt-4.1",

      input: [

        {

          role: "user",

          content: [

            {
              type: "input_text",
              text: `Analise esta imagem.

Descreva apenas:

- qual peça parece ser
- fabricante provável
- máquina provável
- confiança de 0 a 100

Não invente informações.`

            },

            {

              type: "input_image",

              image_url: imagem

            }

          ]

        }

      ]

    });

    return res.status(200).json({

      status: "ok",

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
