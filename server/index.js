import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

async function callOpenAI(messages, max_tokens = 600) {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, messages, max_tokens }),
  });
  const data = await res.json();
  return data;
}

app.post('/api/ai', async (req, res) => {
  try {
    const { action } = req.body;

    if (action === 'generate_questions') {
      const { role } = req.body;
      const prompt = `Generate a JSON array of 5 concise interview-style questions for the role: ${role}. For each question include an \"id\", \"question\" and a short \"expected\" answer (one or two short phrases). Respond with ONLY valid JSON in the format: {\"questions\": [{\"id\":1, \"question\":\"...\", \"expected\":\"...\"}, ...] }`;

      const messages = [
        { role: 'system', content: 'You are a helpful assistant that returns strictly JSON when asked.' },
        { role: 'user', content: prompt },
      ];

      const aiRes = await callOpenAI(messages, 800);
      const text = aiRes?.choices?.[0]?.message?.content || aiRes?.choices?.[0]?.text || '';
      // try parse JSON
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        // try to extract the first JSON block
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }
      return res.json({ ok: true, data: parsed });
    }

    if (action === 'grade') {
      const { question, expected, userAnswer } = req.body;
      const prompt = `You are a strict grader. Given the question:\n\n${question}\n\nThe expected key points: ${expected}\n\nUser answer: ${userAnswer}\n\nDecide if the user demonstrated the required points. Return ONLY JSON: {\"correct\": true|false, \"points\": 10 or 0, \"feedback\": \"one-sentence feedback\"}`;

      const messages = [
        { role: 'system', content: 'You are a concise grader that returns valid JSON only.' },
        { role: 'user', content: prompt },
      ];

      const aiRes = await callOpenAI(messages, 200);
      const text = aiRes?.choices?.[0]?.message?.content || aiRes?.choices?.[0]?.text || '';
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }
      return res.json({ ok: true, data: parsed });
    }

    return res.status(400).json({ ok: false, error: 'unknown action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// persist quiz submissions from users who fail the gate
app.post('/api/quiz-submissions', async (req, res) => {
  try {
    const submissionsDir = path.resolve(process.cwd(), 'server');
    const filePath = path.join(submissionsDir, 'submissions.json');
    // ensure server dir exists (it should), but be safe
    try {
      await mkdir(submissionsDir, { recursive: true });
    } catch (e) {
      // ignore
    }

    const payload = req.body || {};
    const record = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    // read existing file if present
    let existing = [];
    try {
      const raw = await readFile(filePath, 'utf-8');
      existing = JSON.parse(raw) || [];
    } catch (err) {
      // file may not exist or be invalid — start fresh
      existing = [];
    }

    existing.push(record);
    await writeFile(filePath, JSON.stringify(existing, null, 2), 'utf-8');

    return res.json({ ok: true, data: record });
  } catch (err) {
    console.error('Failed to save submission:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`AI proxy server listening on http://localhost:${port}`));
