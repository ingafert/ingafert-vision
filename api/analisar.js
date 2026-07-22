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
      mensagem: "API Ingafert Vision",
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

Você trabalha exclusivamente com peças agrícolas.

Conhece profundamente:

- John Deere
- New Holland
- Case IH
- Massey Ferguson
- Valtra
- Jacto
- Jumil
- Planti Center
- Baldan
- Tatu Marchesan
- Stara
- GTS
- Semeato

Analise cuidadosamente:

- formato
- material
- cor
- desgaste
- furos
- rolamentos
- estrias
- dentes
- chavetas
- parafusos
- soldas
- etiquetas
- logotipos
- gravações
- números fundidos
- números estampados
- QR Code
- código de barras

Sempre procure identificar:

- marca
- fabricante
- código original
- referências
- aplicação
- compatibilidade

Nunca invente códigos.

Se não conseguir ler um número deixe vazio.

Responda APENAS um JSON.

Formato:

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
          descricao: texto
        };

      }

    }

    resultado = normalizarResultado(resultado);

    const produto = buscarProduto(resultado);

    return res.status(200).json({

      status: "ok",

      analise: resultado,

      produto,

      score: resultado.nivel_confianca

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

  if (!catalogo.length) return null;

  const referencias = analise.referencias || [];

  for (const produto of catalogo) {

    if (!produto.referencias) continue;

    for (const ref of referencias) {

      const encontrou = produto.referencias.some(r =>
        String(r).trim().toUpperCase() ===
        String(ref).trim().toUpperCase()
      );

      if (encontrou) {
        return produto;
      }

    }

  }

  return null;

}

function normalizarResultado(resultado = {}) {

  return {

    tipo_peca: resultado.tipo_peca || "",

    nome_comercial: resultado.nome_comercial || "",

    marca: resultado.marca || "",

    modelo: resultado.modelo || "",

    categoria: resultado.categoria || "",

    codigo_original: resultado.codigo_original || "",

    referencias: Array.isArray(resultado.referencias)
      ? resultado.referencias
      : [],

    fabricante: resultado.fabricante || "",

    descricao: resultado.descricao || "",

    compatibilidade: Array.isArray(resultado.compatibilidade)
      ? resultado.compatibilidade
      : [],

    nivel_confianca: Number(resultado.nivel_confianca || 0),

    observacoes: resultado.observacoes || ""

  };

}
