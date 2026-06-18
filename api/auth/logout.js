const { setCors, handleOptions, requirePost } = require("../_lib/gemini");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;
  if (!requirePost(req, res)) return;

  res.status(200).json({ message: "Logged out successfully." });
};