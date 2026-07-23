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

    if (!analise) return [];

    if (!catalogo.length) return [];

    const resultados = [];

    const sinonimos = {
        faca: ["LAMINA", "LÂMINA", "SEGMENTO"],
        lamina: ["FACA", "LÂMINA", "SEGMENTO"],
        "lâmina": ["FACA", "LAMINA", "SEGMENTO"],
        segmento: ["FACA", "LAMINA", "LÂMINA"],
        barra: ["PLATAFORMA"],
        plataforma: ["BARRA"],
        corte: ["FACA", "LAMINA", "LÂMINA", "SEGMENTO"]
    };

    for (const produto of catalogo) {

        let score = 0;

        const nome = (produto.nome || "").toUpperCase();

        // ================================
// FILTRO INTELIGENTE POR TIPO
// ================================

const tipo = (
    analise.tipo_peca +
    " " +
    analise.nome_comercial
).toUpperCase();

if (
    tipo.includes("FACA") ||
    tipo.includes("LAMINA") ||
    tipo.includes("LÂMINA") ||
    tipo.includes("SEGMENTO")
) {

    if (
        !nome.includes("FACA") &&
        !nome.includes("LAMINA") &&
        !nome.includes("LÂMINA") &&
        !nome.includes("SEGMENTO")
    ) {
        continue;
    }

}

if (
    tipo.includes("ROLAMENTO")
) {

    if (!nome.includes("ROLAMENTO")) {
        continue;
    }

}

if (
    tipo.includes("POLIA")
) {

    if (!nome.includes("POLIA")) {
        continue;
    }

}

if (
    tipo.includes("ENGRENAGEM")
) {

    if (!nome.includes("ENGRENAGEM")) {
        continue;
    }

}

if (
    tipo.includes("CORRENTE")
) {

    if (!nome.includes("CORRENTE")) {
        continue;
    }

}
      
        // Código original
        if (
            analise.codigo_original &&
            produto.codigo_original &&
            analise.codigo_original.toUpperCase() === produto.codigo_original.toUpperCase()
        ) {
            score += 300;
        }

        // Referências
        if (
            Array.isArray(analise.referencias) &&
            Array.isArray(produto.referencias)
        ) {

            for (const ref of analise.referencias) {

                if (
                    produto.referencias.some(r =>
                        String(r).trim().toUpperCase() ===
                        String(ref).trim().toUpperCase()
                    )
                ) {
                    score += 200;
                }

            }

        }

        // Nome comercial
        if (analise.nome_comercial) {

            const palavras = analise.nome_comercial
                .toUpperCase()
                .split(/\s+/);

            for (const palavra of palavras) {

                if (palavra.length < 3) continue;

                if (nome.includes(palavra)) {
                    score += 25;
                }

                const lista = sinonimos[palavra.toLowerCase()];

                if (lista) {

                    for (const s of lista) {

                        if (nome.includes(s)) {
                            score += 20;
                        }

                    }

                }

            }

        }

        // Tipo da peça
        if (analise.tipo_peca) {

            const palavras = analise.tipo_peca
                .toUpperCase()
                .split(/\s+/);

            for (const palavra of palavras) {

                if (palavra.length < 3) continue;

                if (nome.includes(palavra)) {
                    score += 20;
                }

            }

        }

        // Marca
        if (
            analise.marca &&
            produto.marca &&
            analise.marca.toUpperCase() === produto.marca.toUpperCase()
        ) {
            score += 60;
        }

        // Categoria
        if (
            analise.categoria &&
            produto.categoria &&
            produto.categoria.toUpperCase().includes(
                analise.categoria.toUpperCase()
            )
        ) {
            score += 40;
        }

        // Penalização
        if (
            nome.includes("ROLAMENTO") ||
            nome.includes("RETENTOR") ||
            nome.includes("BUCHA") ||
            nome.includes("PARAFUSO")
        ) {
            score -= 40;
        }

        // Prioridade para facas
        if (
            nome.includes("FACA") ||
            nome.includes("LAMINA") ||
            nome.includes("LÂMINA") ||
            nome.includes("SEGMENTO")
        ) {
            score += 50;
        }

        if (score > 0) {

            resultados.push({
    id: produto.id || null,
    nome: produto.nome,
    marca: produto.marca,
    categoria: produto.categoria,
    codigo_original: produto.codigo_original,
    referencias: produto.referencias || [],
    imagem: produto.imagem || "",
    score
});

        }

    }

    resultados.sort((a, b) => b.score - a.score);

    return resultados.slice(0, 3);

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
