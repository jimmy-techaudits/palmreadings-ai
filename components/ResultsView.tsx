import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PalmReadingResult, ReadingTypeId } from '../types';
import { 
  Sparkles, 
  Map, 
  ChevronRight, 
  CheckCircle2, 
  Lightbulb, 
  Target, 
  Heart, 
  Scale, 
  Megaphone, 
  MapPin, 
  Eye,
  Download,
  Loader2,
  Clock,
  Shield,
  Briefcase,
  TrendingUp,
  Brain,
  Baby,
  Users,
  ThumbsUp,
  ThumbsDown,
  Send
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// --- CONFIGURATION ---
// PASTE YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL HERE
const FEEDBACK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzc7NNAhcSHwyOObWXK8j_jrFnf-b3apOrwOF9cEvgE1gfkjL5D4dIepQFhZQnw4jB_Pw/exec"; 

interface ResultsViewProps {
  result: PalmReadingResult;
  onReset: () => void;
  readingType: ReadingTypeId;
}

const getSectionIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('romantic timeline')) return <Clock size={20} />;
  if (t.includes('commitment')) return <Shield size={20} />;
  if (t.includes('emotional readiness')) return <Heart size={20} />;
  if (t.includes('family')) return <Heart size={20} />;
  if (t.includes('work style')) return <Briefcase size={20} />;
  if (t.includes('ambition')) return <Target size={20} />;
  if (t.includes('decision-making')) return <Brain size={20} />;
  if (t.includes('success blockers')) return <Target size={20} />;
  if (t.includes('near-term career')) return <TrendingUp size={20} />;
  if (t.includes('compatibility overview')) return <Heart size={20} />;
  if (t.includes('needs and patterns')) return <CheckCircle2 size={20} />;
  if (t.includes('dynamic between')) return <Scale size={20} />;
  if (t.includes('communication translation')) return <Megaphone size={20} />;
  if (t.includes('intimacy and affection')) return <Map size={20} />;
  if (t.includes('long-term potential')) return <MapPin size={20} />;
  if (t.includes('compatibility markers observed')) return <Eye size={20} />;
  if (t.includes('summary') || t.includes('glance')) return <Sparkles size={20} />;
  if (t.includes('marker') || t.includes('line') || t.includes('observed') || t.includes('blueprint')) return <Map size={20} />;
  if (t.includes('action') || t.includes('plan') || t.includes('challenge') || t.includes('toolkit')) return <Target size={20} />;
  if (t.includes('love') || t.includes('relationship') || t.includes('intimacy') || t.includes('attachment') || t.includes('trust')) return <Heart size={20} />;
  if (t.includes('career') || t.includes('money')) return <ChevronRight size={20} />;
  if (t.includes('mantra') || t.includes('prompt') || t.includes('integration') || t.includes('reflection')) return <Lightbulb size={20} />;
  return <CheckCircle2 size={20} />;
};

const getSectionTheme = (title: string, index: number, totalSections: number) => {
  const t = title.toLowerCase();
  if (t.includes('career path overview') || t.includes('near-term career focus') || t.includes('commitment & partnership signals') || t.includes('guidance for the path ahead') || t.includes('communication translation') || t.includes('origin story') || t.includes('integration prompt') || t.includes('career') || t.includes('money') || t.includes('calling') || t.includes('work') || t.includes('ambition') || t.includes('success') || t.includes('momentum')) {
    if (!t.includes('work style') && !t.includes('career markers') && !t.includes('ambition patterns') && !t.includes('success blockers')) {
      return { border: 'border-l-emerald-500 dark:border-l-emerald-400', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    }
  }
  if (t.includes('success blockers') || t.includes('love & future overview') || t.includes('emotional readiness & blockers') || t.includes('compatibility overview') || t.includes('intimacy and affection') || t.includes('love') || t.includes('attachment') || t.includes('compatibility') || t.includes('trust pattern') || t.includes('needs vs behaviors') || t.includes('romantic') || t.includes('commitment') || t.includes('partnership')) {
    if (!t.includes('timeline') && !t.includes('family') && !t.includes('next chapter') && !t.includes('destiny markers')) {
        return { border: 'border-l-rose-500 dark:border-l-rose-400', text: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-50 dark:bg-rose-900/20' };
    }
  }
  if (t.includes('decision-making & risk tolerance') || t.includes('your romantic timeline pattern') || (t.includes('needs and patterns') && index === 2) || t.includes('intuition and sensitivity') || t.includes('personality in motion') || t.includes('action plan') || t.includes('evolution path') || t.includes('alignment plan') || t.includes('decision-making')) {
    return { border: 'border-l-amber-500 dark:border-l-amber-400', text: 'text-amber-700 dark:text-amber-200', iconBg: 'bg-amber-50 dark:bg-amber-900/20' };
  }
  if (t.includes('love & destiny markers observed') || t.includes('long-term potential') || t.includes('reparenting toolkit') || t.includes('energy and stress') || t.includes('tension points')) {
    return { border: 'border-l-orange-500 dark:border-l-orange-400', text: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-50 dark:bg-orange-900/20' };
  }
  if (t.includes('motivation, drive, & ambition patterns') || t.includes('the next chapter in love') || (t.includes('needs and patterns') && index === 1) || t.includes('markers observed') || t.includes('blueprint markers') || t.includes('the you vs. the you') || t.includes('differences and alignments observed') || t.includes('reflection prompt') || t.includes('guidance')) {
    if (!t.includes('destiny')) {
        return { border: 'border-l-sky-500 dark:border-l-sky-400', text: 'text-sky-600 dark:text-sky-400', iconBg: 'bg-sky-50 dark:bg-sky-900/20' };
    }
  }
  return { border: 'border-l-purple-500 dark:border-l-purple-400', text: 'text-purple-600 dark:text-purple-300', iconBg: 'bg-purple-50 dark:bg-purple-900/20' };
};

const cleanTitle = (title: string) => title.replace(/^\d+[\.\s-]+\s*/, '');

const processFormattedText = (text: string) => {
  if (!text) return text;
  let normalized = text.replace(/(\s|^)(\*\*?)([^\*]+?)(\*\*?)(?=\W|$)/g, (match, space, start, content, end) => {
    if (start.length !== end.length) {
      return `${space}**${content}**`;
    }
    return match;
  });
  const boldParts = normalized.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="text-gray-950 dark:text-white font-bold">
          {processItalicText(inner)}
        </strong>
      );
    }
    return processItalicText(part);
  });
};

const processItalicText = (text: string) => {
  if (!text) return text;
  const italicParts = text.split(/(\*.*?\*)/g);
  return italicParts.map((p, j) => {
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      return (
        <em key={j} className="italic text-gray-800 dark:text-purple-100/90 font-medium">
          {p.slice(1, -1)}
        </em>
      );
    }
    return p;
  });
};

const renderMarkdown = (content: string) => {
  const cleanContent = content
    .split(/\r?\n/)
    .filter(line => !line.match(/COUNT_CHILDREN|COUNT_MARRIAGES/i))
    .join('\n')
    .trim();

  const lines = cleanContent.split(/\r?\n/);

  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-2" />;
    const bulletMatch = trimmed.match(/^[\*\-\•]\s*(.*)/);
    const isBullet = !!bulletMatch;
    const textContent = isBullet ? bulletMatch![1] : trimmed;
    const processed = processFormattedText(textContent);
    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-3 mb-3 pl-1">
          <span className="text-purple-500 dark:text-purple-400 mt-2.5 shrink-0 text-[10px]">●</span>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">{processed}</p>
        </div>
      );
    }
    return <p key={i} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed text-lg">{processed}</p>;
  });
};

const extractFamilyStats = (content: string) => {
  const childrenMatch = content.match(/COUNT_CHILDREN:\s*(.*)/i);
  const marriagesMatch = content.match(/COUNT_MARRIAGES:\s*(.*)/i);
  return {
    children: childrenMatch ? childrenMatch[1].trim() : null,
    marriages: marriagesMatch ? marriagesMatch[1].trim() : null,
  };
};

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset, readingType }) => {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Feedback States
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Refs for tracking state in the exit listener (to avoid stale closures)
  const ratingRef = useRef<number | null>(null);
  const commentRef = useRef<string>('');
  const feedbackSentRef = useRef<boolean>(false);
  const hasAutoLoggedRef = useRef<boolean>(false);

  useEffect(() => { ratingRef.current = rating; }, [rating]);
  useEffect(() => { commentRef.current = comment; }, [comment]);
  useEffect(() => { feedbackSentRef.current = feedbackSent; }, [feedbackSent]);

  const handleExitLogging = useCallback(() => {
    // Shared logging logic for visibility change, page hide, and unmounting
    if (ratingRef.current !== null && !feedbackSentRef.current && !hasAutoLoggedRef.current && FEEDBACK_SCRIPT_URL) {
      hasAutoLoggedRef.current = true;
      
      const payload = JSON.stringify({
        tab: "Feedback",
        readingType,
        rating: ratingRef.current,
        comment: commentRef.current,
        isAutoLog: true
      });

      // Beacon-style fetch to maximize chance of success during exit
      fetch(FEEDBACK_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        body: payload
      }).catch(() => {});
    }
  }, [readingType]);

  // Handle browser exit events (tab closed, tab hidden)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleExitLogging();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', handleExitLogging);
    
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', handleExitLogging);
    };
  }, [handleExitLogging]);

  // Handle component unmount (User clicks "New Reading" button)
  useEffect(() => {
    return () => {
      // Cleanup runs when ResultsView is removed from the DOM
      handleExitLogging();
    };
  }, [handleExitLogging]);

  const handleDownloadPDF = async () => {
    const element = resultsRef.current;
    if (!element) return;
    setIsDownloading(true);
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDark ? '#030712' : '#f9fafb',
        logging: false,
        onclone: (clonedDoc) => {
          const heading = clonedDoc.querySelector('.destiny-heading');
          if (heading) {
            heading.classList.remove('text-transparent', 'bg-clip-text', 'bg-gradient-to-r');
            heading.classList.add(isDark ? 'text-purple-100' : 'text-purple-800');
          }
          const container = clonedDoc.querySelector('.pdf-container');
          if (container instanceof HTMLElement) {
            container.style.paddingTop = '60px';
            container.style.paddingBottom = '60px';
            container.style.paddingLeft = '40px';
            container.style.paddingRight = '40px';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`Palm-Reading-AI-${dateStr}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const submitFeedback = async () => {
    if (!rating || !FEEDBACK_SCRIPT_URL) {
       setFeedbackSent(true);
       return;
    }
    setIsSubmittingFeedback(true);
    try {
      await fetch(FEEDBACK_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          tab: "Feedback",
          readingType,
          rating,
          comment,
          isAutoLog: false
        })
      });
      setFeedbackSent(true);
    } catch (err) {
      console.error('Feedback failed:', err);
      setFeedbackSent(true); 
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-6xl mx-auto space-y-12 pb-20">
      <div ref={resultsRef} className="pdf-container space-y-12 pt-4">
        <div className="text-center space-y-10">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center p-4 bg-purple-500/10 rounded-full text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30 mb-2">
              <Sparkles size={28} />
            </div>
            <h2 className="destiny-heading mystic-font text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-purple-700 dark:from-purple-200 dark:via-pink-200 dark:to-purple-200">
              Your Destiny Deciphered
            </h2>
          </div>
          <div className="glass-panel p-8 rounded-3xl max-w-4xl mx-auto shadow-2xl relative overflow-hidden border-l-4 border-l-purple-500 dark:border-l-purple-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
            <p className="text-xl text-gray-800 dark:text-purple-100 leading-relaxed italic font-serif relative z-10">"{result.result_summary}"</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch px-2 md:px-0">
          {result.sections.map((section, idx) => {
            const sanitizedTitle = cleanTitle(section.title);
            const t = sanitizedTitle.toLowerCase();
            const theme = getSectionTheme(sanitizedTitle, idx, result.sections.length);
            const isFullWidth = idx === 0 || t.includes('summary') || t.includes('at-a-glance') || t.includes('overview') || t.includes('compatibility overview') || t === 'your mantra' || t === 'reflection question' || t === 'reflection prompt' || t === 'alignment plan' || t.includes('guidance');
            const familyStats = t.includes('family & children') ? extractFamilyStats(section.content) : null;
            return (
              <div key={idx} className={`glass-panel p-8 rounded-2xl border-l-4 transition-all flex flex-col ${theme.border} ${isFullWidth ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-lg ${theme.iconBg} ${theme.text}`}>{getSectionIcon(sanitizedTitle)}</div>
                  <h3 className={`mystic-font text-2xl tracking-wide ${theme.text}`}>{sanitizedTitle}</h3>
                </div>
                <div className="max-w-none flex-grow">
                  {renderMarkdown(section.content)}
                  {familyStats && (familyStats.children || familyStats.marriages) && (
                    <div className="mt-8 pt-6 border-t border-purple-100 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {familyStats.children && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 flex flex-col items-center text-center">
                          <Baby className="text-purple-500 dark:text-purple-400 mb-2" size={24} />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400 mb-1 leading-tight">Potential Children</span>
                          <span className="text-2xl font-bold text-purple-700 dark:text-purple-200 font-serif">{familyStats.children}</span>
                        </div>
                      )}
                      {familyStats.marriages && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-900/30 flex flex-col items-center text-center">
                          <Users className="text-purple-500 dark:text-purple-400 mb-2" size={24} />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400 mb-1 leading-tight">Significant Marriages</span>
                          <span className="text-2xl font-bold text-purple-700 dark:text-purple-200 font-serif">{familyStats.marriages}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col items-center gap-6 pt-12 border-t border-purple-100 dark:border-white/5 w-full">
        <button onClick={handleDownloadPDF} disabled={isDownloading} className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/20 disabled:opacity-70 disabled:hover:scale-100">
          {isDownloading ? <Loader2 className="animate-spin" size={24} /> : <Download className="group-hover:translate-y-0.5 transition-transform" size={24} />}
          {isDownloading ? 'Preparing your reading...' : 'Download My Results'}
        </button>
        <div className="w-full max-w-xl glass-panel p-8 rounded-3xl mt-12 transition-all duration-500 border border-purple-500/20 shadow-xl shadow-purple-500/5">
          {feedbackSent ? (
            <div className="text-center animate-in fade-in zoom-in-95 duration-500 space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-full text-purple-600 mb-2"><CheckCircle2 size={32} /></div>
              <h4 className="mystic-font text-xl text-purple-700 dark:text-purple-200">Thank you!</h4>
              <p className="text-gray-500 dark:text-purple-300/60 font-serif italic text-sm">Your feedback helps us improve.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="mystic-font text-xl text-purple-700 dark:text-purple-200 mb-2">Was this reading accurate?</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Help us improve the AI's intuition</p>
              </div>
              <div className="flex justify-center gap-6">
                <button onClick={() => setRating(1)} className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 group ${rating === 1 ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30 scale-110' : 'bg-white dark:bg-white/5 border-purple-100 dark:border-white/10 text-purple-400 hover:border-purple-400 hover:text-purple-600'}`}>
                  <ThumbsUp size={28} className={rating === 1 ? '' : 'group-hover:scale-110 transition-transform'} />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Accurate</span>
                </button>
                <button onClick={() => setRating(-1)} className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 group ${rating === -1 ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30 scale-110' : 'bg-white dark:bg-white/5 border-purple-100 dark:border-white/10 text-purple-400 hover:border-purple-400 hover:text-purple-600'}`}>
                  <ThumbsDown size={28} className={rating === -1 ? '' : 'group-hover:scale-110 transition-transform'} />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Off-Base</span>
                </button>
              </div>
              {rating !== null && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us more about what resonated (optional)..." className="w-full p-4 bg-white/50 dark:bg-black/20 border border-purple-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm min-h-[100px] resize-none" />
                  <button onClick={submitFeedback} disabled={isSubmittingFeedback} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                    {isSubmittingFeedback ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} />Submit Feedback</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};