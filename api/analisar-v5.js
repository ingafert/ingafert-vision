import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Carrega o catálogo local
function carregarCatalogo() {
  try {
    const arquivo = path.join(process.cwd(), "catalogo.json");
    const conteudo = fs.readFileSync(arquivo, "utf8");
    const json = JSON.parse(conteudo);

    // Se o catálogo vier como array [...]
    if (Array.isArray(json)) {
      return {
        produtos: json
      };
    }

    // Se já vier como { produtos: [...] }
    if (json.produtos) {
      return json;
    }

    // Segurança
    return {
      produtos: []
    };

  } catch (erro) {
    console.error("❌ Erro ao ler catalogo.json:", erro.message);
    return {
      produtos: []
    };
  }
}

// Função inteligente de busca (não precisa ser perfeita, mas funciona bem)
function buscarProduto(analise) {
  const catalogo = carregarCatalogo();
  const produtos = catalogo.produtos || [];

  console.log("Total produtos:", produtos.length);
console.log("Primeiro produto:", produtos[0]);

console.log("Nome IA:", analise.nome);
console.log("Código IA:", analise.codigo_original);
console.log("Referências IA:", analise.referencias);
  
  const nomeIA = (analise.nome || "").toLowerCase();
  const refsIA = Array.isArray(analise.referencias) 
    ? analise.referencias.map(r => String(r).toLowerCase()) 
    : [];
  const codIA = String(analise.codigo_original || "").toLowerCase();

  // Tenta achar por referência exata ou parcial
  for (const p of produtos) {
    const refsProd = [];
    console.log({
  nome: p.nome,
  codigo_original: p.codigo_original,
  referencia: p.referencia,
  referencias: p.referencias
});
    if (p.referencia) refsProd.push(String(p.referencia));
    if (p.codigo_original) refsProd.push(String(p.codigo_original));
    if (Array.isArray(p.referencias)) refsProd.push(...p.referencias.map(String));
    
    const refsBaixas = refsProd.map(r => r.toLowerCase());

    for (const rIA of refsIA) {
      for (const rP of refsBaixas) {
        if (rP.includes(rIA) || rIA.includes(rP) || rP === rIA) {
          return p;
        }
      }
    }

    if (codIA && refsBaixas.some(r => r === codIA || r.includes(codIA) || codIA.includes(r))) {
      return p;
    }
  }

  // Se não achou por código, tenta por nome (palavras-chave)
  const palavrasIA = nomeIA.split(/\s+/).filter(w => w.length > 3);
  for (const p of produtos) {
    const nomeProd = (p.nome || "").toLowerCase();
    if (palavrasIA.some(w => nomeProd.includes(w))) {
      return p;
    }
  }

  return null; // Não encontrou
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || "";
  const permitidos = [
    "https://www.ingafert.com.br",
    "https://ingafert.com.br",
    "https://ingafert-vision.vercel.app",
    "http://localhost:3000"
  ];

  if (permitidos.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      versao: "Ingafert Vision v5 - Catálogo Ativo",
      catalogo_carregado: carregarCatalogo().produtos?.length || 0
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "erro",
      mensagem: "Método não permitido"
    });
  }

  try {
    const { imagem } = req.body;

    if (!imagem) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Faltou enviar o campo 'imagem' (base64)"
      });
    }

    // Chama a OpenAI
    const resposta = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Você é especialista em peças agrícolas da empresa Ingafert.
Analise a foto enviada e retorne APENAS um JSON válido (sem explicações, sem markdown) com este formato exato:

{
  "nome": "nome da peça identificada",
  "marca": "fabricante ou marca",
  "codigo_original": "código principal visto na imagem ou inferido",
  "referencias": ["ref1", "ref2"],
  "descricao": "descrição técnica breve da peça",
  "confianca": 0.85,
  "observacoes": "alguma observação técnica se relevante"
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

    const textoBruto = resposta.output_text ? resposta.output_text.trim() : "";
    
    // Limpa possíveis crases do JSON
    let textoLimpo = textoBruto.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let analise = JSON.parse(textoLimpo);

    if (!analise.referencias) analise.referencias = [];
    if (!analise.confianca) analise.confianca = 0.7;

    // BUSCA NO CATÁLOGO
    const produtoEncontrado = buscarProduto(analise);

    const resultado = {
      status: "ok",
      versao: "v5",
      analise: analise,
      produto: produtoEncontrado ? {
        id: produtoEncontrado.id,
        nome: produtoEncontrado.nome,
        marca: produtoEncontrado.marca,
        referencia: produtoEncontrado.referencia || produtoEncontrado.codigo_original || "",
        referencias: produtoEncontrado.referencias || [],
        descricao: produtoEncontrado.descricao || "",
        url:
  produtoEncontrado.url ||
  (produtoEncontrado.slug
    ? `https://ingafert.com.br/produto/${produtoEncontrado.slug}`
    : ""),
        foto: produtoEncontrado.foto || "",
        aplicacao: produtoEncontrado.aplicacao || "",
        maquinas: produtoEncontrado.maquinas || []
      } : null
    };

    console.log("🤖 IA identificou:", analise.nome);
    console.log("📦 Catálogo:", produtoEncontrado ? "ENCONTRADO (" + produtoEncontrado.id + ")" : "NÃO ENCONTRADO");

    return res.status(200).json(resultado);

  } catch (erro) {
    console.error("❌ Erro v5:", erro);
    return res.status(500).json({
      status: "erro",
      mensagem: erro.message || "Erro interno"
    });
  }
}
