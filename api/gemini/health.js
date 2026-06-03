module.exports = async function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasKey: !!process.env.OPENROUTER_API_KEY,
    nodeEnv: process.env.NODE_ENV
  });
};
