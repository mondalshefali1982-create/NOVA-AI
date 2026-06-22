const { callGemini } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  try {
    const text = await callGemini("Say NOVA_OK");

    res.status(200).json({
      status: 200,
      response: text
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message
    });
  }
};
