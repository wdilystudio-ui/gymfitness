export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      sucesso: true,
      status: "online",
      rota: "/api/avaliacao",
      googleScriptConfigurado: Boolean(process.env.GOOGLE_SCRIPT_URL),
      chaveConfigurada: Boolean(process.env.INTEGRATION_SECRET)
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");

    return res.status(405).json({
      sucesso: false,
      mensagem: "Método não permitido."
    });
  }

  const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const integrationSecret = process.env.INTEGRATION_SECRET;

  if (!googleScriptUrl) {
    return res.status(500).json({
      sucesso: false,
      mensagem:
        "A variável GOOGLE_SCRIPT_URL não foi configurada na Vercel."
    });
  }

  if (!integrationSecret) {
    return res.status(500).json({
      sucesso: false,
      mensagem:
        "A variável INTEGRATION_SECRET não foi configurada na Vercel."
    });
  }

  try {
    let dados = req.body;

    if (typeof dados === "string") {
      try {
        dados = JSON.parse(dados);
      } catch (erro) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "O corpo da requisição não contém um JSON válido."
        });
      }
    }

    if (
      !dados ||
      typeof dados !== "object" ||
      Array.isArray(dados)
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nenhum dado válido foi recebido."
      });
    }

    if (!dados.nome || String(dados.nome).trim().length < 3) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe um nome válido."
      });
    }

    const payload = {
      ...dados,
      integrationSecret: integrationSecret
    };

    const respostaGoogle = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const textoResposta = await respostaGoogle.text();

    let resultado;

    try {
      resultado = JSON.parse(textoResposta);
    } catch (erro) {
      console.error(
        "Resposta não reconhecida do Apps Script:",
        textoResposta
      );

      return res.status(502).json({
        sucesso: false,
        mensagem:
          "O Apps Script retornou uma resposta inválida. " +
          "Atualize a implantação do Apps Script e confirme a URL /exec.",
        detalhes: textoResposta.substring(0, 300)
      });
    }

    if (!respostaGoogle.ok || resultado.sucesso === false) {
      return res.status(502).json({
        sucesso: false,
        mensagem:
          resultado.mensagem ||
          "Não foi possível registrar a avaliação no Apps Script."
      });
    }

    return res.status(200).json(resultado);

  } catch (erro) {
    console.error("Erro da API /api/avaliacao:", erro);

    return res.status(500).json({
      sucesso: false,
      mensagem:
        erro && erro.message
          ? erro.message
          : "Erro interno ao registrar a avaliação."
    });
  }
}
