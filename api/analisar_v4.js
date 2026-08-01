import OpenAI from "openai";
import Jimp from "jimp";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== HELPER: Compressão de imagem =====
async function comprimirImagem(base64String) {
  try {
    // Remove o prefixo data:image/...;base64,
    const base64Data = base64String.split(",")[1] || base64String;
    const buffer = Buffer.from(base64Data, "base64");
    
    // Lê e redimensiona
    const image = await Jimp.read(buffer);
    image.resize({ w: 1024, h: 1024, fit: "contain" });
    
    // Comprime para JPEG 75%
    const compressed = await image.toDataURL("image/jpeg", { quality: 0.75 });
    return compressed;
  } catch (erro) {
    console.log("Compressão falhou, usando original:", erro.message);
    return base64String; // Fallback ao original
  }
}

// ===== HELPER: Busca fuzzy (parecidos) =====
function calcularSimilaridade(str1, str2) {
  const s1 = String(str1).toLowerCase().trim();
  const s2 = String(str2).toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // Levenshtein simplificado
  let match = 0;
  const minLen = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) match++;
  }
  
  return match / Math.max(s1.length, s2.length);
}

// ===== HELPER: Busca inteligente no catálogo =====
function buscarNoCatalogo(analise, produtos) {
  
  // PASSO 1: Busca exata por referência
  const referenciasIA = [
    analise.codigo_original,
    ...(analise.referencias || [])
  ]
    .filter(Boolean)
    .map(r => String(r).trim().toUpperCase());

  for (const item of produtos) {
    const referenciasProduto = [
      item.referencia,
      item.codigo_original,
      ...(item.referencias || [])
    ]
      .filter(Boolean)
      .map(r => String(r).trim().toUpperCase());

    if (referenciasIA.some(ref => referenciasProduto.includes(ref))) {
      return { produto: item, confianca: 1.0, tipo: "referencia_exata" };
    }
  }

  // PASSO 2: Busca por nome + marca
  const nomesIA = [analise.nome, analise.descricao].filter(Boolean);
  const marcasIA = [analise.marca].filter(Boolean);

  let melhorMatch = null;
  let melhorScore = 0.6; // Mínimo 60%

  for (const item of produtos) {
    // Score por nome
    let scoreNome = 0;
    for (const nomeIA of nomesIA) {
      const sim = calcularSimilaridade(nomeIA, item.nome);
      scoreNome = Math.max(scoreNome, sim);
    }

    // Score por marca
    let scoreMarca = 0;
    if (analise.marca && item.marca) {
      scoreMarca = calcularSimilaridade(analise.marca, item.marca) * 0.3;
    }

    const scoreTotal = scoreNome * 0.7 + scoreMarca;

    if (scoreTotal > melhorScore) {
      melhorScore = scoreTotal;
      melhorMatch = { produto: item, confianca: Math.min(0.95, scoreTotal), tipo: "nome_marca" };
    }
  }

  if (melhorMatch) {
    return melhorMatch;
  }

  // PASSO 3: Busca por aplicação (John Deere, série, etc.)
  const aplicacao = (analise.descricao || "").toLowerCase();
  
  for (const item of produtos) {
    const itemDesc = (item.descricao || "").toLowerCase();
    const itemAplicacao = (item.aplicacao || "").toLowerCase();
    
    // Procura por marcas conhecidas
    const marcasAgricolas = ["john deere", "case", "new holland", "massey ferguson", "valtra"];
    
    for (const marca of marcasAgricolas) {
      if (aplicacao.includes(marca)) {
        if (itemDesc.includes(marca) || itemAplicacao.includes(marca)) {
          return { 
            produto: item, 
            confianca: 0.75, 
            tipo: "aplicacao_marca" 
          };
        }
      }
    }
  }

  return null;
}

// ===== HANDLER PRINCIPAL =====
export default async function handler(req, res) {
  
  // CORS
  const origin = req.headers.origin || "";
  const permitidos = [
    "https://www.ingafert.com.br",
    "https://ingafert.com.br",
    "https://ingafert-vision.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001"
  ];

  if (permitidos.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      versao: "Ingafert Vision 4.1 - CORRIGIDO"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "erro",
      mensagem: "Método não permitido."
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

    // Comprime a imagem antes de enviar
    console.log("Comprimindo imagem...");
    const imagemComprimida = await comprimirImagem(imagem);

    // ===== CHAMADA OPENAI CORRIGIDA =====
    console.log("Enviando para GPT-4o...");
    
    const resposta = await openai.chat.completions.create({
      model: "gpt-4o", // Modelo correto com visão
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Você é um especialista em peças agrícolas de máquinas como John Deere, Case IH, New Holland, Massey Ferguson, Valtra e similares.

Analise CUIDADOSAMENTE esta fotografia de uma peça agrícola.

INSTRUÇÕES CRÍTICAS:
1. NUNCA deixe campos vazios - sempre retorne algo, mesmo com baixa confiança
2. Se não tiver certeza total, indique confiança menor (0.5-0.7)
3. SEMPRE procure por referências equivalentes (códigos paralelos)
4. Inclua variações de código: John Deere (xxxxx), New Holland, Case, Massey Ferguson, etc
5. Analise também cor, formato, tamanho e material para encontrar equivalentes
6. Se existirem múltiplas referências válidas, RETORNE TODAS

RESPONDA APENAS COM ESTE JSON (sem markdown, sem explicações):

{
  "nome": "Nome exato da peça em português",
  "marca": "Fabricante principal",
  "codigo_original": "Código mais comum ou original",
  "referencias": ["REF1", "REF2", "REF3"],
  "descricao": "Descrição técnica curta (máquina, série, função)",
  "confianca": 0.85
}

Exemplo correto:
{
  "nome": "Polia do Alimentador",
  "marca": "John Deere OEM",
  "codigo_original": "AH219367",
  "referencias": ["AH219367", "AL169142", "CH12725"],
  "descricao": "Polia do sistema alimentador para colheitadeiras John Deere série 9400, 9500, 9600",
  "confianca": 0.92
}
`
            },
            {
              type: "image_url",
              image_url: {
                url: imagemComprimida,
                detail: "high"
              }
            }
          ]
        }
      ]
    });

    // ===== PROCESSAMENTO DA RESPOSTA CORRIGIDO =====
    const textoBruto = resposta.choices[0].message.content.trim();
    
    console.log("Resposta bruta da IA:", textoBruto);

    // Remove markdown se existir
    let texto = textoBruto
      .replace(/^```json\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let analise;
    try {
      analise = JSON.parse(texto);
    } catch (e) {
      console.error("Erro ao fazer parse JSON:", e);
      // Fallback: retorna resposta bruta
      return res.status(400).json({
        status: "erro",
        mensagem: "IA não retornou JSON válido",
        resposta_bruta: textoBruto
      });
    }

    // Garante valores default
    analise.nome = analise.nome || "Peça agrícola não identificada";
    analise.marca = analise.marca || "";
    analise.codigo_original = analise.codigo_original || "";
    analise.referencias = Array.isArray(analise.referencias) ? analise.referencias : [];
    analise.descricao = analise.descricao || "";
    analise.confianca = Math.max(0.3, Math.min(1, analise.confianca || 0.5));

    // ===== BUSCA NO CATÁLOGO =====
    console.log("Buscando no catálogo...");
    
    const respostaCatalogo = await fetch(
      "https://ingafert-vision.vercel.app/api/catalogo"
    );

    if (!respostaCatalogo.ok) {
      throw new Error("Catálogo indisponível");
    }

    const catalogo = await respostaCatalogo.json();
    const produtos = Array.isArray(catalogo.produtos) ? catalogo.produtos : [];

    console.log(`Catálogo tem ${produtos.length} produtos`);

    // Busca inteligente
    const resultadoBusca = buscarNoCatalogo(analise, produtos);

    let produto = {
      encontrou: false,
      nome: analise.nome,
      marca: analise.marca,
      descricao: analise.descricao,
      referencias: analise.referencias,
      foto: "",
      url: ""
    };

    if (resultadoBusca && resultadoBusca.produto) {
      const p = resultadoBusca.produto;
      
      produto = {
        encontrou: true,
        nome: p.nome || analise.nome,
        marca: p.marca || analise.marca,
        descricao: p.descricao || analise.descricao,
        referencias: [
          ...(p.referencias || []),
          p.referencia,
          p.codigo_original
        ]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i), // Remove duplicatas
        foto: p.foto || "",
        url: p.url || "",
        tipo_busca: resultadoBusca.tipo
      };

      // Aumenta confiança se encontrou no catálogo
      analise.confianca = Math.min(1, analise.confianca + 0.1);
    } else {
      console.log("Produto NÃO encontrado no catálogo");
    }

    return res.status(200).json({
      status: "ok",
      analise,
      produto,
      debug: {
        modelo_ia: "gpt-4o",
        compressao: "ativada",
        busca_tipo: resultadoBusca?.tipo || "nenhuma"
      }
    });

  } catch (erro) {
    console.error("ERRO COMPLETO:", erro);

    return res.status(500).json({
      status: "erro",
      mensagem: erro.message,
      erro_tipo: erro.constructor.name
    });
  }
}
