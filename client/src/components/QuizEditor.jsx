import React, { useState } from 'react';

const QuizEditor = ({ user, onCancel, onSave }) => {
    const [quizName, setQuizName] = useState('');
    const [questions, setQuestions] = useState([]);
    const [newQ, setNewQ] = useState({ text: '', type: 'mcq', options: ['', '', '', ''] });
    const [loading, setLoading] = useState(false);

    const addQuestion = () => {
        if (!newQ.text) return;
        const q = { ...newQ, id: Date.now() };
        setQuestions([...questions, q]);
        setNewQ({ text: '', type: 'mcq', options: ['', '', '', ''] });
    };

    const removeQuestion = (id) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleSave = async () => {
        if (!quizName || questions.length === 0) return alert("Name and Questions are required!");
        setLoading(true);

        const newQuiz = {
            name: quizName,
            questions,
            createdBy: user.email // Just for record, not auth check on server
        };

        try {
            const apiBase = `${window.location.protocol}//${window.location.hostname}:3000`;
            const res = await fetch(`${apiBase}/api/quizzes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newQuiz)
            });

            if (res.ok) {
                alert('Quiz Saved Successfully to Server!');
                onSave();
            } else {
                throw new Error('Server returned error');
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert(`Error saving to server: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ animation: 'fadeIn 0.5s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Create New Quiz</h2>
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label>Quiz Name</label>
                <input
                    value={quizName}
                    onChange={e => setQuizName(e.target.value)}
                    placeholder="e.g., General Knowledge Week 1"
                    style={{ fontSize: '1.2rem', padding: '1rem' }}
                />
            </div>

            <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '1rem' }}>
                <h4>Add Question</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <select value={newQ.type} onChange={e => setNewQ({ ...newQ, type: e.target.value })} style={{ width: '150px' }}>
                        <option value="fill-up">Fill Up</option>
                        <option value="mcq">Multiple Choice</option>
                    </select>
                    <input
                        placeholder="Question Text"
                        value={newQ.text}
                        onChange={e => setNewQ({ ...newQ, text: e.target.value })}
                        style={{ flex: 1 }}
                    />
                </div>

                {newQ.type === 'mcq' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {newQ.options.map((opt, i) => (
                            <input
                                key={i}
                                placeholder={`Option ${i + 1}`}
                                value={opt}
                                onChange={e => {
                                    const newOpts = [...newQ.options];
                                    newOpts[i] = e.target.value;
                                    setNewQ({ ...newQ, options: newOpts });
                                }}
                            />
                        ))}
                    </div>
                )}
                <button className="btn" onClick={addQuestion}>Add Question</button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3>Questions ({questions.length})</h3>
                {questions.map((q, i) => (
                    <div key={q.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', marginBottom: '0.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong>{i + 1}. [{q.type}]</strong> {q.text}
                        </div>
                        <button className="btn-secondary" style={{ color: 'red', borderColor: 'red' }} onClick={() => removeQuestion(q.id)}>Delete</button>
                    </div>
                ))}
            </div>

            <div style={{ textAlign: 'right' }}>
                <button className="btn" onClick={handleSave} disabled={loading} style={{ fontSize: '1.2rem' }}>
                    {loading ? 'Saving...' : 'Save Quiz'}
                </button>
            </div>
        </div>
    );
};

export default QuizEditor;
