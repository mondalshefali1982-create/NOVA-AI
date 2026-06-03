module.exports = async function handler(req, res) {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          messages: [
            {
              role: "user",
              content: "Say NOVA_OK"
            }
          ]
        })
      }
    );

    const text = await response.text();

    res.status(200).json({
      status: response.status,
      response: text
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};
