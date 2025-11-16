type Question = { id: number; question: string; expected: string };

const API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:4000'
  : '';

export { API_BASE };

export async function generateQuestions(role: string): Promise<Question[]> {
  const res = await fetch(API_BASE + '/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate_questions', role }),
  });
  const data = await res.json();
  return data?.data?.questions || [];
}

export async function gradeAnswer(question: string, expected: string, userAnswer: string) {
  const res = await fetch(API_BASE + '/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'grade', question, expected, userAnswer }),
  });
  const data = await res.json();
  return data?.data || { correct: false, points: 0, feedback: 'No feedback' };
}

export type { Question };
