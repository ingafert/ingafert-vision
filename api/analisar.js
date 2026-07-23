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
      path.join(process.cwd(), "dados", "catalogo_vision.json"),
      "utf8"
    )
  );
} catch (e) {
  console.log("Catálogo ainda vazio.");
  catalogo = [];
}

export default async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "https://www.ingafert.com.br");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
    return res.status(200).end();
}
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
      console.log(resposta.output_text);
      resultado = JSON.parse(resposta.output_text);

    } catch (e) {

      const texto = resposta.output_text;

      const inicio = texto.indexOf("{");
      const fim = texto.lastIndexOf("}");

      if (inicio !== -1 && fim !== -1) {
        console.log(resposta.output_text);
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

    const produtos = buscarProdutos(resultado);
    const produto = produtos.length ? produtos[0] : null;
    
    return res.status(200).json({

    status:"ok",

    analise:resultado,

    produto,

    produtos,

    score:resultado.nivel_confianca

});
    
  } catch (erro) {

    console.error(erro);

    return res.status(500).json({

      status: "erro",

      mensagem: erro.message

    });

  }

}

function buscarProdutos(analise) {

    const texto = normalizar(
        [
            analise.tipo,
            analise.categoria,
            analise.descricao,
            ...(analise.referencias || [])
        ].join(" ")
    );

    const marcaIA = normalizar(analise.marca || "");
    const codigoIA = normalizar(analise.codigo || "");

    const resultados = [];

    for (const produto of catalogo) {

        let score = 0;

        const nome = normalizar(produto.nome || "");
        const categoria = normalizar(produto.categoria || "");
        const marca = normalizar(produto.marca || "");
        const codigo = normalizar(
    produto.codigo_original ||
    produto.codigo ||
    produto.referencia ||
    ""
);
        // Código original
        if (codigoIA && codigo === codigoIA)
            score += 1000;

        // Referências
        const referencias = Array.isArray(produto.referencias)
    ? produto.referencias
    : [];

for (const ref of referencias) {

    const r = normalizar(ref);

    if (!r)
        continue;

    if (codigoIA && r === codigoIA)
        score += 800;

    if (texto.includes(r))
        score += 300;
}

        // Marca

        if (marcaIA && marca === marcaIA)
            score += 200;

        // Categoria

        if (categoria && texto.includes(categoria))
            score += 150;

        // Nome

        const palavras = nome.split(" ");

        for (const palavra of palavras) {

            if (palavra.length < 4)
                continue;

            if (texto.includes(palavra))
                score += 40;

        }

        if (score > 0) {

            resultados.push({

                ...produto,

                score

            });

        }

    }

    resultados.sort((a, b) => b.score - a.score);

    return resultados.slice(0, 5);

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
