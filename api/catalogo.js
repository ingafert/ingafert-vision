export default async function handler(req, res) {

    return res.status(200).json({

        produtos: [

            {
                referencia: "H20357",
                nome: "Lâmina de Corte de Plataforma",
                url: "https://www.ingafert.com.br/produto/lamina-de-corte-de-plataforma",
                foto: ""
            }

        ]

    });

}
