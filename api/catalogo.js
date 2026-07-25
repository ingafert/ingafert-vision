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
                produto.termos || "",
                produto.url || ""
            ].join(" ");

            const referencias = [
                ...new Set(
                    (texto.match(/[A-Z0-9-]{4,}/gi) || [])
                        .map(r =>
                            r.replace(/[^A-Z0-9]/gi, "")
                             .toUpperCase()
                        )
                        .filter(r =>
                            /\d/.test(r) &&
                            r.length >= 5
                        )
                )
            ];

            return {
                ...produto,
                referencias
            };

        });

        return res.status(200).json(catalogo);

    } catch (erro) {

        return res.status(500).json({
            erro: erro.message
        });

    }

}
