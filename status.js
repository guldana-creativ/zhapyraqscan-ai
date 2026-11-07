// AI модульдерінің бапталғанын тексеру (кілттердің өзі ешқашан көрсетілмейді)
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const vision = process.env.GEMINI_API_KEY ? 'Google Gemini' : (process.env.ANTHROPIC_API_KEY ? 'Anthropic Claude' : null);
  const plantnet = !!process.env.PLANTNET_API_KEY;
  res.status(200).json({ ai: !!vision || plantnet, vision, plantnet });
}
