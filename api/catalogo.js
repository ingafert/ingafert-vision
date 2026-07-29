import fs from "fs";
import path from "path";

export default function handler(req, res) {

    try {

        const arquivo = path.join(process.cwd(), "dados", "produtos.json");

        const catalogo = JSON.parse(
            fs.readFileSync(arquivo, "utf8")
        );

        return res.status(200).json(catalogo);

    } catch (erro) {

        return res.status(500).json({
            erro: erro.message
        });

    }

}
