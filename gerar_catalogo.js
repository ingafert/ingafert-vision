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
    (texto.match(/[A-Z0-9-]{4,}/gi) || [])
      .map(r => r.replace(/[^A-Z0-9]/g, "").toUpperCase())
      .filter(r =>
        /\d/.test(r) &&
        r.length >= 5 &&
        ![
          "HTTPS",
          "HTTP",
          "BRASIL",
          "INCOPARTS",
          "JOHN",
          "DEERE",
          "CASE",
          "NEWHOLLAND",
          "MASSEY",
          "FERGUSON",
          "VALTRA",
          "JUMIL",
          "BALDAN"
        ].includes(r)
      )
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
