export default async function handler(req, res) {

    const { codigo, referencias, nome } = req.body || {};

    const termo = [
        codigo,
        ...(referencias || []),
        nome
    ]
    .filter(Boolean)
    .join(" ");

    const url = `https://www.ingafert.com.br/busca?q=${encodeURIComponent(termo)}`;

    return res.status(200).json({

        encontrou: true,

        nome,

        url,

        foto: "",

        marca: "",

        descricao: "",

        referencias

    });

}
