// CORS MELHORADO
  const ehPreflight = configurarCORS(req, res);
  se (ehPreflight) {
    retornar res.status(200).end();
  }

  // Verificação de saúde
  se (req.method === "GET") {
    retornar res.status(200).json({
      status: "ok",
      versão: "Ingafert Vision 4.2 - CORS FIXED"
    });
  }

  se (req.method !== "POST") {
    retornar res.status(405).json({
      status: "erro",
      mensagem: "Método não permitido."
    });
  }

  tentar {
    const { imagem } = req.body;

    se (!imagem) {
      retornar res.status(400).json({
        status: "erro",
        mensagem: "Imagem não enviada."
      });
    }

    console.log("[VISION] Processando imagem...");
    const imagemComprimida = await compactarImagem(imagem);

    console.log("[OPENAI] Chamando GPT-4o...");
    
    const resposta = await openai.chat.completions.create({
      modelo: "gpt-4o",
      max_tokens: 1000,
      mensagens: [
        {
          função: "usuário",
          contente: [
            {
              tipo: "texto",
              texto: `
Você é um especialista em peças agrícolas.

Analise CUIDADOSAMENTE esta fotografia de uma peça agrícola.

INSTRUÇÕES:
1. NUNCA deixe campos vazios
2. Se não tiver 100% de certeza, indique confiança menor
3. SEMPRE procure por referências equivalentes
4. Incluir variações de código
5. Se existirem múltiplas referências, RETORNE TODAS

RESPONDA APENAS COM ESTE JSON (sem remarcação):

{
  "nome": "Nome exato da peça em português",
  "marca": "Fabricante principal",
  "codigo_original": "Código mais comum",
  "referências": ["REF1", "REF2"],
  "descricao": "Descrição técnica curta",
  "confianca": 0,85
}
`
            },
            {
              tipo: "url_da_imagem",
              url_da_imagem: {
                url: imagemComprimida,
                detalhe: "alto"
              }
            }
          ]
        }
      ]
    });

    const textoBruto = resposta.choices[0].message.content.trim();
    console.log("[OPENAI] Resposta recebida");

    seja texto = textoBruto
      .replace(/^```json\n?/i, "")
      .replace(/\n?```$/i, "")
      .aparar();

    Vamos analisar;
    tentar {
      analisar = JSON.parse(texto);
    } catch (e) {
      console.error("[ERROR] Análise JSON falhou:", e);
      retornar res.status(400).json({
        status: "erro",
        mensagem: "IA não retornou JSON válido",
        resposta_bruta: textoBruto
      });
    }

    // Valores padrão
    analise.nome = analise.nome || "Peça agrícola não identificada";
    analise.marca = analise.marca || "";
    analise.codigo_original = analise.codigo_original || "";
    analise.referencias = Array.isArray(analise.referencias) ? analise.referencias : [];
    analise.descricao = analise.descricao || "";
    analise.confianca = Math.max(0.3, Math.min(1, analise.confianca || 0.5));

    console.log("[CATALOG] Buscando no catálogo...");
    
    const respostaCatalogo = aguarda busca(
      "https://ingafert-vision.vercel.app/api/catalogo"
    );

    se (!respostaCatalogo.ok) {
      console.warn("[CATALOG] Catálogo indisponível, continuando sem busca");
    }

    const catalogo = aguarda respostaCatalogo.json().catch(() => ({ produtos: [] }));
    const produtos = Array.isArray(catalogo.produtos) ? catalogo.produtos : [];

    console.log(`[CATALOG] Total de produtos: ${produtos.length}`);

    const resultadoBusca = produtos.length > 0 ? buscarNoCatalogo(analisar, produtos) : null;

    seja produto = {
      encontrou: falso,
      nome: analise.nome,
      marca: analise.marca,
      descrição: analise.descricao,
      referencias: analise.referencias,
      foto: "",
      URL: ""
    };

    if (resultadoBusca && resultadoBusca.produto) {
      const p = resultadoBusca.produto;
      produto = {
        encontrado: verdadeiro,
        nome: p.nome || analise.nome,
        marca: p.marca || analise.marca,
        descrição: p.descricao || analise.descricao,
        referências: [
          ...(p.referencias || []),
          p.referência,
          p.código_original
        ]
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i),
        foto: p.foto || "",
        url: p.url || "",
        tipo_busca: resultadoBusca.tipo
      };
      analise.confianca = Math.min(1, analise.confianca + 0,1);
      console.log("[CATALOG] Produto encontrado!");
    } outro {
      console.log("[CATALOG] Produto NÃO encontrado");
    }

    retornar res.status(200).json({
      status: "ok",
      analisar,
      produto,
      depuração: {
        modelo_ia: "gpt-4o",
        compressão: "ativada",
        busca_tipo: resultadoBusca?.tipo || "nenhuma",
        cors: "ativado"
      }
    });

  } catch (erro) {
    console.error("[ERROR] Erro completo:", erro);

    retornar res.status(500).json({
      status: "erro",
      mensagem: erro.mensagem,
      erro_tipo: erro.construtor.name
    });
  }
}
