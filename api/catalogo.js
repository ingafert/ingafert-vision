import fs from "fs";
import path from "path";
import XLSX from "xlsx";

export default async function handler(req, res) {

    try {

        const arquivo = path.join(process.cwd(), "dados", "produtos.xlsx");

        const workbook = XLSX.readFile(arquivo);

        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const dados = XLSX.utils.sheet_to_json(sheet);

        const produtos = dados.map(item => ({

            referencia:
                item.codigo_erp ||
                item.referencia ||
                "",

            nome:
                item.nome ||
                "",

            marca:
                item.marca ||
                "",

            url:
                item.link_produto ||
                "",

            foto:
                item.link_foto_principal ||
                "",

            termos:
                item.termos_de_busca ||
                ""

        }));

        res.status(200).json({
            produtos
        });

    } catch (erro) {

        res.status(500).json({
            erro: erro.message
        });

    }

}
