export default async function handler(req, res) {

    return res.status(200).json({

        produtos: [

            {
                referencia: "CQ32379",
                nome: "Lâmina de Corte de Plataforma",
                url: "https://ingafert.com.br/25-un-lamina-de-corte-vv-para-john-deere-refcq32379/p",
                foto: ""
            }

        ]

    });

}
