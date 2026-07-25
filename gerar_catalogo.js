import fs from "fs";

const entrada = "./dados/produtos.json";
const saida = "./dados/produtos.json";

const catalogo = JSON.parse(fs.readFileSync(entrada, "utf8"));

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

fs.writeFileSync(
    saida,
    JSON.stringify(catalogo, null, 2),
    "utf8"
);

console.log("Catálogo atualizado com sucesso.");
