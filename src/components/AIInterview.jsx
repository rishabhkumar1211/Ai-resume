import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './Button';
import EmptyState from './EmptyState';

const AIInterview = ({ resumeText }) => {
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiStatus, setAiStatus] = useState("idle");
  const [questionCount, setQuestionCount] = useState(0);
  const [interviewState, setInterviewState] = useState("ready"); // ready, active, paused, completed
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [askedQuestions, setAskedQuestions] = useState([]); // Track asked questions to avoid repetition
  
  const chatRef = useRef();
  const timerRef = useRef(null);
  const audioContext = useRef(null);

  // Auto-scroll to bottom when messages change - Only affects chat container
  const scrollToBottom = () => {
    const chatContainer = chatRef.current;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract user's name from resume
  const extractUserName = useCallback(() => {
    if (!resumeText) return "there";
    
    // Look for common name patterns in resume
    const namePatterns = [
      /^([A-Z][a-z]+ [A-Z][a-z]+)/m,  // First Last at beginning
      /(?:name|Name):\s*([A-Z][a-z]+ [A-Z][a-z]+)/,  // Name: First Last
      /([A-Z][a-z]+ [A-Z][a-z]+)(?:\s+.*?){0,3}(?:resume|Resume|experience|Experience)/m  // Name before resume/experience
    ];
    
    for (const pattern of namePatterns) {
      const match = resumeText.match(pattern);
      if (match && match[1]) {
        return match[1].split(' ')[0]; // Return first name only
      }
    }
    
    return "there";
  }, [resumeText]);

  // Extract skills and technologies from resume
  const extractResumeSkills = useCallback(() => {
    if (!resumeText) return { skills: [], technologies: [], experience: [] };
    
    const commonSkills = [
      'javascript', 'react', 'node.js', 'python', 'java', 'html', 'css', 'sql', 'mongodb',
      'express', 'angular', 'vue', 'typescript', 'git', 'docker', 'kubernetes', 'aws',
      'azure', 'gcp', 'rest api', 'graphql', 'microservices', 'agile', 'scrum',
      'machine learning', 'data analysis', 'devops', 'ci/cd', 'testing', 'unit testing',
      'integration testing', 'frontend', 'backend', 'full stack', 'database design',
      'system architecture', 'cloud computing', 'security', 'performance optimization'
    ];
    
    const text = resumeText.toLowerCase();
    const foundSkills = [];
    const foundTechnologies = [];
    const experienceYears = text.match(/(\d+)\s*(years?|yrs?)\s*(of\s*experience|experience)?/gi) || [];
    
    // Extract skills and technologies mentioned in resume
    commonSkills.forEach(skill => {
      if (text.includes(skill)) {
        if (skill.includes('js') || skill.includes('react') || skill.includes('angular') || 
            skill.includes('vue') || skill.includes('python') || skill.includes('java') ||
            skill.includes('docker') || skill.includes('kubernetes') || skill.includes('aws')) {
          foundTechnologies.push(skill);
        } else {
          foundSkills.push(skill);
        }
      }
    });
    
    // Extract project keywords
    const projectKeywords = text.match(/project|developed|built|created|implemented|designed|led/gi) || [];
    
    return {
      skills: [...new Set(foundSkills)],
      technologies: [...new Set(foundTechnologies)],
      experience: experienceYears,
      hasProjects: projectKeywords.length > 0
    };
  }, [resumeText]);

  // AI Question Generator - creates adaptive, professional interviewer questions
  const generateAIQuestion = useCallback((questionIndex, previousAnswers = []) => {
    const resumeData = extractResumeSkills();
    const lastAnswer = previousAnswers[previousAnswers.length - 1] || "";
    const lastAnswerLower = lastAnswer.toLowerCase();
    
    // Analyze last answer for follow-up opportunities
    const answerAnalysis = {
      hasNumbers: /\d+/.test(lastAnswer),
      hasTimeFrame: /\b(year|month|week|day|quarter|since|from|to)\b/i.test(lastAnswer),
      hasTeamWords: /\b(team|collaborate|together|group|colleague)\b/i.test(lastAnswer),
      hasProblemWords: /\b(problem|challenge|issue|difficult|complex)\b/i.test(lastAnswer),
      hasSolutionWords: /\b(solved|fixed|implemented|created|developed|built)\b/i.test(lastAnswer),
      hasResultWords: /\b(result|outcome|impact|improved|increased|decreased|saved)\b/i.test(lastAnswer),
      isVague: lastAnswer.split(' ').length < 15,
      isDetailed: lastAnswer.split(' ').length > 40
    };
    
    // Helper function to check if question was already asked
    const isQuestionAsked = (question) => {
      return askedQuestions.some(asked => 
        asked.toLowerCase().includes(question.toLowerCase().split(' ').slice(0, 3).join(' '))
      );
    };
    
    const questionGenerators = [
      // Follow-up questions based on previous answer
      () => {
        if (questionIndex > 0 && answerAnalysis.hasProblemWords && !answerAnalysis.hasSolutionWords) {
          const followUp = "That sounds challenging. How did you eventually solve that problem?";
          if (!isQuestionAsked(followUp)) return followUp;
        }
        if (questionIndex > 0 && answerAnalysis.hasSolutionWords && !answerAnalysis.hasResultWords) {
          const followUp = "Great solution! What was the measurable impact or result of your approach?";
          if (!isQuestionAsked(followUp)) return followUp;
        }
        if (questionIndex > 0 && answerAnalysis.isVague) {
          const followUp = "Could you provide more specific details about that experience?";
          if (!isQuestionAsked(followUp)) return followUp;
        }
        if (questionIndex > 0 && answerAnalysis.hasTeamWords && !answerAnalysis.hasTimeFrame) {
          const followUp = "How long did you work with that team, and what was your specific role?";
          if (!isQuestionAsked(followUp)) return followUp;
        }
        return null;
      },
      
      // Resume-specific technology deep dives (with variety)
      () => {
        if (resumeData.technologies.length > 0) {
          const tech = resumeData.technologies[questionIndex % resumeData.technologies.length];
          const techQuestions = [
            `I see you have experience with ${tech}. Can you tell me about a project where you used ${tech} extensively?`,
            `Regarding ${tech}, what's the most complex feature you've implemented?`,
            `How did you get started with ${tech}, and what do you like most about it?`,
            `What challenges have you faced when working with ${tech}?`,
            `Can you compare ${tech} with other similar technologies you've used?`
          ];
          
          // Find an unused question about this technology
          for (const question of techQuestions) {
            if (!isQuestionAsked(question)) {
              return question;
            }
          }
        }
        return "What technologies are you most passionate about working with?";
      },
      
      // Behavioral questions with STAR method focus (ensuring variety)
      () => {
        const scenarios = [
          "a time you had to convince stakeholders to adopt your technical solution",
          "a situation where you had to learn a completely new technology under pressure",
          "an instance where you had to refactor legacy code",
          "a time when you had to make a critical architectural decision",
          "a situation where you had to handle a production emergency",
          "a time you had to mentor a junior developer",
          "a situation where you had to balance technical debt with new features"
        ];
        
        const scenarioIndex = (questionIndex + askedQuestions.length) % scenarios.length;
        const scenario = scenarios[scenarioIndex];
        const question = `Tell me about ${scenario}. What was the situation, task, action, and result?`;
        
        if (!isQuestionAsked(question)) return question;
        
        // Fallback to unused scenario
        for (let i = 0; i < scenarios.length; i++) {
          const fallbackQuestion = `Tell me about ${scenarios[i]}. What was the situation, task, action, and result?`;
          if (!isQuestionAsked(fallbackQuestion)) {
            return fallbackQuestion;
          }
        }
        
        return question;
      },
      
      // Technical depth questions
      () => {
        if (resumeData.technologies.length > 1) {
          const tech1 = resumeData.technologies[0];
          const tech2 = resumeData.technologies[1];
          const question = `When building applications with ${tech1} and ${tech2}, how do you ensure optimal performance and security?`;
          if (!isQuestionAsked(question)) return question;
        }
        return "How do you approach code optimization and performance tuning in your projects?";
      },
      
      // Experience and growth questions (with variety)
      () => {
        if (resumeData.experience.length > 0) {
          const expQuestions = [
            `With ${resumeData.experience[0]} of experience, what's been your biggest professional growth area?`,
            `What's the most valuable lesson you've learned in your ${resumeData.experience[0]} of experience?`,
            `How has your approach to development evolved over your ${resumeData.experience[0]}?`
          ];
          
          for (const question of expQuestions) {
            if (!isQuestionAsked(question)) {
              return question;
            }
          }
        }
        return "What technical or professional skills are you currently working to improve?";
      },
      
      // Project-specific questions
      () => {
        if (resumeData.hasProjects) {
          const projectQuestions = [
            "Looking at your resume, which project challenged you the most technically, and what made it challenging?",
            "Which project from your resume are you most proud of, and why?",
            "Can you describe the architecture of a key project mentioned in your resume?"
          ];
          
          for (const question of projectQuestions) {
            if (!isQuestionAsked(question)) {
              return question;
            }
          }
        }
        return "What project best demonstrates your problem-solving abilities?";
      },
      
      // Culture and collaboration questions
      () => {
        const collabQuestions = [
          "How do you contribute to code reviews and team knowledge sharing?",
          "How do you handle disagreements with team members about technical decisions?",
          "What's your approach to mentoring other developers?"
        ];
        
        for (const question of collabQuestions) {
          if (!isQuestionAsked(question)) {
            return question;
          }
        }
        
        return collabQuestions[0];
      },
      
      // Future-oriented questions
      () => {
        const futureQuestions = [
          "Where do you see the biggest opportunities for innovation in your current tech stack?",
          "What emerging technologies are you most excited about?",
          "How do you plan to grow your technical skills in the next few years?"
        ];
        
        for (const question of futureQuestions) {
          if (!isQuestionAsked(question)) {
            return question;
          }
        }
        
        return futureQuestions[0];
      }
    ];
    
    // Try follow-up questions first for more natural conversation
    let question = questionGenerators[0]();
    if (question) {
      setAskedQuestions(prev => [...prev, question]);
      return question;
    }
    
    // Select appropriate question generator (skip the follow-up generator)
    let generatorIndex = (questionIndex % (questionGenerators.length - 1)) + 1;
    
    // Prioritize resume-specific questions early, but ensure variety
    if (questionIndex < 3 && resumeData.technologies.length > 0) {
      generatorIndex = 1; // Technology questions first
    } else if (questionIndex < 5 && resumeData.technologies.length > 0) {
      generatorIndex = 3; // Technical depth questions
    }
    
    // Try to get a question that hasn't been asked
    let attempts = 0;
    let finalQuestion = null;
    
    while (attempts < questionGenerators.length && !finalQuestion) {
      finalQuestion = questionGenerators[generatorIndex]();
      if (isQuestionAsked(finalQuestion)) {
        finalQuestion = null;
        generatorIndex = (generatorIndex % (questionGenerators.length - 1)) + 1;
      }
      attempts++;
    }
    
    // If all else fails, use the generated question
    if (!finalQuestion) {
      finalQuestion = questionGenerators[generatorIndex]();
    }
    
    setAskedQuestions(prev => [...prev, finalQuestion]);
    return finalQuestion;
  }, [extractResumeSkills, askedQuestions]);

  // Timer management
  useEffect(() => {
    if (interviewState === "active" && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [interviewState, isPaused]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Text-to-speech with better voice handling
  const speakText = useCallback((text) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    setIsSpeaking(true);
    setAiStatus("speaking");
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.pitch = 1.05;
    utter.volume = 0.9;
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || voice.name.includes('Samantha') || voice.name.includes('Alex')
    ) || voices[0];
    
    if (preferredVoice) {
      utter.voice = preferredVoice;
    }
    
    utter.onend = () => {
      setIsSpeaking(false);
      setAiStatus("idle");
    };
    
    utter.onerror = () => {
      setIsSpeaking(false);
      setAiStatus("idle");
    };
    
    window.speechSynthesis.speak(utter);
  }, []);

  // Enhanced speech recognition with better control
  const startRecording = useCallback(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }
    
    // Only start if not already recording and interview is active
    if (isRecording || interviewState !== "active" || isPaused) return;
    
    setIsRecording(true);
    setAiStatus("listening");
    setTranscript("");
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const newRecognition = new SpeechRecognition();
    
    newRecognition.continuous = false; // Stop after one utterance
    newRecognition.interimResults = true;
    newRecognition.lang = "en-US";
    newRecognition.maxAlternatives = 1;
    
    newRecognition.onresult = (e) => {
      let final = "";
      let interim = "";
      
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      setTranscript(final + interim);
    };
    
    newRecognition.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      setIsRecording(false);
      setAiStatus("idle");
      if (e.error !== 'no-speech') {
        alert('Speech recognition error: ' + e.error);
      }
    };
    
    newRecognition.onend = () => {
      setIsRecording(false);
      setAiStatus("idle");
    };
    
    newRecognition.start();
    setRecognition(newRecognition);
  }, [isRecording, interviewState, isPaused]);

  const stopRecording = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
    }
    setIsRecording(false);
    setAiStatus("idle");
  }, [recognition]);

  // Generate contextual AI response
  const generateAIResponse = useCallback((userAnswer, questionIndex) => {
    const responses = [
      "That's a good foundation. Can you elaborate on the specific challenges you faced?",
      "Interesting approach. How would you optimize this for better performance?",
      "Great explanation. What testing strategies did you implement?",
      "I see. How did you handle edge cases in this scenario?",
      "Excellent. Can you compare this with alternative approaches you considered?",
      "That's insightful. What was the outcome of that situation?",
      "Great example. What did you learn from that experience?",
      "I understand. How would you handle a similar situation differently now?",
      "Good reflection. How did this impact your team or project?",
      "Valuable experience. How has this shaped your professional approach?",
      "That's comprehensive. How did you balance technical and business requirements?",
      "Good point. What metrics did you use to measure success?",
      "Excellent. How did you collaborate with different stakeholders?",
      "I see. What tools or technologies helped you achieve this?",
      "Great insight. How would you scale this solution for larger teams?"
    ];
    
    return responses[questionIndex % responses.length];
  }, []);

  // Enhanced answer submission with immediate feedback
  const sendAnswer = useCallback(async () => {
    const msg = transcript.trim();
    if (!msg || isLoading) return;
    
    setIsLoading(true);
    setAiStatus("thinking");
    
    // Add user message
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: msg, 
      time: now,
      questionIndex: questionCount 
    }]);
    
    // Simulate AI processing time - Increased wait time
    setTimeout(() => {
      // Generate contextual feedback
      const feedback = generateQuestionFeedback(msg, questionCount);
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: feedback.response, 
        time: now,
        questionIndex: questionCount,
        feedback: feedback 
      }]);
      
      setQuestionCount(prev => prev + 1);
      setIsLoading(false);
      setAiStatus("idle");
      setTranscript("");
      
      // Ask next question after a longer delay (continuous interview)
      setTimeout(() => {
        askNextQuestion();
      }, 4000); // Increased from 3000ms to 4000ms
    }, 2000); // Increased from 1500ms to 2000ms
  }, [transcript, isLoading, questionCount]);

  // Generate question-specific feedback with detailed improvement guidance
  const generateQuestionFeedback = (answer, questionIndex) => {
    const answerLower = answer.toLowerCase();
    let score = 50; // Base score
    let strengths = [];
    let improvements = [];
    let response = "";
    
    // Comprehensive answer analysis
    const qualityIndicators = {
      length: answer.length,
      wordCount: answer.split(' ').length,
      sentenceCount: answer.split(/[.!?]+/).length,
      hasExamples: /\b(example|for instance|such as|like|specifically|particularly)\b/i.test(answer),
      hasNumbers: /\d+/.test(answer),
      hasPercentages: /\d+%/.test(answer),
      hasTimeFrames: /\b(year|month|week|day|quarter|since|from|to)\b/i.test(answer),
      hasTechnicalTerms: /\b(react|javascript|api|database|algorithm|framework|library|code|programming|development|system|design|architecture|node|python|java)\b/i.test(answer),
      hasActionVerbs: /\b(developed|created|implemented|designed|built|led|managed|optimized|improved|solved|handled|achieved|delivered|launched)\b/i.test(answer),
      hasResults: /\b(result|outcome|impact|achieved|improved|increased|decreased|reduced|saved|generated|cut)\b/i.test(answer),
      hasTeamWords: /\b(team|collaborate|together|group|colleague|pair|shared)\b/i.test(answer),
      hasProblemWords: /\b(problem|challenge|issue|difficult|complex|bug|error)\b/i.test(answer),
      hasSolutionWords: /\b(solved|fixed|implemented|created|developed|built|resolved|addressed)\b/i.test(answer),
      hasBusinessImpact: /\b(revenue|profit|cost|budget|customer|user|client|business|market)\b/i.test(answer),
      hasLearningWords: /\b(learned|discovered|realized|found|gained|mastered)\b/i.test(answer),
      isVague: answer.split(' ').length < 15,
      isTooBrief: answer.split(' ').length < 10,
      isWellStructured: answer.split(' ').length >= 25 && answer.split(/[.!?]+/).length >= 3
    };
    
    // Advanced scoring algorithm
    if (qualityIndicators.wordCount >= 20) score += 8;
    if (qualityIndicators.wordCount >= 40) score += 12;
    if (qualityIndicators.isWellStructured) score += 10;
    if (qualityIndicators.hasExamples) score += 15;
    if (qualityIndicators.hasNumbers) score += 8;
    if (qualityIndicators.hasPercentages) score += 12;
    if (qualityIndicators.hasTimeFrames) score += 8;
    if (qualityIndicators.hasTechnicalTerms) score += 10;
    if (qualityIndicators.hasActionVerbs) score += 10;
    if (qualityIndicators.hasResults) score += 15;
    if (qualityIndicators.hasTeamWords) score += 8;
    if (qualityIndicators.hasBusinessImpact) score += 12;
    if (qualityIndicators.hasLearningWords) score += 5;
    
    // Penalties for poor answers
    if (qualityIndicators.isTooBrief) score -= 20;
    if (qualityIndicators.isVague) score -= 10;
    if (!qualityIndicators.hasActionVerbs && qualityIndicators.wordCount > 20) score -= 5;
    
    // Cap score at 100 and minimum at 20
    score = Math.max(20, Math.min(score, 100));
    
    // Generate specific strengths
    if (qualityIndicators.isWellStructured) strengths.push("Well-structured, comprehensive answer");
    if (qualityIndicators.hasExamples) strengths.push("Provided specific examples");
    if (qualityIndicators.hasNumbers) strengths.push("Used quantifiable data and metrics");
    if (qualityIndicators.hasPercentages) strengths.push("Included percentage-based results");
    if (qualityIndicators.hasTechnicalTerms) strengths.push("Demonstrated strong technical knowledge");
    if (qualityIndicators.hasActionVerbs) strengths.push("Used action-oriented language");
    if (qualityIndicators.hasResults) strengths.push("Focused on measurable results and impact");
    if (qualityIndicators.hasTeamWords) strengths.push("Highlighted teamwork and collaboration");
    if (qualityIndicators.hasBusinessImpact) strengths.push("Connected work to business outcomes");
    if (qualityIndicators.hasLearningWords) strengths.push("Showed growth and learning mindset");
    
    // Generate specific, actionable improvements
    if (qualityIndicators.isTooBrief) improvements.push("Provide much more detailed responses (aim for 20+ words)");
    if (qualityIndicators.isVague) improvements.push("Add specific details and concrete examples");
    if (!qualityIndicators.hasExamples) improvements.push("Include specific examples from your experience");
    if (!qualityIndicators.hasNumbers) improvements.push("Add metrics, numbers, or quantifiable results");
    if (!qualityIndicators.hasActionVerbs) improvements.push("Use more action verbs (developed, implemented, solved)");
    if (!qualityIndicators.hasResults) improvements.push("Focus on outcomes and impact of your work");
    if (!qualityIndicators.hasTimeFrames && qualityIndicators.wordCount > 15) improvements.push("Include timeframes to give context");
    if (!qualityIndicators.hasBusinessImpact && qualityIndicators.wordCount > 20) improvements.push("Connect your work to business value");
    if (qualityIndicators.wordCount > 15 && !qualityIndicators.hasTechnicalTerms) improvements.push("Include relevant technical details");
    
    // Ensure we have at least one strength and improvement
    if (strengths.length === 0) strengths.push("Attempted to answer the question");
    if (improvements.length === 0) improvements.push("Continue practicing with more specific examples");
    
    // Generate contextual response based on score and content
    if (score >= 90) {
      response = "Outstanding answer! This is exactly what interviewers look for - comprehensive, specific, and results-oriented.";
    } else if (score >= 80) {
      response = "Excellent response! Your answer was strong and well-structured. With a few more specific details, it would be perfect.";
    } else if (score >= 70) {
      response = "Good answer with solid points. To make it stronger, focus on adding more specific examples and measurable results.";
    } else if (score >= 60) {
      response = "Decent attempt. Your answer has some good elements but needs more detail, structure, and specific examples to be more effective.";
    } else if (score >= 50) {
      response = "Your answer needs significant improvement. Try to provide more specific details, structure your thoughts better, and include relevant examples.";
    } else {
      response = "This answer needs work. Focus on providing specific examples, using action verbs, and including measurable results. Consider using the STAR method: Situation, Task, Action, Result.";
    }
    
    return {
      response,
      score,
      strengths,
      improvements,
      detailedAnalysis: {
        wordCount: qualityIndicators.wordCount,
        hasMetrics: qualityIndicators.hasNumbers || qualityIndicators.hasPercentages,
        hasExamples: qualityIndicators.hasExamples,
        isWellStructured: qualityIndicators.isWellStructured
      }
    };
  };

  // Ask next question - Increased delay for better user experience
  const askNextQuestion = useCallback(() => {
    // Get previous answers for context
    const previousAnswers = messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content);
    
    // Generate AI question based on context
    const nextQuestion = generateAIQuestion(questionCount, previousAnswers);
    
    setTimeout(() => {
      speakText(nextQuestion);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: nextQuestion, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isQuestion: true 
      }]);
    }, 1000); // Increased delay before speaking
  }, [questionCount, speakText, generateAIQuestion, messages]);

  // Start interview
  const startInterview = useCallback(() => {
    setMessages([]);
    setQuestionCount(0);
    setTranscript("");
    setTimeElapsed(0);
    setInterviewState("active");
    setIsPaused(false);
    setFeedback(null);
    setAskedQuestions([]); // Reset question history for fresh start
    
    const userName = extractUserName();
    const greeting = `Hello ${userName}! I'm Alex, your AI interviewer. Let's have a conversational interview to get to know you better and discuss your experience. We'll go through some questions at your pace.`;
    
    setTimeout(() => {
      setMessages([{ 
        role: 'ai', 
        content: greeting, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
      
      setTimeout(() => {
        speakText(greeting);
        setTimeout(() => askNextQuestion(), 3000);
      }, 400);
    }, 1000);
  }, [speakText, askNextQuestion, extractUserName]);

  // Pause/Resume interview
  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      setAiStatus("idle");
    } else {
      setIsPaused(true);
      setAiStatus("paused");
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isPaused, isSpeaking, isRecording, stopRecording]);

  // End interview and provide feedback
  const endInterview = useCallback(() => {
    setInterviewState("completed");
    setAiStatus("completed");
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }
    if (isRecording) {
      stopRecording();
    }
    
    // Calculate actual feedback score based on question performance
    const questionMessages = messages.filter(msg => msg.role === 'ai' && msg.feedback && msg.feedback.score);
    let feedbackScore;
    
    if (questionMessages.length > 0) {
      // Calculate average of all question scores
      const totalScore = questionMessages.reduce((sum, msg) => sum + msg.feedback.score, 0);
      feedbackScore = Math.round(totalScore / questionMessages.length);
    } else {
      // Fallback for edge cases
      feedbackScore = 65;
    }
    
    // Generate dynamic strengths and improvements based on performance
    const strengths = [];
    const improvements = [];
    
    if (feedbackScore >= 80) {
      strengths.push("Strong overall performance", "Well-structured responses");
    } else if (feedbackScore >= 60) {
      strengths.push("Good communication skills", "Relevant experience shared");
      improvements.push("Add more specific examples", "Include quantifiable results");
    } else {
      strengths.push("Attempted all questions");
      improvements.push("Provide more detailed responses", "Practice STAR method", "Add specific examples and metrics");
    }
    
    // Add common improvement suggestions
    if (feedbackScore < 85) {
      improvements.push("Include more technical details where relevant");
    }
    
    setFeedback({
      score: feedbackScore,
      strengths,
      improvements,
      duration: formatTime(timeElapsed)
    });
  }, [timeElapsed, isSpeaking, isRecording, stopRecording, messages]);

  // Reset interview
  const resetInterview = useCallback(() => {
    setMessages([]);
    setQuestionCount(0);
    setTranscript("");
    setTimeElapsed(0);
    setInterviewState("ready");
    setIsPaused(false);
    setFeedback(null);
    setAskedQuestions([]); // Reset question history
    setAiStatus("idle");
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }
    if (isRecording) {
      stopRecording();
    }
  }, [isSpeaking, isRecording, stopRecording]);

  // Manual scroll - let users control their own view
  // useEffect(() => {
  //   if (chatRef.current) {
  //     chatRef.current.scrollTop = chatRef.current.scrollHeight;
  //   }
  // }, [messages]);

  if (!resumeText) {
    return (
      <div className="card interactive">
        <EmptyState 
          icon="🎤"
          title="No Resume Uploaded"
          description="Upload your resume first to start personalized AI interview practice"
        />
      </div>
    );
  }

  return (
    <div className="card interactive hover-reveal">
      <div className="card-header">
        <div className="card-icon">🎤</div>
        <div>
          <h2>AI Interview Practice</h2>
          <p>Professional interview simulation with real-time feedback</p>
        </div>
        <div className="interview-stats">
          <span className="stat-badge">{formatTime(timeElapsed)}</span>
          <span className="stat-badge">Q{questionCount}</span>
        </div>
      </div>

      <div className="interview-container">
        {/* AI Interviewer Stage */}
        <div className="ai-stage">
          <div className={`avatar-circle ${aiStatus}`}>
            {interviewState === "completed" ? "✅" : "🤖"}
          </div>
          <div className="ai-name">Alex · AI Interviewer</div>
          <div className={`ai-status ${aiStatus}`}>
            {aiStatus === "idle" && interviewState === "ready" && "● Ready to start"}
            {aiStatus === "idle" && interviewState === "active" && "● Ready for answer"}
            {aiStatus === "speaking" && "◉ Speaking..."}
            {aiStatus === "listening" && "◉ Listening..."}
            {aiStatus === "thinking" && "◌ Thinking..."}
            {aiStatus === "paused" && "⏸ Paused"}
            {aiStatus === "completed" && "✓ Interview Complete"}
            {aiStatus === "error" && "⚠ Error occurred"}
          </div>
          
          {/* Interview Controls */}
          {interviewState === "active" && (
            <div className="interview-controls-mini">
              <button onClick={togglePause} className="control-btn">
                {isPaused ? "▶" : "⏸"}
              </button>
              <button onClick={endInterview} className="control-btn danger">
                ⏹
              </button>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="chat-body">
          <div className="chat-messages" ref={chatRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`msg msg-${msg.role} ${msg.isQuestion ? 'question' : ''}`}>
                <div className="msg-avatar">
                  {msg.role === 'ai' ? '🤖' : '👤'}
                </div>
                <div>
                  <div className="msg-bubble">
                    {msg.content}
                    {msg.isQuestion && <span className="question-indicator">Q{msg.questionIndex + 1}</span>}
                  </div>
                  
                  {/* Show feedback for user answers */}
                  {msg.role === 'ai' && msg.feedback && (
                    <div className="answer-feedback">
                      <div className="feedback-score">
                        <span className="score-label">Answer Score:</span>
                        <span className="score-value">{msg.feedback.score}%</span>
                      </div>
                      <div className="feedback-details">
                        <div className="feedback-item">
                          <span className="feedback-label">✅ Strengths:</span>
                          <span className="feedback-text">{msg.feedback.strengths.join(", ")}</span>
                        </div>
                        <div className="feedback-item">
                          <span className="feedback-label">📈 Improvements:</span>
                          <span className="feedback-text">{msg.feedback.improvements.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {msg.time && (
                    <div className="msg-time">{msg.time}</div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="msg msg-ai">
                <div className="msg-avatar">🤖</div>
                <div className="msg-bubble">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Answer Input Area */}
        {interviewState === "active" && (
          <div className="interview-controls">
            <div className={`transcript-box ${isRecording ? 'recording' : ''}`}>
              <div className="transcript-label">
                Your Answer
                {isPaused && <span className="paused-indicator"> (Paused)</span>}
              </div>
              {isRecording && (
                <div className="rec-badge">
                  <div className="rec-dot"></div>
                  REC {formatTime(timeElapsed)}
                </div>
              )}
              {transcript ? (
                <span>{transcript}</span>
              ) : (
                <span className="transcript-placeholder">
                  {isRecording ? "Listening — speak your answer clearly..." : 
                   isPaused ? "Interview paused — click resume to continue" :
                   "Tap mic to speak or type your answer"}
                </span>
              )}
            </div>

            <div className="button-row">
              <button
                className={`mic-btn ${isRecording ? "recording" : "idle"}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isPaused}
              >
                {isRecording ? "⏹" : "🎤"}
              </button>
              <button
                className="send-btn"
                onClick={sendAnswer}
                disabled={isLoading || !transcript.trim() || isPaused}
              >
                {isLoading ? "Thinking..." : "Send Answer"}
              </button>
            </div>
          </div>
        )}

        {/* Interview Complete Feedback */}
        {interviewState === "completed" && feedback && (
          <div className="feedback-section">
            <div className="feedback-header">
              <h3>Interview Complete! 🎉</h3>
              <div className="score-display">
                <span className="score-value">{feedback.score}%</span>
                <span className="score-label">Performance Score</span>
              </div>
            </div>
            
            <div className="feedback-content">
              <div className="feedback-section">
                <h4>✅ Strengths</h4>
                <ul>
                  {feedback.strengths.map((strength, i) => (
                    <li key={i}>{strength}</li>
                  ))}
                </ul>
              </div>
              
              <div className="feedback-section">
                <h4>📈 Areas for Improvement</h4>
                <ul>
                  {feedback.improvements.map((improvement, i) => (
                    <li key={i}>{improvement}</li>
                  ))}
                </ul>
              </div>
              
              <div className="feedback-stats">
                <span>Duration: {feedback.duration}</span>
                <span>Questions: {questionCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interview Actions */}
      <div className="interview-actions">
        {interviewState === "ready" && (
          <Button onClick={startInterview} className="btn-primary ripple">
            🎤 Start Interview
          </Button>
        )}
        
        {(interviewState === "active" || interviewState === "completed") && (
          <>
            <Button onClick={resetInterview} className="btn-ghost">
              🔄 New Interview
            </Button>
            <Button onClick={endInterview} className="btn-outline">
              ⏹ End Interview
            </Button>
            {interviewState === "completed" && (
              <Button onClick={() => window.print()} className="btn-outline">
              📄 Export Feedback
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIInterview;
