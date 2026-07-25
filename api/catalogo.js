import fs from "fs";
import path from "path";

export default function handler(req, res) {
  try {

    const arquivo = path.join(process.cwd(), "dados", "produtos.json");

    const catalogo = JSON.parse(
      fs.readFileSync(arquivo, "utf8")
    );

    catalogo.produtos = catalogo.produtos.map(produto => {

      const texto = [
        produto.nome || "",
        produto.descricao || "",
        produto.termos || ""
      ].join(" ");

      const referencias = [
        ...new Set(
          (texto.match(/[A-Z]{1,5}\d{3,8}[A-Z0-9-]*/gi) || [])
            .map(r => r.toUpperCase())
        )
      ];

      return {
        ...produto,
        referencias
      };

    });

    res.status(200).json(catalogo);

  } catch (erro) {

    res.status(500).json({
      erro: erro.message
    });

  }
}
