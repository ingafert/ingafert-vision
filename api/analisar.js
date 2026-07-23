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

return res.status(200).json({
    status: "ok",
    analise: resultado,
    produto: produtos.length ? produtos[0] : null,
    produtos,
    score: produtos.length ? produtos[0].score : 0
});
    
  } catch (erro) {

    console.error(erro);

    return res.status(500).json({

      status: "erro",

      mensagem: erro.message

    });

  }

}
function normalizar(texto) {

    if (texto === null || texto === undefined)
        return "";

    return texto
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}
function palavras(texto) {

    return normalizar(texto)
        .split(" ")
        .filter(p =>
            p.length > 2 &&
            ![
                "para",
                "com",
                "sem",
                "dos",
                "das",
                "de",
                "da",
                "do",
                "em",
                "no",
                "na",
                "e"
            ].includes(p)
        );

}

function buscarProdutos(analise) {

    const resultados = [];

    console.log("Produtos no catálogo:", catalogo.length);

    const palavrasIA = [
    
      console.log("Palavras IA:", palavrasIA);
  
        ...palavras(analise.tipo_peca),

        ...palavras(analise.nome_comercial),

        ...palavras(analise.descricao),

        ...palavras(analise.categoria)

    ];

    const codigoIA = normalizar(
        analise.codigo_original || ""
    );

    const refsIA =
        (analise.referencias || []).map(normalizar);

    for (const produto of catalogo) {

        let score = 0;

        const textoProduto = [

            produto.nome,

            produto.descricao,

            produto.marca,

            produto.categoria

            if (produto.nome.toLowerCase().includes("flange")) {
    console.log("Produto flange:", produto.nome);
}

        ].join(" ");

        const palavrasProduto = palavras(textoProduto);

        // procura palavras

        for (const palavra of palavrasIA) {

           for (const palavraProduto of palavrasProduto) {

    if (
        palavraProduto.includes(palavra) ||
        palavra.includes(palavraProduto)
    ) {

        score += 40;
        break;

    }

        }

        // código OEM

        if (

            codigoIA &&

            normalizar(produto.codigo_original) === codigoIA

        ) {

            score += 1000;

        }

        // referências

        for (const ref of refsIA) {

            if (

                (produto.referencias || [])

                    .map(normalizar)

                    .includes(ref)

            ) {

                score += 800;

            }

        }

        // marca

        if (

            analise.marca &&

            normalizar(produto.marca)

                .includes(normalizar(analise.marca))

        ) {

            score += 150;

        }

        if (score > 0) {

            resultados.push({

                ...produto,

                score

            });

        }

    }

    resultados.sort(

        (a, b) => b.score - a.score

    );

    console.log("Resultados encontrados:", resultados.length);

if (resultados.length) {
    console.log(resultados.slice(0, 5));
}
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
