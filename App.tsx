import React, { useState, useEffect } from 'react';
import { 
  READING_TYPES 
} from './constants';
import { 
  ReadingTypeId, 
  AppState, 
  PalmReadingResult,
  UploadedImages,
  PartnerDetails
} from './types';
import { ImageUploadTile } from './components/ImageUploadTile';
import { ResultsView } from './components/ResultsView';
import { generatePalmReading, validateHandImages } from './services/geminiService';
import { Info, Moon, Sun, Sparkles, User, AlertCircle, ChevronDown, ChevronUp, Calendar, Hash } from 'lucide-react';

// --- CONFIGURATION ---
// PASTE YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL FOR USAGE LOGGING HERE
const USAGE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9PjKRGAtBZYQZCl9Hf5oRf27BlO07ihMKMEajRcoHxGkQIAkggt-FCF6Cron8CX_UFw/exec";

const WhimsicalLoader: React.FC<{ stage: string }> = ({ stage }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-10 animate-in fade-in duration-700">
      <div className="relative">
        <div className="animate-[spin_4s_linear_infinite]">
          <Moon size={80} className="text-purple-600 dark:text-purple-400 fill-purple-600/20" />
        </div>
        
        <Sparkles 
          size={24} 
          className="absolute -top-4 -right-4 text-amber-400 animate-pulse delay-75" 
        />
        <Sparkles 
          size={18} 
          className="absolute top-1/2 -left-8 text-purple-400 animate-bounce delay-150" 
        />
        <Sparkles 
          size={20} 
          className="absolute -bottom-6 right-2 text-pink-400 animate-pulse delay-300" 
        />
        
        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
      </div>

      <div className="space-y-3">
        <h3 className="text-3xl mystic-font text-gray-900 dark:text-white tracking-widest">
          {stage === 'validating' ? 'Checking Clarity' : 'Revealing the Paths Written in Your Hands'}
        </h3>
        <p className="text-gray-500 dark:text-purple-300/60 font-serif italic animate-pulse">
          {stage === 'validating' ? 'Ensuring your photos are clear...' : 'Tracing the stories in your palms...'}
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [appState, setAppState] = useState<AppState>(AppState.CREATE);
  const [loadingStage, setLoadingStage] = useState<'validating' | 'reading'>('validating');
  const [selectedReadingType, setSelectedReadingType] = useState<ReadingTypeId>('dominant');
  const [uploadedImages, setUploadedImages] = useState<UploadedImages>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [readingResult, setReadingResult] = useState<PalmReadingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOptionalExpanded, setIsOptionalExpanded] = useState<boolean>(false);
  
  // Partner A Details
  const [partnerAName, setPartnerAName] = useState<string>('');
  const [partnerAAge, setPartnerAAge] = useState<string>('');
  const [partnerAPronouns, setPartnerAPronouns] = useState<string>('');
  const [partnerAPronounsOther, setPartnerAPronounsOther] = useState<string>('');

  // Partner B Details
  const [partnerBName, setPartnerBName] = useState<string>('');
  const [partnerBAge, setPartnerBAge] = useState<string>('');
  const [partnerBPronouns, setPartnerBPronouns] = useState<string>('');
  const [partnerBPronounsOther, setPartnerBPronounsOther] = useState<string>('');

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) html.classList.add('dark');
    else html.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const currentReadingConfig = READING_TYPES.find(r => r.id === selectedReadingType)!;

  const handleImageUpload = (id: string, base64: string) => {
    setUploadedImages(prev => ({ ...prev, [id]: base64 }));
    setImageErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleImageRemove = (id: string) => {
    setUploadedImages(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    setImageErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const getImageLabel = (id: string) => {
    const pA = partnerAName.trim() || 'Partner A';
    const pB = partnerBName.trim() || 'Partner B';
    const isSide = id.endsWith('_side');
    const baseId = isSide ? id.replace('_side', '') : id;
    
    let baseLabel = '';
    switch (baseId) {
      case 'dominant_hand': 
        baseLabel = selectedReadingType === 'couples' ? `${pA}'s Dominant Hand` : 'Your Dominant Hand';
        break;
      case 'non_dominant_hand': 
        baseLabel = selectedReadingType === 'couples' ? `${pA}'s Non-Dominant Hand` : 'Your Non-Dominant Hand';
        break;
      case 'partner_dominant_hand': 
        baseLabel = `${pB}'s Dominant Hand`;
        break;
      case 'partner_non_dominant_hand': 
        baseLabel = `${pB}'s Non-Dominant Hand`;
        break;
      default: baseLabel = 'Hand Image';
    }

    return isSide ? `${baseLabel} (Pinky Side)` : baseLabel;
  };

  const canSubmit = 
    currentReadingConfig.requiredImages.every(imgKey => !!uploadedImages[imgKey]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    window.scrollTo(0, 0);
    
    setAppState(AppState.LOADING);
    setLoadingStage('validating');
    setErrorMessage('');
    setImageErrors({});

    const getFinalPronoun = (p: string, other: string) => {
      if (p === 'other') return other.trim();
      return p;
    };

    const finalNameA = partnerAName.trim() || 'Partner A';
    const finalNameB = partnerBName.trim() || 'Partner B';
    const pAPronouns = getFinalPronoun(partnerAPronouns, partnerAPronounsOther);
    const pBPronouns = getFinalPronoun(partnerBPronouns, partnerBPronounsOther);

    // Usage Tracking
    if (USAGE_SCRIPT_URL) {
      const additionalPhotosCount = Object.keys(uploadedImages).filter(k => k.endsWith('_side')).length;
      const usagePayload = {
        tab: "Usage",
        timestamp: new Date().toISOString(),
        readingType: selectedReadingType,
        additionalPhotosCount,
        partnerAName: finalNameA,
        partnerAAge: partnerAAge,
        partnerAPronouns: pAPronouns,
        partnerBName: finalNameB,
        partnerBAge: partnerBAge,
        partnerBPronouns: pBPronouns
      };

      // Note: Removed Content-Type header to maintain a valid 'simple request' in no-cors mode
      fetch(USAGE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(usagePayload)
      }).catch(e => console.error("Usage logging failed:", e));
    }

    try {
      const validations = await validateHandImages(uploadedImages);
      const invalidOnes = validations.filter(v => !v.isValid);
      
      if (invalidOnes.length > 0) {
        const newErrors: Record<string, string> = {};
        invalidOnes.forEach(v => {
          newErrors[v.key] = v.reason;
        });
        setImageErrors(newErrors);
        setErrorMessage('Some photos were not clear enough. Please re-upload the flagged ones.');
        setAppState(AppState.CREATE);
        return;
      }

      setLoadingStage('reading');
      const result = await generatePalmReading(
        selectedReadingType, 
        uploadedImages,
        selectedReadingType === 'couples' ? { 
          partnerA: { 
            name: finalNameA, 
            age: partnerAAge, 
            pronouns: pAPronouns 
          }, 
          partnerB: { 
            name: finalNameB, 
            age: partnerBAge, 
            pronouns: pBPronouns 
          } 
        } : undefined
      );
      
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'generate_reading', {
          'reading_type': selectedReadingType,
          'has_partner_names': selectedReadingType === 'couples' ? 'true' : 'false'
        });
      }

      setReadingResult(result);
      window.scrollTo(0, 0);
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error(error);
      setErrorMessage('The spirits were clouded. Please ensure your photos are clear and try again.');
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.CREATE);
    setUploadedImages({});
    setImageErrors({});
    setReadingResult(null);
    setErrorMessage('');
    setPartnerAName('');
    setPartnerAAge('');
    setPartnerAPronouns('');
    setPartnerAPronounsOther('');
    setPartnerBName('');
    setPartnerBAge('');
    setPartnerBPronouns('');
    setPartnerBPronounsOther('');
    setIsOptionalExpanded(false);
    window.scrollTo(0, 0);
  };

  const currentYear = new Date().getFullYear();

  const PronounOptions = () => (
    <>
      <option value="" className="bg-white dark:bg-gray-900">Select Pronouns</option>
      <option value="she/her" className="bg-white dark:bg-gray-900">she/her</option>
      <option value="he/him" className="bg-white dark:bg-gray-900">he/him</option>
      <option value="they/them" className="bg-white dark:bg-gray-900">they/them</option>
      <option value="he/they" className="bg-white dark:bg-gray-900">he/they</option>
      <option value="she/they" className="bg-white dark:bg-gray-900">she/they</option>
      <option value="other" className="bg-white dark:bg-gray-900">Other...</option>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 bg-gradient-to-b from-purple-50 via-white to-purple-50 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-950 selection:bg-purple-500/30 selection:text-purple-900 dark:selection:text-purple-200">
      
      <header className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-purple-100 dark:border-white/5 bg-white/80 dark:bg-gray-950/60 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 h-24 flex items-center justify-between">
          <a href="https://palmreadings.ai" className="flex items-center py-2 group">
            <img 
              src="https://palmreadings.ai/wp-content/uploads/2025/12/palm-readings-ai-logo.png" 
              alt="Palm Readings AI" 
              className="h-20 w-auto object-contain transition-opacity group-hover:opacity-80"
            />
          </a>
          <div className="flex items-center gap-4">
             {appState === AppState.RESULT && (
               <button onClick={handleReset} className="hidden sm:block text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-white transition-colors">
                 New Reading
               </button>
             )}
             <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-purple-200 transition-all">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-12 px-6 max-w-6xl mx-auto flex-grow w-full">
        {appState === AppState.CREATE && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="mystic-font text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-purple-700 dark:from-purple-200 dark:via-pink-200 dark:to-purple-200">
                Discover Your Path
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">Upload photos of your palms and unveil the lines of your destiny.</p>
            </div>

            {errorMessage && (
              <div className="max-w-md mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 animate-bounce">
                <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorMessage}</p>
              </div>
            )}

            <section className="space-y-6">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 mb-4">
                <h3 className="text-lg font-bold uppercase tracking-widest">Choose Reading Type</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {READING_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                        setSelectedReadingType(type.id);
                        setUploadedImages({});
                        setImageErrors({});
                        setErrorMessage('');
                        setIsOptionalExpanded(false);
                    }}
                    className={`relative p-4 md:p-6 rounded-xl transition-all duration-300 flex flex-col items-center text-center border h-full ${
                      selectedReadingType === type.id
                        ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-500 ring-1 ring-purple-500 shadow-xl shadow-purple-500/10'
                        : 'bg-white dark:bg-white/5 border-purple-100 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/50'
                    }`}
                  >
                    <div className="mb-3 text-purple-900 dark:text-purple-200 font-serif text-sm md:text-lg font-bold">
                      {type.title}
                    </div>
                    
                    <div className="w-full h-24 md:h-32 mb-4 flex items-center justify-center">
                      <img 
                        src={type.imageSrc} 
                        alt={type.title}
                        className="w-full h-full object-contain max-w-[80px] md:max-w-[100px]"
                      />
                    </div>

                    <p className="text-[10px] md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {type.description}
                    </p>
                    {selectedReadingType === type.id && (
                        <div className="absolute top-2 right-2 md:top-4 md:right-4 w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {selectedReadingType === 'couples' && (
              <section className="animate-in slide-in-from-top-4 duration-500 space-y-10">
                 <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 mb-4">
                  <h3 className="text-lg font-bold uppercase tracking-widest">Partner Profiles</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
                  {/* Partner A */}
                  <div className="glass-panel p-6 rounded-2xl space-y-4 border-l-4 border-l-purple-500">
                    <h4 className="font-bold text-purple-700 dark:text-purple-300 text-sm uppercase tracking-widest flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-[10px]">1</div>
                      Partner A
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-tighter text-gray-500 dark:text-purple-400/60">Name (Optional)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                          <input 
                            type="text" 
                            value={partnerAName}
                            onChange={(e) => setPartnerAName(e.target.value)}
                            placeholder="Partner A"
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/20 border border-purple-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm dark:text-purple-100"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-tighter text-gray-500 dark:text-purple-400/60">Age</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                            <input 
                              type="number" 
                              value={partnerAAge}
                              onChange={(e) => setPartnerAAge(e.target.value)}
                              placeholder="Years"
                              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/20 border border-purple-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm dark:text-purple-100"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-tighter text-gray-500 dark:text-purple-400/60">Pronouns</label>
                          <div className="relative">
                            <select 
                              value={partnerAPronouns}
                              onChange={(e) => setPartnerAPronouns(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white dark:bg-black/20 border border-purple-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm appearance-none text-gray-800 dark:text-purple-100 cursor-pointer"
                            >
                              <PronounOptions />
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" size={14} />
                          </div>
                        </div>
                      </div>
                      {partnerAPronouns === 'other' && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                          <input 
                            type="text" 
                            value={partnerAPronounsOther}
                            onChange={(e) => setPartnerAPronounsOther(e.target.value)}
                            placeholder="Enter custom pronouns..."
                            className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-purple-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm dark:text-purple-100"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Partner B */}
                  <div className="glass-panel p-6 rounded-2xl space-y-4 border-l-4 border-l-pink-500">
                    <h4 className="font-bold text-pink-700 dark:text-pink-300 text-sm uppercase tracking-widest flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-[10px]">2</div>
                      Partner B
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-tighter text-gray-500 dark:text-purple-400/60">Name (Optional)</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={16} />
                          <input 
                            type="text" 
                            value={partnerBName}
                            onChange={(e) => setPartnerBName(e.target.value)}
                            placeholder="Partner B"
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/20 border border-pink-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm dark:text-purple-100"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-tighter text-gray-500 dark:text-purple-400/60">Age</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={16} />
                            <input 
                              type="number" 
                              value={partnerBAge}
                              onChange={(e) => setPartnerBAge(e.target.value)}
                              placeholder="Years"
                              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-black/20 border border-pink-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm dark:text-purple-100"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold uppercase tracking-tighter text-gray-500 dark:text-purple-400/60">Pronouns</label>
                          <div className="relative">
                            <select 
                              value={partnerBPronouns}
                              onChange={(e) => setPartnerBPronouns(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white dark:bg-black/20 border border-pink-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm appearance-none text-gray-800 dark:text-purple-100 cursor-pointer"
                            >
                              <PronounOptions />
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 pointer-events-none" size={14} />
                          </div>
                        </div>
                      </div>
                      {partnerBPronouns === 'other' && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                          <input 
                            type="text" 
                            value={partnerBPronounsOther}
                            onChange={(e) => setPartnerBPronounsOther(e.target.value)}
                            placeholder="Enter custom pronouns..."
                            className="w-full px-4 py-2 bg-white dark:bg-black/20 border border-pink-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm dark:text-purple-100"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-6">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 mb-4">
                <h3 className="text-lg font-bold uppercase tracking-widest">Upload Photos</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {currentReadingConfig.requiredImages.map((imgKey) => (
                    <ImageUploadTile 
                      key={imgKey} 
                      id={imgKey} 
                      label={getImageLabel(imgKey)} 
                      imageSrc={uploadedImages[imgKey] || null} 
                      onUpload={handleImageUpload} 
                      onRemove={handleImageRemove} 
                      error={imageErrors[imgKey]}
                    />
                ))}
              </div>

              {/* Optional Deeper Analysis Section */}
              <div className="mt-8 border border-purple-100 dark:border-white/10 rounded-2xl overflow-hidden bg-white/30 dark:bg-white/5 backdrop-blur-sm">
                <button 
                  onClick={() => setIsOptionalExpanded(!isOptionalExpanded)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-purple-50/50 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-purple-500" />
                    <span className="text-lg font-semibold text-gray-800 dark:text-purple-200">
                      Additional photos for deeper analysis (optional)
                    </span>
                  </div>
                  {isOptionalExpanded ? <ChevronUp className="text-purple-400" /> : <ChevronDown className="text-purple-400 group-hover:translate-y-0.5 transition-transform" />}
                </button>
                
                {isOptionalExpanded && (
                  <div className="p-6 pt-0 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 italic">
                      Side views of your hands help trace the depth of your lines for a more nuanced reading.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {currentReadingConfig.requiredImages.map((imgKey) => {
                        const sideKey = `${imgKey}_side`;
                        return (
                          <ImageUploadTile 
                            key={sideKey} 
                            id={sideKey} 
                            label={getImageLabel(sideKey)} 
                            imageSrc={uploadedImages[sideKey] || null} 
                            onUpload={handleImageUpload} 
                            onRemove={handleImageRemove} 
                            error={imageErrors[sideKey]}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <div className="pt-8 flex flex-col items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full max-w-md py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg ${
                  canSubmit ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 active:scale-95' : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                {canSubmit ? 'Reveal My Destiny' : 'Fill Details to Continue'}
              </button>
            </div>
          </div>
        )}

        {appState === AppState.LOADING && (
          <WhimsicalLoader stage={loadingStage} />
        )}

        {appState === AppState.ERROR && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
              <Info size={40} className="text-red-500" />
              <h3 className="text-2xl font-bold">Connection Interrupted</h3>
              <p className="text-gray-600 max-w-md">{errorMessage}</p>
              <button onClick={() => setAppState(AppState.CREATE)} className="px-6 py-3 bg-gray-200 dark:bg-white/10 rounded-lg">Try Again</button>
           </div>
        )}

        {appState === AppState.RESULT && readingResult && (
          <ResultsView result={readingResult} onReset={handleReset} readingType={selectedReadingType} />
        )}
      </main>

      <footer className="site-footer">
        <div className="gb-element-976bf953">
          <div className="gb-element-157df1c6">
            <a href="https://palmreadings.ai/">
              <img 
                loading="lazy" 
                decoding="async" 
                width="700" 
                height="300" 
                className="gb-media-0d2fcba1" 
                alt="Palm Readings AI Logo" 
                title="palm-readings-ai-logo" 
                src="https://palmreadings.ai/wp-content/uploads/2025/12/palm-readings-ai-logo.png" 
                srcSet="https://palmreadings.ai/wp-content/uploads/2025/12/palm-readings-ai-logo.png 700w, https://palmreadings.ai/wp-content/uploads/2025/12/palm-readings-ai-logo-300x129.png 300w" 
                sizes="auto, (max-width: 700px) 100vw, 700px" 
              />
            </a>
            <a className="gb-text gb-text-5d87b161" href="https://app.palmreadings.ai">Get a New Reading</a>
          </div>

          <div className="gb-element-689e68e2">
            <p className="gb-text gb-text-0a42f6ba"><strong>Company</strong></p>
            <p className="gb-text gb-text-c2a84fe9"><a href="https://palmreadings.ai/about/" data-type="page" data-id="39">About Us</a></p>
            <p className="gb-text gb-text-426684f0"><a href="https://palmreadings.ai/contact/" data-type="page" data-id="37">Contact</a></p>
          </div>

          <div className="gb-element-0b42c32e">
            <p><em>Readings provided by PalmReadings.ai are generated using artificial intelligence and are intended for informational and reflective purposes only. Interpretations are not guaranteed to be accurate and should not be considered professional, medical, legal, or financial advice. Individual experiences may vary.</em></p>
          </div>
        </div>

        <div className="gb-element-25077e3f">
          <p className="gb-text gb-text-44633b07">
            <span className="wp-rich-text-font-awesome-icon wp-font-awesome-icon">
              <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="copyright" className="svg-inline--fa fa-copyright " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path fill="currentColor" d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM205.1 306.9c28.1 28.1 73.7 28.1 101.8 0 9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9c-46.9 46.9-122.8 46.9-169.7 0s-46.9-122.8 0-169.7 122.8-46.9 169.7 0c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0c-28.1-28.1-73.7-28.1-101.8 0s-28.1 73.7 0 101.8z"></path>
              </svg>
            </span>
            {currentYear} Palm Readings AI - All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;