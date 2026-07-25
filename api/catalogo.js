import fs from "fs";
import path from "path";

export default function handler(req, res) {

    try {

        const arquivo = path.join(process.cwd(), "dados", "produtos.csv");

        const texto = fs.readFileSync(arquivo, "utf8");

        const linhas = texto.split("\n").filter(l => l.trim());

        const cabecalho = linhas[0].split(",");

        const produtos = [];

        for (let i = 1; i < linhas.length; i++) {

            const valores = linhas[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

            if (!valores) continue;

            const item = {};

            cabecalho.forEach((campo, indice) => {

                item[campo] = (valores[indice] || "")
                    .replace(/^"|"$/g, "")
                    .trim();

            });

            produtos.push({

                referencia: item.codigo_erp || "",

                nome: item.nome || "",

                marca: item.marca || "",

                descricao: item.descricao || "",

                termos: item.termos_de_busca || "",

                url: item.link_produto || "",

                foto: item.link_foto_principal || ""

            });

        }

        res.status(200).json({ produtos });

    } catch (erro) {

        res.status(500).json({
            erro: erro.message
        });

    }

}
