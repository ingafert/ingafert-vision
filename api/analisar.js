import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let catalogo = [];

try {

  catalogo = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "dados", "catalogo.json"),
      "utf8"
    )
  );

} catch (e) {

  console.log("Catálogo ainda vazio.");

  catalogo = [];

}

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
      reasoning: {
  effort: "high"
},

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
            text: `
Você é um especialista em peças para máquinas agrícolas.

Sua missão é identificar a peça da imagem com a maior precisão possível.

Analise cuidadosamente:

- formato da peça;
- material;
- cor;
- desgaste;
- furos;
- rolamentos;
- dentes;
- estrias;
- chavetas;
- parafusos;
- soldas;
- etiquetas;
- logotipos;
- gravações;
- números fundidos;
- números estampados;
- QR Codes;
- códigos de barras;
- inscrições em baixo relevo.

Sempre tente localizar:

• Marca
• Modelo
• Código Original
• Referência
• Fabricante

Nunca invente um código.

Se não conseguir ler um número, deixe o campo vazio.

Retorne APENAS JSON válido.

Formato obrigatório:

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

    let resultado;

try {

    resultado = JSON.parse(resposta.output_text);

} catch (e) {

    const texto = resposta.output_text;

    const inicio = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");

    if (inicio !== -1 && fim !== -1) {

        resultado = JSON.parse(
            texto.substring(inicio, fim + 1)
        );

    } else {

        resultado = {
            tipo_peca: "",
            nome_comercial: "",
            marca: "",
            modelo: "",
            categoria: "",
            codigo_original: "",
            referencias: [],
            fabricante: "",
            descricao: texto,
            compatibilidade: [],
            nivel_confianca: 0,
            observacoes: "Não foi possível interpretar o JSON."
        };

    }

}
    const produto = buscarProduto(resultado);
    
    return res.status(200).json({

    status: "ok",

    analise: resultado,

    produto,

    score: resultado.nivel_confianca || 90

});

  } catch (erro) {

    console.error(erro);

    return res.status(500).json({
      status: "erro",
      mensagem: erro.message
    });

  }
}

function buscarProduto(analise) {

    if (!analise) return null;

    const referencias = analise.referencias || [];

    for (const produto of catalogo) {

        if (!produto.referencias) continue;

        for (const ref of referencias) {

            const encontrou = produto.referencias.some(r =>
                String(r).toUpperCase().trim() ===
                String(ref).toUpperCase().trim()
            );

            if (encontrou) {
                return produto;
            }

        }

    }

    return null;

}
