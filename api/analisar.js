import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      status: "ok",
      mensagem: "Envie uma imagem em Base64.",
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
              text: `
Você é um especialista em peças para máquinas agrícolas.

Analise cuidadosamente a imagem.

Identifique a peça somente quando houver evidências suficientes.

Nunca invente códigos.

Se algum campo não puder ser identificado, deixe vazio.

Responda SOMENTE um JSON válido exatamente neste formato:

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
              image_url: imagem
            }
          ]
        }
      ]
    });

    let resultado = resposta.output_text;

    try {
      resultado = JSON.parse(resultado);
    } catch {
      resultado = {
        resposta: resultado
      };
    }

    return res.status(200).json({
      status: "ok",
      resultado
    });

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({
      status: "erro",
      mensagem: erro.message
    });

  }
}
