import React, { useState } from 'react';
import { generateQuestions, gradeAnswer, Question, API_BASE } from '../utils/aiClient';

type Props = {
  onPassed?: () => void;
  passThreshold?: number; // points required to pass (default 40)
};

const ChatbotGate: React.FC<Props> = ({ onPassed, passThreshold = 40 }) => {
  const [role, setRole] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [details, setDetails] = useState({ name: '', email: '', company: '' });
  const [submitted, setSubmitted] = useState(false);

  const start = async (selectedRole: string) => {
    setRole(selectedRole);
    setLoading(true);
    try {
      const qs = await generateQuestions(selectedRole);
      setQuestions(qs || []);
    } catch (err) {
      console.error(err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (userAnswer: string) => {
    if (!questions[index]) return;
    setLoading(true);
    try {
      const q = questions[index];
      const result = await gradeAnswer(q.question, q.expected, userAnswer);
      setAnswers((s) => [...s, userAnswer]);
      setScore((s) => s + (result.points || 0));
      if (index + 1 >= questions.length) {
        const finalScore = score + (result.points || 0);
        setCompleted(true);
        setShowDetailsForm(finalScore < passThreshold);
        if (finalScore >= passThreshold) {
          onPassed?.();
        }
      } else {
        setIndex((i) => i + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-3">Quick role check</h2>
        <p className="mb-4">Please choose how you want to continue:</p>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => start('Startup')}>Start as Startup</button>
          <button className="btn btn-outline" onClick={() => start('VC')}>Start as VC</button>
        </div>
      </div>
    );
  }

  if (loading && questions.length === 0) {
    return <div className="p-4">Preparing questions...</div>;
  }

  if (!loading && questions.length === 0) {
    return <div className="p-4">No questions available. Try again later.</div>;
  }

  if (!completed) {
    const q = questions[index];
    return (
      <div className="card p-4 mb-6">
        <h3 className="font-semibold mb-2">Question {index + 1} / {questions.length}</h3>
        <p className="mb-3">{q.question}</p>
        <ChatAnswerForm onSubmit={submitAnswer} disabled={loading} />
      </div>
    );
  }

  // completed
  return (
    <div className="card p-4 mb-6">
      <h3 className="text-lg font-semibold mb-2">Quiz complete</h3>
      <p className="mb-2">Score: {score} / {questions.length * 10}</p>
      {score >= passThreshold ? (
        <div className="p-2 bg-green-50 rounded">You passed — you may proceed to log in.</div>
      ) : (
        <>
          <div className="p-2 bg-yellow-50 rounded mb-3">Score is below threshold. Please submit your details.</div>
          {showDetailsForm && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  name: details.name,
                  email: details.email,
                  company: details.company,
                  role,
                  score,
                  answers,
                };
                // send to server persistence endpoint
                const resp = await fetch(API_BASE + '/api/quiz-submissions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                const json = await resp.json();
                if (json?.ok) {
                  setSubmitted(true);
                } else {
                  console.error('Submission failed', json);
                  alert('Failed to submit details — try again later.');
                }
              } catch (err) {
                console.error(err);
                alert('Failed to submit details — check your connection.');
              }
            }} className="space-y-2">
              {!submitted ? (
                <>
                  <input required className="input" placeholder="Full name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />
                  <input required className="input" placeholder="Email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
                  <input className="input" placeholder="Company / Startup" value={details.company} onChange={(e) => setDetails({ ...details, company: e.target.value })} />
                  <button type="submit" className="btn btn-primary">Submit details</button>
                </>
              ) : (
                <div className="p-2 bg-green-50 rounded">Thanks — your details have been recorded. We'll be in touch.</div>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
};

const ChatAnswerForm: React.FC<{ onSubmit: (ans: string) => void; disabled?: boolean }> = ({ onSubmit, disabled }) => {
  const [text, setText] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSubmit(text.trim()); setText(''); } }} className="flex gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} className="input flex-1" placeholder="Type your answer..." disabled={disabled} />
      <button type="submit" className="btn btn-primary" disabled={disabled}>Send</button>
    </form>
  );
};

export default ChatbotGate;
