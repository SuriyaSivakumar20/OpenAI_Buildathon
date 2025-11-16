import React, { useEffect, useRef, useState } from 'react';
import { generateQuestions, gradeAnswer, Question } from '../utils/aiClient';
import { Link } from 'react-router-dom';

type Message = { id: string; from: 'bot' | 'user'; text: string };

const ChatbotPage: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // scroll to bottom on new message
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const startForRole = async (selectedRole: string) => {
    setRole(selectedRole);
    setLoading(true);
    setMessages([{ id: 's', from: 'bot', text: `Hi — I'll ask you 5 quick ${selectedRole} questions.` }]);
    try {
      const qs = await generateQuestions(selectedRole);
      setQuestions(qs || []);
      // small delay then show first question with typing
      setTimeout(() => presentBotText(qs?.[0]?.question || ''), 800);
    } catch (err) {
      setMessages((m) => [...m, { id: String(Date.now()), from: 'bot', text: 'Sorry — failed to prepare questions.' }]);
    } finally {
      setLoading(false);
    }
  };

  const presentBotText = (fullText: string) => {
    const id = String(Date.now());
    setMessages((m) => [...m, { id, from: 'bot', text: '' }]);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setMessages((m) => m.map(msg => msg.id === id ? { ...msg, text: fullText.slice(0, i) } : msg));
      if (i >= fullText.length) clearInterval(interval);
    }, 20);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || completed) return;
    const userText = input.trim();
    setInput('');
    setMessages((m) => [...m, { id: String(Date.now()), from: 'user', text: userText }]);
    setLoading(true);

    // grade via server
    try {
      const q = questions[qIndex];
      const res = await gradeAnswer(q.question, q.expected, userText);
      const points = res?.points || 0;
      const feedback = res?.feedback || (points > 0 ? 'Good' : 'Needs improvement');
      if (points > 0) setScore((s) => s + points);
      // bot feedback
      setTimeout(() => presentBotText(feedback), 400);

      // move to next after feedback is shown (delay)
      setTimeout(() => {
        const next = qIndex + 1;
        if (next < questions.length) {
          setQIndex(next);
          presentBotText(questions[next].question);
        } else {
          setCompleted(true);
          setMessages((m) => [...m, { id: String(Date.now()), from: 'bot', text: `Quiz complete — your score: ${score + points} / ${questions.length * 10}` }]);
        }
      }, 900 + feedback.length * 12);
    } catch (err) {
      setMessages((m) => [...m, { id: String(Date.now()), from: 'bot', text: 'Grading failed, please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Interactive Chatbot Quiz</h1>

      {!role && (
        <div className="card p-6 mb-6">
          <p className="mb-4">Choose how you'd like to start:</p>
          <div className="flex gap-3">
            <button className="btn btn-primary animate-bounce" onClick={() => startForRole('Startup')}>Start as Startup</button>
            <button className="btn btn-outline" onClick={() => startForRole('VC')}>Start as VC</button>
          </div>
        </div>
      )}

      {role && (
        <div className="card p-4">
          <div ref={listRef} className="space-y-3 h-72 overflow-auto p-2 mb-3 bg-white/50 rounded">
            {messages.map((m) => (
              <div key={m.id} className={m.from === 'bot' ? 'text-left' : 'text-right'}>
                <div className={`inline-block p-2 rounded ${m.from === 'bot' ? 'bg-gray-100' : 'bg-primary-600 text-white'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {!completed && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} className="input flex-1" placeholder={loading ? 'Please wait...' : 'Type your answer...'} disabled={loading} />
              <button type="submit" className="btn btn-primary" disabled={loading}>Send</button>
            </form>
          )}

          {completed && (
            <div className="mt-4">
              <p className="mb-2">Final score: {score} / {questions.length * 10}</p>
              <div className="flex gap-3">
                <Link to="/login" className="btn btn-primary">Proceed to Login</Link>
                <button className="btn" onClick={() => window.location.reload()}>Retake</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatbotPage;
