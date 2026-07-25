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

            const referencias = [];

const regex =
/(?:REF(?:ER[ÊE]NCIA)?|C[ÓO]DIGO(?: ORIGINAL)?|ORIGINAL)\s*:?\s*([A-Z0-9-]+)/gi;

let match;

while ((match = regex.exec(texto)) !== null) {

    const codigo = match[1]
        .replace(/[^A-Z0-9-]/gi, "")
        .toUpperCase();

    if (!referencias.includes(codigo)) {
        referencias.push(codigo);
    }

}

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
