export default async function handler(req, res) {

    return res.status(200).json({

        encontrou: false,

        nome: "",

        marca: "",

        descricao: "",

        foto: "",

        url: "",

        referencias: []

    });

}
