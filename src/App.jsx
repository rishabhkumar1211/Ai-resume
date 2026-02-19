import { useState, useEffect } from "react";
import * as mammoth from "mammoth";
import Header from "./components/Header";
import Tabs from "./components/Tabs";
import ResumeUpload from "./components/ResumeUpload";
import ScoreSection from "./components/ScoreSection";
import KeywordAnalysis from "./components/KeywordAnalysis";
import IssuesSection from "./components/IssuesSection";
import Button from "./components/Button";
import EmptyState from "./components/EmptyState";
import AIInterview from "./components/AIInterview";
import { initCustomCursor } from "./utils/cursor";
import "./styles/animations.css";
import "./styles/components.css";
import "./styles/responsive.css";
import "./App.css";

const OPENAI_API = import.meta.env.DEV ? "/api/openai/v1/chat/completions" : "/api/proxy";

// PDF Loader
const loadPdfJs = () =>
  new Promise((resolve) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    document.head.appendChild(script);
  });

const extractPdfText = async (arrayBuffer) => {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((s) => s.str).join(" ") + "\n";
  }
  return text;
};

const parseFile = async (file) => {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "txt" || ext === "text") {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target.result);
      r.onerror = rej;
      r.readAsText(file);
    });
  }
  if (ext === "pdf") {
    const buf = await file.arrayBuffer();
    return extractPdfText(buf);
  }
  if (ext === "doc" || ext === "docx") {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  throw new Error("Unsupported file type: " + ext);
};

// Claude API
const callClaude = async (messages, system, maxTokens = 1000) => {
  if (import.meta.env.VITE_MOCK_MODE === "true") {
    return JSON.stringify({
      score: 75,
      metrics: { keywords: 80, formatting: 70, readability: 75, relevance: 75 },
      verdict: "Good Resume with Room for Improvement",
      description: "Your resume is well-structured but could benefit from more targeted keywords.",
      keywords_found: ["React", "JavaScript", "CSS", "HTML"],
      keywords_missing: ["TypeScript", "Node.js", "Agile", "Scrum"],
      issues: [
        { type: "warning", title: "Missing Keywords", fix: "Add TypeScript and Node.js to skills section" },
        { type: "good", title: "Good Formatting", fix: "Resume has clean, readable structure" }
      ]
    });
  }

  const apiKey = import.meta.env.DEV ? import.meta.env.VITE_GROQ_API_KEY : null;
  
  const res = await fetch(OPENAI_API, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(apiKey && { "Authorization": `Bearer ${apiKey}` })
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        ...messages
      ]
    }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(`API Error: ${res.status} - ${error.error?.message || 'Unknown error'}`);
  }
  
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
};

const parseATSResponse = (text) => {
  if (!text) return null;
  try {
    const block = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (block) return JSON.parse(block[1].trim());
  } catch {}
  try {
    return JSON.parse(text.trim());
  } catch {}
  try {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s !== -1 && e !== -1 && e > s) return JSON.parse(text.slice(s, e + 1));
  } catch {}
  return null;
};

// DOCX Generation
const loadDocxLib = () =>
  new Promise((resolve, reject) => {
    if (window.docx) return resolve(window.docx);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/docx/7.8.2/docx.umd.min.js";
    script.onload = () => {
      if (window.docx) resolve(window.docx);
      else reject(new Error("docx library not found"));
    };
    script.onerror = () => reject(new Error("Failed to load docx.js"));
    document.head.appendChild(script);
  });

const buildAndDownloadDocx = async (resumeText, atsResult, improvedText, fileName) => {
  const docx = await loadDocxLib();
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
  
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
        children: [
          new Paragraph({ children: [new TextRun({ text: "ATS-OPTIMIZED RESUME", bold: true, size: 36 })] }),
          new Paragraph({ children: [new TextRun({ text: improvedText, size: 24 })] })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "Resume_ATS_Optimized.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};


export default function App() {
  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [atsResult, setAtsResult] = useState(null);

  // Initialize custom cursor
  useEffect(() => {
    const cleanup = initCustomCursor();
    return cleanup;
  }, []);

  // Handle file selection (just store the file, don't analyze yet)
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setIsAnalyzing(false);
  };

  // Handle analysis (only when button is clicked)
  const analyzeATS = async (file, jobDescription) => {
    if (!file) return;
    
    setIsAnalyzing(true);
    try {
      const text = await parseFile(file);
      setResumeText(text);
      setJobDesc(jobDescription || "");

      const system = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze resumes and provide detailed feedback in JSON format with this exact structure:
{
  "score": 0-100,
  "metrics": {
    "keywords": 0-100,
    "formatting": 0-100,
    "readability": 0-100,
    "relevance": 0-100
  },
  "verdict": "Brief assessment",
  "description": "Detailed analysis",
  "keywords_found": ["list"],
  "keywords_missing": ["list"],
  "issues": [
    {
      "type": "critical|warning|good",
      "title": "Issue title",
      "fix": "How to fix it"
    }
  ]
}`;

      const prompt = `Analyze this resume for ATS optimization:

RESUME:
${text.slice(0, 4000)}

${jobDescription ? `JOB DESCRIPTION: ${jobDescription.slice(0, 1500)}` : "No job description provided"}`;

      const raw = await callClaude([{ role: "user", content: prompt }], system, 2000);
      const parsed = parseATSResponse(raw);
      
      if (parsed && parsed.score !== undefined) {
        setAtsResult(parsed);
        setActiveTab("results");
      } else {
        throw new Error("Failed to parse response");
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!atsResult || !resumeText) return;
    
    try {
      const improvedText = resumeText; // In real app, this would be improved
      await buildAndDownloadDocx(resumeText, atsResult, improvedText, "Resume_ATS_Optimized.docx");
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again.");
    }
  };

  const tabs = [
    { id: "upload", label: "Upload", icon: "📄" },
    { id: "results", label: "Results", icon: "📊" },
    { id: "interview", label: "Interview", icon: "🎤" }
  ];

  return (
    <div className="app">
      <div className="noise"></div>
      <div className="grid-bg"></div>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>
      <div className="particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      <Header />
      
      <main className="main">
        <div className="hero fade-in-up">
          <div className="hero-tag float-element">✨ AI-Powered Analysis</div>
          <h1 className="text-gradient-animate">ATS Resume <span>Optimizer</span></h1>
          <p className="glow-hover">Get your resume past ATS systems and land more interviews with AI-powered optimization</p>
        </div>

        <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} className="reveal-scale" />

        {activeTab === "upload" && (
          <div className="fade-in-up">
            <ResumeUpload 
              onFileSelect={handleFileSelect}
              onAnalyze={analyzeATS}
              isAnalyzing={isAnalyzing}
              selectedFile={selectedFile}
            />
          </div>
        )}

        {activeTab === "results" && (
          <>
            {atsResult ? (
              <div className="fade-in-up">
                <div className="card interactive hover-reveal">
                  <ScoreSection atsResult={atsResult} />
                  <KeywordAnalysis 
                    keywordsFound={atsResult.keywords_found}
                    keywordsMissing={atsResult.keywords_missing}
                  />
                  <IssuesSection issues={atsResult.issues} />
                  <div className="divider"></div>
                  {/* <div className="result-actions">
                    <Button onClick={handleDownloadDocx} className="btn-docx ripple">
                      📄 Download Optimized Resume
                    </Button>
                  </div> */}
                </div>
              </div>
            ) : (
              <div className="fade-in-up">
                <div className="card interactive">
                  <EmptyState 
                    icon="📊"
                    title="No Analysis Yet"
                    description="Upload and analyze your resume to see detailed ATS optimization results"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "interview" && (
          <div className="fade-in-up">
            <AIInterview resumeText={resumeText} />
          </div>
        )}
      </main>
    </div>
  );
}
