import React, { useState } from 'react';
import { generateQuestions, gradeAnswer, Question } from '../utils/aiClient';
import { Link } from 'react-router-dom';

const PASS_THRESHOLD = 40; // 10 points per question, need >= 40 to pass

const QuizPage: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedbacks, setFeedbacks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [details, setDetails] = useState({ name: '', email: '', company: '' });

  const startQuiz = async (selectedRole: string) => {
    setRole(selectedRole);
    setLoading(true);
    const qs = await generateQuestions(selectedRole);
    setQuestions(qs);
    setLoading(false);
  };

  const submitAnswer = async (userAnswer: string) => {
    const q = questions[index];
    setLoading(true);
    const result = await gradeAnswer(q.question, q.expected, userAnswer);
    setAnswers((s) => [...s, userAnswer]);
    setFeedbacks((s) => [...s, result.feedback || '']);
    setScore((s) => s + (result.points || 0));
    setLoading(false);
    if (index + 1 >= questions.length) {
      setCompleted(true);
      setShowDetailsForm(score + (result.points || 0) < PASS_THRESHOLD);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now we just console.log the details. Could POST to an API.
    console.log('User details:', details);
    alert('Thanks — details received.');
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">B.I.R.D. — Role Quiz</h1>

      {!role && (
        <div>
          <p className="mb-4">Start as a:</p>
          <div className="flex gap-4">
            <button onClick={() => startQuiz('Startup')} className="btn btn-primary">Start as Startup</button>
            <button onClick={() => startQuiz('VC')} className="btn btn-outline">Start as VC</button>
          </div>
        </div>
      )}

      {role && loading && <p>Preparing questions...</p>}

      {role && !loading && questions.length === 0 && (
        <p>No questions available. Try again.</p>
      )}

      {role && questions.length > 0 && !completed && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Question {index + 1} of {questions.length}</h2>
          <div className="p-4 border rounded mb-4 bg-white/50">
            <p className="mb-2">{questions[index].question}</p>
            <QuestionAnswerForm onSubmit={submitAnswer} loading={loading} />
          </div>
        </div>
      )}

      {completed && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold">Results</h2>
          <p className="mb-4">Score: {score} / {questions.length * 10}</p>
          {score >= PASS_THRESHOLD ? (
            <div className="p-4 border rounded bg-green-50">You passed! Congratulations.</div>
          ) : (
            <div className="p-4 border rounded bg-yellow-50">Your score is below the threshold. Please enter your details below.</div>
          )}

          <div className="mt-6">
            <h3 className="text-lg font-semibold">Feedback</h3>
            <ul className="list-disc pl-6 mt-2">
              {feedbacks.map((f, i) => (
                <li key={i}><strong>Q{i+1}:</strong> {f}</li>
              ))}
            </ul>
          </div>

          {showDetailsForm && (
            <form className="mt-6" onSubmit={handleDetailsSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Full name" value={details.name} onChange={(e) => setDetails({...details, name: e.target.value})} className="input" />
                <input required type="email" placeholder="Email" value={details.email} onChange={(e) => setDetails({...details, email: e.target.value})} className="input" />
                <input placeholder="Company / Startup" value={details.company} onChange={(e) => setDetails({...details, company: e.target.value})} className="input md:col-span-2" />
              </div>
              <button type="submit" className="btn btn-primary mt-4">Submit Details</button>
            </form>
          )}

          <div className="mt-6 flex gap-3">
            <Link to="/" className="btn btn-outline">Back to Home</Link>
            <Link to="/quiz" className="btn">Retake Quiz</Link>
          </div>
        </div>
      )}
    </div>
  );
};

const QuestionAnswerForm: React.FC<{ onSubmit: (ans: string) => void; loading: boolean }> = ({ onSubmit, loading }) => {
  const [text, setText] = useState('');
  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };
  return (
    <form onSubmit={handle} className="flex flex-col md:flex-row gap-2">
      <input value={text} onChange={(e) => setText(e.target.value)} className="input flex-1" placeholder="Type your answer..." />
      <button disabled={loading} type="submit" className="btn btn-primary">Submit</button>
    </form>
  );
};

export default QuizPage;