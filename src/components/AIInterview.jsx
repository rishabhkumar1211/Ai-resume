import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/AIInterviewStyles.css';


const AIInterview = ({ resumeText }) => {
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiStatus, setAiStatus] = useState("idle");
  const [questionCount, setQuestionCount] = useState(0);
  const [interviewState, setInterviewState] = useState("ready");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const askedQuestionsRef = useRef([]);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const speakCancelledRef = useRef(false);
  const questionCountRef = useRef(0);
  const messagesRef = useRef([]);

  const chatRef = useRef();
  // Sentinel div always stays at the bottom of the chat
  const bottomSentinelRef = useRef();
  const timerRef = useRef(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { questionCountRef.current = questionCount; }, [questionCount]);

  // ── RELIABLE AUTO-SCROLL ─────────────────────────────────────────────────
  // Any time messages change OR isLoading changes, scroll the sentinel into view.
  // Using scrollIntoView on a real DOM node is far more reliable than
  // manually setting scrollTop with multiple timeouts.
  useEffect(() => {
    if (bottomSentinelRef.current) {
      bottomSentinelRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);
  // ─────────────────────────────────────────────────────────────────────────

  const extractUserName = useCallback(() => {
    if (!resumeText) return "there";
    const namePatterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]+)(?=\s+(?:\+|@|\.|,|$))/m,
      /^(?:[^\n]*\n){0,2}([A-Z][a-z]+ [A-Z][a-z]+)(?=\s+\n)/m,
      /(?:name|Name):\s*([A-Z][a-z]+ [A-Z][a-z]+)/,
    ];
    const excludeWords = ['software','engineer','developer','manager','analyst','designer',
      'consultant','specialist','coordinator','administrator','assistant','director','lead','senior','junior'];
    for (const pattern of namePatterns) {
      const match = resumeText.match(pattern);
      if (match && match[1]) {
        const firstName = match[1].split(' ')[0].toLowerCase();
        if (!excludeWords.some(w => firstName.includes(w))) return match[1].split(' ')[0];
      }
    }
    return "there";
  }, [resumeText]);

  const speakText = useCallback((text, onEnd = null) => {
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }

    speakCancelledRef.current = true;
    window.speechSynthesis.cancel();

    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];

    setTimeout(() => {
      speakCancelledRef.current = false;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex')
      ) || voices[0];

      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setAiStatus("speaking");

      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      let index = 0;

      const done = () => {
        clearInterval(keepAlive);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setAiStatus("idle");
        if (onEnd && !speakCancelledRef.current) onEnd();
      };

      const speakNext = () => {
        if (speakCancelledRef.current || index >= sentences.length) { done(); return; }
        const sentence = sentences[index].trim();
        if (!sentence) { index++; speakNext(); return; }

        const utter = new SpeechSynthesisUtterance(sentence);
        utter.rate = 0.88;
        utter.pitch = 1.05;
        utter.volume = 0.95;
        if (preferredVoice) utter.voice = preferredVoice;
        utter.onend = () => { index++; speakNext(); };
        utter.onerror = (e) => { console.warn('TTS:', e.error); index++; speakNext(); };
        window.speechSynthesis.speak(utter);
      };

      speakNext();
    }, 200);
  }, []);

  const generateAIQuestion = useCallback(async (questionIndex, previousAnswers = []) => {
    const askedList = askedQuestionsRef.current;

    const systemPrompt = `You are Alex, a professional AI interviewer. You have been given a candidate's resume.

Your job is to ask ONE smart, natural interview question that is perfectly tailored to this specific candidate.

Before asking, internally assess the resume to understand:
- Their professional field (engineering, marketing, HR, sales, SEO, finance, design, product, data, etc.)
- Their seniority level (intern, junior, mid, senior, lead, manager, director, etc.)
- Their key skills, tools, and technologies
- Their work experience, companies, and roles
- Any notable projects, achievements, or certifications

Then pick the most appropriate question type for question number ${questionIndex + 1}, rotating naturally across these dimensions so the interview feels well-rounded and human:
- Warm intro / background (use for Q1 only)
- Specific skill or tool depth (how they use it, best practices, common pitfalls)
- Past experience at a specific company or role
- Behavioral / STAR situation (soft skills, teamwork, pressure, conflict)
- Problem-solving or a challenge they've overcome
- Domain knowledge (strategy, methodology, process relevant to their field)
- Collaboration, communication, or cross-functional work
- Growth, learning, or career goals
- Hypothetical / situational scenario relevant to their field
- Work style, culture fit, or values

Hard rules:
- Ask ONLY ONE question
- 1-2 sentences maximum
- Be SPECIFIC — reference their actual job titles, company names, real skills, real tools from the resume
- Never be generic — "Tell me about a project" is bad; "You worked at [Company] on [X] — what was the biggest challenge there?" is good
- Sound warm, natural, and conversational like a real human interviewer
- Do NOT repeat or rephrase any previously asked question
- Output ONLY the question — no preamble, no "Great!", no "Sure!", nothing else

Previously asked questions (do not repeat any):
${askedList.length > 0 ? askedList.map((q, i) => `${i + 1}. ${q}`).join('\n') : 'None yet'}
${previousAnswers.length > 0 ? `\nCandidate's last answer: "${previousAnswers[previousAnswers.length - 1]}"` : ''}`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 150,
          temperature: 0.85,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Here is the candidate's resume:\n\n${resumeText}\n\nAsk question number ${questionIndex + 1}.` }
          ]
        })
      });
      const data = await response.json();
      const question = data?.choices?.[0]?.message?.content?.trim();
      if (question) {
        askedQuestionsRef.current = [...askedQuestionsRef.current, question];
        return question;
      }
    } catch (err) {
      console.error("AI question error:", err);
    }

    const fallbacks = [
      "Can you walk me through your background and what you've been working on recently?",
      "What's a challenge you've overcome in your work that you're proud of?",
      "Tell me about a skill you've developed that's been most valuable in your career.",
      "How do you approach learning something new when you're thrown in the deep end?",
      "Describe a situation where you had to work closely with others to deliver something difficult.",
    ];
    const fallback = fallbacks.find(q => !askedQuestionsRef.current.includes(q)) || fallbacks[0];
    askedQuestionsRef.current = [...askedQuestionsRef.current, fallback];
    return fallback;
  }, [resumeText]);

  const generateQuestionFeedback = useCallback(async (answer, questionAsked) => {
    const qi = {
      wordCount: answer.split(' ').length,
      hasExamples: /\b(example|for instance|such as|specifically)\b/i.test(answer),
      hasNumbers: /\d+/.test(answer),
      hasTechnicalTerms: /\b(react|javascript|api|database|algorithm|framework|code|system|python|java|node|aws)\b/i.test(answer),
      hasActionVerbs: /\b(developed|created|implemented|built|led|managed|optimized|solved|delivered|launched)\b/i.test(answer),
      hasResults: /\b(result|outcome|impact|improved|increased|decreased|reduced|saved)\b/i.test(answer),
      hasTeamWords: /\b(team|collaborate|together|group|colleague)\b/i.test(answer),
    };

    let score = 50;
    if (qi.wordCount >= 20) score += 8;
    if (qi.wordCount >= 40) score += 12;
    if (qi.hasExamples) score += 15;
    if (qi.hasNumbers) score += 10;
    if (qi.hasTechnicalTerms) score += 10;
    if (qi.hasActionVerbs) score += 10;
    if (qi.hasResults) score += 15;
    if (qi.hasTeamWords) score += 8;
    if (qi.wordCount < 10) score -= 20;
    if (qi.wordCount < 15) score -= 10;
    score = Math.max(20, Math.min(score, 100));

    const strengths = [];
    const improvements = [];
    if (qi.hasExamples) strengths.push("Provided specific examples");
    if (qi.hasNumbers) strengths.push("Used quantifiable data");
    if (qi.hasTechnicalTerms) strengths.push("Strong technical knowledge shown");
    if (qi.hasActionVerbs) strengths.push("Action-oriented language");
    if (qi.hasResults) strengths.push("Focused on outcomes");
    if (qi.hasTeamWords) strengths.push("Highlighted collaboration");
    if (!qi.hasExamples) improvements.push("Add specific examples");
    if (!qi.hasNumbers) improvements.push("Include metrics or numbers");
    if (!qi.hasResults) improvements.push("Focus on outcomes and impact");
    if (qi.wordCount < 15) improvements.push("Give more detailed responses");
    if (strengths.length === 0) strengths.push("Attempted the question");
    if (improvements.length === 0) improvements.push("Keep practicing for more depth");

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 200,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: "You are a professional interview coach giving brief, constructive feedback on a candidate's answer. Be encouraging but honest. 2-3 sentences max. Mention one strength and one improvement tip. Natural conversational tone. No bullet points. Sound warm and professional."
            },
            {
              role: "user",
              content: `Question: "${questionAsked}"\nAnswer: "${answer}"\n\nGive brief feedback.`
            }
          ]
        })
      });
      const data = await response.json();
      const aiResponse = data?.choices?.[0]?.message?.content?.trim();
      return { response: aiResponse || "Good attempt! Try to be more specific with examples and results.", score, strengths, improvements };
    } catch (err) {
      console.error("AI feedback error:", err);
    }

    let response;
    if (score >= 80) response = "Strong answer! Well-structured and specific.";
    else if (score >= 60) response = "Good attempt. Adding specific examples and measurable outcomes will strengthen it.";
    else response = "This needs more detail. Try the STAR method: Situation, Task, Action, Result.";
    return { response, score, strengths, improvements };
  }, []);

  const startRecording = useCallback(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }
    if (recognitionRef.current || interviewState !== "active" || isPaused || isSpeakingRef.current) return;

    setIsRecording(true);
    setAiStatus("listening");
    setTranscript("");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let accumulatedFinal = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) accumulatedFinal += e.results[i][0].transcript + " ";
        else interim += e.results[i][0].transcript;
      }
      setTranscript((accumulatedFinal + interim).trim());
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone permissions.');
        recognitionRef.current = null;
        setIsRecording(false);
        setAiStatus("idle");
      } else if (e.error === 'audio-capture') {
        alert('No microphone found. Please connect a microphone.');
        recognitionRef.current = null;
        setIsRecording(false);
        setAiStatus("idle");
      }
    };

    rec.onend = () => {
      if (recognitionRef.current) {
        try { rec.start(); } catch (e) { /* ignore */ }
      } else {
        setIsRecording(false);
        setAiStatus("idle");
      }
    };

    rec.start();
    recognitionRef.current = rec;
  }, [interviewState, isPaused]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setAiStatus("idle");
  }, []);

  const askNextQuestion = useCallback(async () => {
    setAiStatus("thinking");
    const previousAnswers = messagesRef.current
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content);

    const nextQuestion = await generateAIQuestion(questionCountRef.current, previousAnswers);

    setMessages(prev => [...prev, {
      role: 'ai',
      content: nextQuestion,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isQuestion: true,
      questionIndex: questionCountRef.current,
    }]);

    speakText(nextQuestion);
  }, [speakText, generateAIQuestion]);

  const sendAnswer = useCallback(async () => {
    const msg = transcript.trim();
    if (!msg || isLoading) return;

    stopRecording();
    setIsLoading(true);
    setAiStatus("thinking");

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastQuestion = [...messagesRef.current].reverse().find(m => m.isQuestion)?.content || "";

    setMessages(prev => [...prev, {
      role: 'user',
      content: msg,
      time: now,
      questionIndex: questionCountRef.current,
    }]);

    const fb = await generateQuestionFeedback(msg, lastQuestion);

    setMessages(prev => [...prev, {
      role: 'ai',
      content: fb.response,
      time: now,
      questionIndex: questionCountRef.current,
      feedback: fb,
    }]);

    setQuestionCount(prev => prev + 1);
    setIsLoading(false);
    setAiStatus("idle");
    setTranscript("");

    speakText(fb.response, () => {
      setTimeout(() => askNextQuestion(), 800);
    });
  }, [transcript, isLoading, stopRecording, askNextQuestion, generateQuestionFeedback, speakText]);

  useEffect(() => {
    if (interviewState === "active" && !isPaused) {
      timerRef.current = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [interviewState, isPaused]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startInterview = useCallback(() => {
    askedQuestionsRef.current = [];
    speakCancelledRef.current = false;
    setMessages([]);
    setQuestionCount(0);
    setTranscript("");
    setTimeElapsed(0);
    setInterviewState("active");
    setIsPaused(false);
    setFeedback(null);

    const userName = extractUserName();
    const greeting = `Hello ${userName}! I'm Alex, your AI interviewer. Let's have a conversational interview to get to know you better and discuss your experience. We'll go through some questions at your pace.`;

    setTimeout(() => {
      setMessages([{
        role: 'ai',
        content: greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setTimeout(() => {
        speakText(greeting, () => {
          setTimeout(() => askNextQuestion(), 800);
        });
      }, 400);
    }, 500);
  }, [speakText, askNextQuestion, extractUserName]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      setAiStatus("idle");
    } else {
      setIsPaused(true);
      setAiStatus("paused");
      speakCancelledRef.current = true;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      stopRecording();
    }
  }, [isPaused, stopRecording]);

  const endInterview = useCallback(() => {
    setInterviewState("completed");
    setAiStatus("completed");
    speakCancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    stopRecording();

    const qMsgs = messagesRef.current.filter(m => m.role === 'ai' && m.feedback?.score);
    const feedbackScore = qMsgs.length > 0
      ? Math.round(qMsgs.reduce((s, m) => s + m.feedback.score, 0) / qMsgs.length)
      : 65;

    const strengths = [], improvements = [];
    if (feedbackScore >= 80) {
      strengths.push("Strong overall performance", "Well-structured responses");
    } else if (feedbackScore >= 60) {
      strengths.push("Good communication skills", "Relevant experience shared");
      improvements.push("Add more specific examples", "Include quantifiable results");
    } else {
      strengths.push("Attempted all questions");
      improvements.push("Provide more detailed responses", "Practice the STAR method", "Add specific examples and metrics");
    }
    if (feedbackScore < 85) improvements.push("Include more technical details where relevant");

    setFeedback({ score: feedbackScore, strengths, improvements, duration: formatTime(timeElapsed) });
  }, [timeElapsed, stopRecording]);

  const resetInterview = useCallback(() => {
    askedQuestionsRef.current = [];
    speakCancelledRef.current = true;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    stopRecording();
    setMessages([]);
    setQuestionCount(0);
    setTranscript("");
    setTimeElapsed(0);
    setInterviewState("ready");
    setIsPaused(false);
    setFeedback(null);
    setAiStatus("idle");
  }, [stopRecording]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-mid';
    return 'score-low';
  };

  const getScoreHex = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (!resumeText) {
    return (
      <div className="ai-interview">
        <div className="ai-empty-state">
          <div className="ai-empty-icon">🎙️</div>
          <h3 className="ai-empty-title">No Resume Uploaded</h3>
          <p className="ai-empty-desc">Upload your resume first to start your AI-powered interview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-interview">

      {/* ── Header ── */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="#6366f1"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="ai-header-title">AI Interview</div>
            <div className="ai-header-sub">Powered by Alex</div>
          </div>
        </div>

        <div className="ai-header-right">
          <div className="ai-stat-pill">
            <span className="ai-stat-icon">⏱</span>
            <span className="ai-stat-val">{formatTime(timeElapsed)}</span>
          </div>
          <div className="ai-stat-pill">
            <span className="ai-stat-icon">Q</span>
            <span className="ai-stat-val">{questionCount}</span>
          </div>
          <div className={`ai-status-badge ai-status-${aiStatus}`}>
            {aiStatus === 'idle' && interviewState === 'ready' && 'Ready'}
            {aiStatus === 'idle' && interviewState === 'active' && 'Waiting'}
            {aiStatus === 'speaking' && '◉ Speaking'}
            {aiStatus === 'listening' && '◉ Listening'}
            {aiStatus === 'thinking' && '◌ Thinking'}
            {aiStatus === 'paused' && '⏸ Paused'}
            {aiStatus === 'completed' && '✓ Done'}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="ai-main">

        {/* Avatar Panel */}
        <div className="ai-avatar-panel">
          <div className="ai-avatar-wrap">
            {aiStatus === 'speaking' && (
              <>
                <div className="ai-pulse-ring ai-pulse-ring--1" />
                <div className="ai-pulse-ring ai-pulse-ring--2" />
              </>
            )}
            <div className={`ai-avatar ${interviewState === 'completed' ? 'ai-avatar--done' : ''} ai-avatar--${aiStatus}`}>
              {interviewState === 'completed' ? '✓' : 'A'}
            </div>
          </div>

          <div className="ai-alex-name">Alex</div>
          <div className="ai-alex-role">AI Interviewer</div>

          {/* Voice wave bars */}
          <div className="ai-wave">
            {[0, 0.1, 0.2, 0.15, 0.3, 0.05, 0.25, 0.1, 0.2, 0.15].map((delay, i) => (
              <div
                key={i}
                className={`ai-wave-bar ${aiStatus === 'speaking' ? 'ai-wave-bar--speaking' : ''} ${aiStatus === 'listening' ? 'ai-wave-bar--listening' : ''}`}
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>

          {interviewState === 'active' && (
            <div className="ai-mini-controls">
              <button className="ai-mini-btn" onClick={togglePause} title={isPaused ? 'Resume' : 'Pause'}>
                {isPaused ? '▶' : '⏸'}
              </button>
              <button className="ai-mini-btn ai-mini-btn--danger" onClick={endInterview} title="End Interview">
                ⏹
              </button>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="ai-chat-area">
          <div className="ai-chat-scroll" ref={chatRef}>

            {messages.length === 0 && interviewState === 'ready' && (
              <div className="ai-chat-empty">
                <div className="ai-chat-empty-icon">💬</div>
                <p className="ai-chat-empty-text">Your interview conversation will appear here</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`ai-msg-row ai-msg-row--${msg.role} ${msg.role === 'ai' ? 'ai-anim-up' : 'user-anim-up'}`}
              >
                <div className={`ai-msg-avatar ai-msg-avatar--${msg.role}`}>
                  {msg.role === 'ai' ? 'A' : 'U'}
                </div>

                <div className="ai-msg-body">
                  {msg.isQuestion && (
                    <div className="ai-q-badge">Q{(msg.questionIndex ?? 0) + 1}</div>
                  )}

                  <div className={`ai-bubble ai-bubble--${msg.role} ${msg.isQuestion ? 'ai-bubble--question' : ''}`}>
                    {msg.content}
                  </div>

                  {msg.role === 'ai' && msg.feedback && (
                    <div className="ai-feedback-card">
                      <div className="ai-feedback-top">
                        <div
                          className="ai-score-ring"
                          style={{
                            background: `conic-gradient(${getScoreHex(msg.feedback.score)} ${msg.feedback.score}%, #1e293b ${msg.feedback.score}%)`,
                          }}
                        >
                          <div className="ai-score-inner">
                            <span className={`ai-score-num ${getScoreColor(msg.feedback.score)}`}>
                              {msg.feedback.score}
                            </span>
                          </div>
                        </div>
                        <div className="ai-feedback-tags">
                          <div className="ai-feedback-row">
                            {msg.feedback.strengths.slice(0, 2).map((s, j) => (
                              <span key={j} className="ai-tag ai-tag--strength">✓ {s}</span>
                            ))}
                          </div>
                          <div className="ai-feedback-row">
                            {msg.feedback.improvements.slice(0, 1).map((imp, j) => (
                              <span key={j} className="ai-tag ai-tag--improve">↑ {imp}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.time && <div className="ai-msg-time">{msg.time}</div>}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-msg-row ai-msg-row--ai ai-anim-up">
                <div className="ai-msg-avatar ai-msg-avatar--ai">A</div>
                <div className="ai-bubble ai-bubble--ai">
                  <div className="ai-typing">
                    <div className="ai-typing-dot" style={{ animationDelay: '0s' }} />
                    <div className="ai-typing-dot" style={{ animationDelay: '0.2s' }} />
                    <div className="ai-typing-dot" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── SCROLL SENTINEL ─────────────────────────────
                This invisible div always sits at the very bottom
                of the message list. scrollIntoView() on it
                guarantees the chat scrolls down on every update.
            ─────────────────────────────────────────────── */}
            <div ref={bottomSentinelRef} style={{ height: 1, flexShrink: 0 }} />
          </div>

          {/* Input Area */}
          {interviewState === 'active' && (
            <div className="ai-input-area">
              <div className={`ai-transcript-box ${isRecording ? 'ai-transcript-box--recording' : ''} ${isSpeaking ? 'ai-transcript-box--speaking' : ''}`}>
                {isRecording && (
                  <div className="ai-rec-badge">
                    <div className="ai-rec-dot" />
                    REC
                  </div>
                )}
                <div className="ai-transcript-label">
                  {isPaused ? 'Paused' : isRecording ? 'Listening...' : isSpeaking ? 'Alex is speaking...' : 'Your answer'}
                </div>
                <div className={transcript ? 'ai-transcript-text' : 'ai-transcript-placeholder'}>
                  {transcript || (
                    isRecording ? "Speak clearly — I'm listening..."
                    : isPaused ? 'Click ▶ to resume the interview'
                    : isSpeaking ? 'Wait for Alex to finish...'
                    : 'Press the mic button or type your answer below'
                  )}
                </div>
              </div>

              <div className="ai-input-row">
                <button
                  className={`ai-mic-btn ${isRecording ? 'ai-mic-btn--recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading || isPaused || isSpeaking}
                  title={isSpeaking ? 'Wait for Alex' : isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>

                <button
                  className="ai-send-btn"
                  onClick={sendAnswer}
                  disabled={isLoading || !transcript.trim() || isPaused}
                >
                  {isLoading ? (
                    <>
                      <div className="ai-spinner" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      Send
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="none"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Completed Panel ── */}
      {interviewState === 'completed' && feedback && (
        <div className="ai-completed">
          <div className="ai-completed-header">
            <div className="ai-completed-title">Interview Complete</div>
            <div className="ai-completed-score-wrap">
              <div
                className="ai-score-ring ai-score-ring--lg"
                style={{
                  background: `conic-gradient(${getScoreHex(feedback.score)} ${feedback.score}%, #1e293b ${feedback.score}%)`,
                }}
              >
                <div className="ai-score-inner ai-score-inner--lg">
                  <span className={`ai-score-num--lg ${getScoreColor(feedback.score)}`}>
                    {feedback.score}
                  </span>
                  <span className="ai-score-denom">/100</span>
                </div>
              </div>
              <div>
                <div className="ai-score-label">Performance Score</div>
                <div className="ai-score-meta">{feedback.duration} · {questionCount} questions</div>
              </div>
            </div>
          </div>

          <div className="ai-completed-grid">
            <div className="ai-completed-card">
              <div className="ai-completed-card-title">
                <span className="color-green">✓</span> Strengths
              </div>
              {feedback.strengths.map((s, i) => (
                <div key={i} className="ai-completed-item">{s}</div>
              ))}
            </div>
            <div className="ai-completed-card">
              <div className="ai-completed-card-title">
                <span className="color-amber">↑</span> Areas to Improve
              </div>
              {feedback.improvements.map((imp, i) => (
                <div key={i} className="ai-completed-item">{imp}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="ai-action-bar">
        {interviewState === 'ready' && (
          <button className="ai-start-btn" onClick={startInterview}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Start Interview
          </button>
        )}
        {(interviewState === 'active' || interviewState === 'completed') && (
          <div className="ai-action-btns">
            <button className="ai-ghost-btn" onClick={resetInterview}>↺ New Interview</button>
            {interviewState === 'active' && (
              <button className="ai-danger-btn" onClick={endInterview}>⏹ End Interview</button>
            )}
            {interviewState === 'completed' && (
              <button className="ai-ghost-btn" onClick={() => window.print()}>↓ Export</button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default AIInterview;