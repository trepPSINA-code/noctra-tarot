import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import 'dotenv/config';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '64kb' }));

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SYSTEM_PROMPT = `
Ты — NOCTRA, бережный ИИ-консультант по Таро внутри Telegram Mini App.

Отвечай на русском языке тепло, спокойно и атмосферно.

Используй карты как инструмент рефлексии и интерпретации, а не как доказанный способ предсказать будущее.

Не утверждай как факт, что знаешь мысли другого человека или гарантированно знаешь будущее.

Не запугивай пользователя и не создавай зависимость от раскладов.

В обычном вопросе давай развёрнутый и понятный ответ:
1. общий смысл;
2. разбор карт и контекста;
3. практический вывод;
4. 1–2 уточняющих вопроса.

Не используй чрезмерно мистический пафос.
`;

app.get('/health', (req, res) => {
  res.json({ ok: true, name: 'NOCTRA' });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured'
      });
    }

    const { messages = [], context = '' } = req.body || {};

    const clean = Array.isArray(messages)
      ? messages
          .slice(-12)
          .filter(
            m =>
              m &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string'
          )
          .map(m => ({
            role: m.role,
            content: m.content.slice(0, 4000)
          }))
      : [];

    if (!clean.length) {
      return res.status(400).json({ error: 'No messages' });
    }

    const contextText = context
      ? `\n\nКонтекст текущего расклада:\n${String(context).slice(0, 8000)}`
      : '';

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      instructions: SYSTEM_PROMPT + contextText,
      input: clean,
      max_output_tokens: 900
    });

    res.json({
      reply:
        response.output_text ||
        'Я не смогла сформулировать ответ. Попробуй задать вопрос немного иначе.'
    });
  } catch (error) {
    console.error('NOCTRA chat error:', error?.message || error);

    res.status(500).json({
      error: 'AI request failed'
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
  console.log(`NOCTRA AI server listening on :${port}`);
});
