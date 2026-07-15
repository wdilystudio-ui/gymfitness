export default async function handler(req, res) {
  /*
   * Permite somente requisições POST.
   */
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      sucesso: false,
      mensagem: "Método não permitido."
    });
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

  if (!googleScriptUrl) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "A URL do Google Apps Script não foi configurada na Vercel."
    });
  }

  try {
    let dados = req.body;

    /*
     * Em alguns casos a Vercel pode receber o corpo como texto.
     */
    if (typeof dados === "string") {
      dados = JSON.parse(dados);
    }

    if (!dados || typeof dados !== "object") {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nenhum dado válido foi recebido."
      });
    }

    /*
     * Encaminha os dados ao Google Apps Script.
     * O Content-Type text/plain evita problemas de preflight com o Apps Script.
     */
    const respostaGoogle = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(dados),
      redirect: "follow"
    });

    const textoResposta = await respostaGoogle.text();

    let resultado;

    try {
      resultado = JSON.parse(textoResposta);
    } catch (erro) {
      console.error("Resposta não reconhecida do Apps Script:", textoResposta);

      return res.status(502).json({
        sucesso: false,
        mensagem: "O Google Apps Script retornou uma resposta inválida."
      });
    }

    if (!respostaGoogle.ok || resultado.sucesso === false) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          resultado.mensagem ||
          "Não foi possível registrar a avaliação."
      });
    }

    return res.status(200).json(resultado);

  } catch (erro) {
    console.error("Erro da API:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao registrar a avaliação."
    });
  }
}
