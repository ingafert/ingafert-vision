import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

/* ================================================================
   INGAFERT VISION AI — v5.1 (corrigido)
   ================================================================ */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const WHATSAPP = "5544991761851";
const ORIGENS = [
  "https://www.ingafert.com.br",
  "https://ingafert.com.br"
];

/* =================== CARREGAR CATÁLOGO =================== */

let _catalogo = null;

function carregarCatalogo() {
  if (_catalogo) return _catalogo;

  const possiveis = [
    path.join(process.cwd(), "catalogo.json"),
    path.join(process.cwd(), "dados", "catalogo.json"),
    path.join(process.cwd(), "dados", "produtos.json")
  ];

  for (const caminho of possiveis) {
    if (fs.existsSync(caminho)) {
      _catalogo = JSON.parse(fs.readFileSync(caminho, "utf8"));
      console.log("[catálogo] carregado:", caminho,
        "|", (_catalogo.produtos || []).length, "produtos");
      return _catalogo;
    }
  }

  throw new Error("Catálogo não encontrado. Verifique catalogo.json na raiz.");
}

/* =================== NORMALIZAÇÃO =================== */

function norm(s) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function normTexto(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  var prev = [];
  for (var j = 0; j <= b.length; j++) prev[j] = j;
  for (var i = 1; i <= a.length; i++) {
    var cur = [i];
    for (var jj = 1; jj <= b.length; jj++) {
      cur[jj] = Math.min(
        prev[jj] + 1,
        cur[jj - 1] + 1,
        prev[jj - 1] + (a[i - 1] === b[jj - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/* =================== BUSCA NO CATÁLOGO =================== */

function buscarProduto(analise) {
  var catalogo = carregarCatalogo();
  var produtos = catalogo.produtos || [];
  var resultados = [];

  // Códigos que a IA leu da foto
  var codigosIA = [];
  if (Array.isArray(analise.codigos_visiveis)) {
    codigosIA = analise.codigos_visiveis
      .map(function(c) { return String(c || "").trim(); })
      .filter(function(c) { return c.length >= 3; });
  }
  if (analise.codigo_provavel && analise.codigo_provavel.length >= 3) {
    codigosIA.push(analise.codigo_provavel);
  }

  // Normalizar códigos da IA
  var codigosIANorm = codigosIA.map(norm).filter(function(c) {
    return c.length >= 3;
  });

  console.log("[busca] Códigos da IA:", codigosIA);
  console.log("[busca] Produtos no catálogo:", produtos.length);

  for (var i = 0; i < produtos.length; i++) {
    var p = produtos[i];
    var score = 0;
    var motivo = "";

    // 1) Colete TODOS os códigos do produto
    var refsProd = [];
    if (p.codigo_original) refsProd.push(String(p.codigo_original));
    if (p.sku) refsProd.push(String(p.sku));
    if (p.referencia) refsProd.push(String(p.referencia));
    if (Array.isArray(p.referencias)) {
      for (var r = 0; r < p.referencias.length; r++) {
        refsProd.push(String(p.referencias[r]));
      }
    }
    // Também pegar códigos_fortes se existir
    if (Array.isArray(p.codigos_fortes)) {
      for (var cf = 0; cf < p.codigos_fortes.length; cf++) {
        refsProd.push(String(p.codigos_fortes[cf]));
      }
    }

    // Normalizar todos
    var refsProdNorm = refsProd
      .map(norm)
      .filter(function(x) { return x.length >= 3; });

    // 2) Comparar cada código da IA com cada código do produto
    for (var ci = 0; ci < codigosIANorm.length; ci++) {
      var codIA = codigosIANorm[ci];

      for (var ri = 0; ri < refsProdNorm.length; ri++) {
        var refProd = refsProdNorm[ri];

        // Exato
        if (codIA === refProd) {
          score = 100;
          motivo = "código exato";
          break;
        }

        // Contido
        if (codIA.length >= 5 && refProd.includes(codIA)) {
          if (score < 88) { score = 88; motivo = "código contido no catálogo"; }
        }
        if (refProd.length >= 5 && codIA.includes(refProd)) {
          if (score < 85) { score = 85; motivo = "código da IA contém o do catálogo"; }
        }

        // Aproximado (1 erro de digitação)
        var maxLen = Math.max(codIA.length, refProd.length);
        if (maxLen >= 5) {
          var d = levenshtein(codIA, refProd);
          if (d === 1 && score < 76) {
            score = 76;
            motivo = "código aproximado (1 dígito diferente)";
          }
          if (d === 2 && maxLen >= 8 && score < 64) {
            score = 64;
            motivo = "código aproximado (2 dígitos diferentes)";
          }
        }
      }
      if (score >= 100) break;
    }

    // 3) Se não achou por código, tenta por nome (peso menor)
    if (score === 0 && analise.nome) {
      var nomeIA = normTexto(analise.nome);
      var nomeProd = normTexto(p.nome || "");

      if (nomeProd && nomeIA) {
        var palavrasIA = nomeIA.split(" ").filter(function(w) { return w.length > 2; });
        var palavrasProd = nomeProd.split(" ").filter(function(w) { return w.length > 2; });
        var hits = 0;
        for (var wi = 0; wi < palavrasIA.length; wi++) {
          if (palavrasProd.indexOf(palavrasIA[wi]) !== -1) hits++;
        }
        if (palavrasIA.length > 0) {
          var pct = hits / palavrasIA.length;
          if (pct >= 0.6) {
            score = Math.round(pct * 50); // máximo 50 por nome
            motivo = "nome similar (peso baixo)";
          }
        }
      }
    }

    if (score > 0) {
      resultados.push({
        produto: p,
        score: score,
        motivo: motivo,
        refs: refsProd
      });
    }
  }

  // Ordenar por score decrescente
  resultados.sort(function(a, b) { return b.score - a.score; });

  console.log("[busca] Top 3:");
  for (var t = 0; t < Math.min(3, resultados.length); t++) {
    console.log("  ", resultados[t].score, resultados[t].motivo,
      "|", resultados[t].produto.nome);
  }

  return resultados;
}

/* =================== SCHEMA DA IA =================== */

var SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    codigos_visiveis: { type: "array", items: { type: "string" } },
    codigo_provavel: { type: "string" },
    tipo_peca: { type: "string" },
    nome: { type: "string" },
    marca_visivel: { type: "string" },
    material: { type: "string" },
    caracteristicas: { type: "array", items: { type: "string" } },
    descricao: { type: "string" },
    qualidade_imagem: { type: "string", enum: ["boa", "media", "ruim"] },
    codigo_legivel: { type: "boolean" },
    confianca: { type: "number" }
  },
  required: [
    "codigos_visiveis", "codigo_provavel", "tipo_peca", "nome",
    "marca_visivel", "material", "caracteristicas", "descricao",
    "qualidade_imagem", "codigo_legivel", "confianca"
  ]
};

var PROMPT = "Voce e um especialista em identificacao de pecas agricolas.\n\n" +
  "REGRAS SOBRE CODIGOS:\n" +
  "1. \"codigos_visiveis\" = APENAS codigos que voce LE na imagem.\n" +
  "2. Caractere ilegelize = use \"?\" (ex: \"AH2193?7\")\n" +
  "3. PROIBIDO inventar codigos.\n" +
  "4. Sem codigo = retorne [] e codigo_legivel = false.\n\n" +
  "DEMAIS CAMPOS:\n" +
  "- tipo_peca: uma ou duas palavras\n" +
  "- nome: nome tecnico em portugues\n" +
  "- marca_visivel: so se houver logotipo visivel\n" +
  "- confianca: 0 a 1";

/* =================== FUNÇÕES AUXILIARES =================== */

function resumo(p) {
  // Monta a URL correta do produto
  var url = p.url || "";
  var foto = p.foto || "";

  // Se a URL não começa com http, monta a partir do domínio
  if (url && !url.startsWith("http")) {
    url = "https://www.ingafert.com.br" + (url.startsWith("/") ? "" : "/") + url;
  }

  // Se não tem URL mas tem slug, tenta montar
  if (!url && p.slug) {
    url = "https://www.ingafert.com.br/produto/" + p.slug;
  }

  // Se não tem URL mas tem nome, gera slug
  if (!url && p.nome) {
    var slug = p.nome.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (p.sku) slug = slug + "-" + p.sku.toLowerCase();
    url = "https://www.ingafert.com.br/produto/" + slug;
  }

  return {
    id: p.id || "",
    nome: p.nome || "Não identificado",
    marca: p.marca || "",
    codigo: p.codigo_original || p.sku || p.referencia || "",
    referencias: p.referencias || [],
    descricao: (p.descricao || "").slice(0, 320),
    maquinas: p.maquinas || [],
    preco: p.preco || null,
    disponivel: p.disponivel !== false,
    foto: foto,
    url: url
  };
}

function montarWhats(dados) {
  var analise = dados.analise || {};
  var maquina = dados.maquina || "";
  var melhor = dados.melhor || null;

  var linhas = [
    "Olá! Identifiquei uma peça pelo Ingafert Vision AI:",
    ""
  ];

  if (analise.nome) linhas.push("Peça: " + analise.nome);
  if (analise.tipo_peca) linhas.push("Tipo: " + analise.tipo_peca);

  var codigos = (analise.codigos_visiveis || []).filter(Boolean);
  if (codigos.length) linhas.push("Código lido: " + codigos.join(" / "));
  if (analise.marca_visivel) linhas.push("Marca: " + analise.marca_visivel);
  if (maquina) linhas.push("Máquina: " + maquina);

  if (melhor) {
    linhas.push("", "Possível equivalente: " + melhor.nome);
    if (melhor.codigo_original) linhas.push("Código: " + melhor.codigo_original);
  }

  linhas.push("", "Podem confirmar disponibilidade e preço?");

  var texto = linhas.join("\n");
  return {
    numero: WHATSAPP,
    texto: texto,
    url: "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto)
  };
}

/* =================== HANDLER =================== */

export default async function handler(req, res) {

  // CORS
  var origin = req.headers.origin || "";
  if (ORIGENS.indexOf(origin) !== -1 || /\.vercel\.app$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET: status
  if (req.method === "GET") {
    try {
      var cat = carregarCatalogo();
      var total = (cat.produtos || []).length;
      return res.status(200).json({
        status: "ok",
        versao: "Ingafert Vision 5.1",
        total_produtos: total,
        openai: !!process.env.OPENAI_API_KEY
      });
    } catch (e) {
      return res.status(500).json({ status: "erro", mensagem: e.message });
    }
  }

  // POST: analisar
  if (req.method !== "POST") {
    return res.status(405).json({ status: "erro", mensagem: "Método não permitido." });
  }

  var t0 = Date.now();

  try {
    var imagem = (req.body || {}).imagem || "";
    var maquina = (req.body || {}).maquina || "";

    if (!imagem || !/^data:image\//.test(imagem)) {
      return res.status(400).json({ status: "erro", mensagem: "Imagem inválida." });
    }
    if (imagem.length > 5500000) {
      return res.status(413).json({ status: "erro", mensagem: "Imagem muito grande." });
    }

    // 1) VISÃO
    console.log("[v5] Chamando IA...");
    var prompt = PROMPT;
    if (maquina) {
      prompt += "\n\nCONTEXTO — máquina informada: \"" + maquina + "\".";
    }

    var resposta = await openai.responses.create({
      model: "gpt-4.1",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imagem, detail: "high" }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "analise_peca",
          strict: true,
          schema: SCHEMA
        }
      }
    });

    var analise;
    try {
      analise = JSON.parse(String(resposta.output_text).trim());
    } catch (e) {
      return res.status(502).json({
        status: "erro",
        mensagem: "Formato inesperado da IA.",
        bruto: String(resposta.output_text).slice(0, 400)
      });
    }

    console.log("[v5] Análise:", JSON.stringify(analise, null, 2));

    // 2) BUSCA
    var ranking = buscarProduto(analise);
    var m1 = ranking[0] || null;
    var m2 = ranking[1] || null;

    // 3) DECISÃO
    var modo = "nao_encontrado";
    var produto = null;
    var candidatos = [];

    if (m1 && m1.score >= 85 && (!m2 || m1.score - m2.score >= 10)) {
      modo = "produto";
      produto = resumo(m1.produto);
    } else if (m1 && m1.score >= 45) {
      modo = "candidatos";
      candidatos = ranking.slice(0, 4).map(function(x) {
        var r = resumo(x.produto);
        r.score = x.score;
        r.motivo = x.motivo;
        return r;
      });
    }

    console.log("[v5] Modo:", modo, "| URL:", produto ? produto.url : "N/A");

    return res.status(200).json({
      status: "ok",
      modo: modo,
      analise: analise,
      produto: produto,
      candidatos: candidatos,
      whatsapp: montarWhats({ analise: analise, maquina: maquina, melhor: m1 ? m1.produto : null }),
      debug: {
        ms: Date.now() - t0,
        top: ranking.slice(0, 5).map(function(x) {
          return {
            nome: x.produto.nome,
            score: x.score,
            motivo: x.motivo,
            url: x.produto.url || "SEM URL"
          };
        })
      }
    });

  } catch (erro) {
    console.error("[v5] ERRO:", erro);
    return res.status(500).json({ status: "erro", mensagem: erro.message });
  }
}
