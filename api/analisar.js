export default function handler(req, res) {

    res.status(200).json({
        status: "ok",
        projeto: "Ingafert Vision AI 2.0",
        versao: "2.0.0",
        mensagem: "API funcionando com sucesso."
    });

}
