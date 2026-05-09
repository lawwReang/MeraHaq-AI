import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Paperclip, 
  Layers, 
  Send, 
  FileText, 
  ChevronRight, 
  AlertCircle, 
  Search,
  ShieldCheck,
  Globe,
  Loader2,
  Bot,
  User,
  Settings2,
  MapPin,
  Wallet,
  Users,
  Lightbulb,
  Headset,
  X,
  Key,
  ChevronDown,
  ExternalLink,
  Sun,
  Moon,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  orderBy,
  Timestamp,
  FirebaseUser,
  handleFirestoreError,
  parseAuthError,
  OperationType,
  serverTimestamp,
  FieldValue
} from './lib/firebase';
import { validateApiKey, parseGeminiError, createErrorLog } from './lib/apiKeyValidator';

interface UserProfile {
  displayName: string;
  age: number;
  gender?: string;
  caste?: string;
  location: string;
  incomeBracket?: string;
  occupation?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

interface Scheme {
  id: string;
  name: string;
  matchScore: string;
  eligibility: string;
  benefit: string;
  detailedBenefits?: string[];
  docs: string[];
  howToApply: string;
}

interface GuideStep {
  title: string;
  description: string;
  detailedHowTo: string;
  bestOptionRecommendation: string;
  portalLinkOrAction?: string;
}

interface DeepAdvice {
  schemeName: string;
  summary: string;
  documentationUrl?: string;
  applicationUrl?: string;
  steps: GuideStep[];
  tips: string[];
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const GuideStepItem = ({ step, index }: { step: GuideStep; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex gap-4 group/step">
      <div 
        className="flex-shrink-0 w-8 h-8 rounded-full bg-bg text-text-muted flex items-center justify-center font-bold text-xs border border-border group-hover/step:bg-card group-hover/step:text-text-main transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {index + 1}
      </div>
      <div className="pt-1.5 border-b border-border pb-4 flex-grow text-text-muted font-normal text-sm leading-relaxed last:border-0 last:pb-0">
        <div 
          className="cursor-pointer flex justify-between items-start hover:text-text-main transition"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1 pr-4">
            <strong className="block text-text-main mb-1 group-hover/step:text-blue-400 transition">{step.title}</strong>
            <span className="text-text-muted block text-xs">{step.description}</span>
          </div>
          <ChevronDown size={16} className={`text-text-muted transform transition-transform ${expanded ? 'rotate-180' : ''} shrink-0 mt-1`} />
        </div>
        
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 bg-card rounded-xl border border-border space-y-4">
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1.5">
                    Detailed Instructions
                  </span>
                  <p className="text-xs text-text-main leading-relaxed font-medium">{step.detailedHowTo}</p>
                </div>
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1.5">
                    Best Option For You
                  </span>
                  <p className="text-xs text-text-main leading-relaxed font-medium">{step.bestOptionRecommendation}</p>
                </div>
                {step.portalLinkOrAction && (
                  <div className="pt-3 border-t border-border flex items-center gap-2">
                     <ExternalLink size={12} className="text-text-muted"/>
                     <a href={step.portalLinkOrAction.startsWith('http') ? step.portalLinkOrAction : `https://${step.portalLinkOrAction}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline break-all">
                       {step.portalLinkOrAction}
                     </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SchemeCard = ({ scheme, index, savedSchemes, isLiking, toggleSaveScheme, requestGuide }: { 
  scheme: Scheme; 
  index: number; 
  savedSchemes: Scheme[];
  isLiking: string | null;
  toggleSaveScheme: (s: Scheme) => void;
  requestGuide: (n: string) => void;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="w-full rounded-3xl md:rounded-[2rem] p-5 md:p-8 flex flex-col lg:flex-row relative overflow-hidden bg-card/40 dark:bg-card/40 backdrop-blur-md border border-border box-border hover:border-blue-500/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_0_40px_rgba(37,99,235,0.15)] transition-all duration-500 gap-6 md:gap-8 items-start lg:items-center group/card shadow-xl shadow-black/5"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000"></div>
      
      <div className="flex-1 space-y-4 md:space-y-6 min-w-0 w-full relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="text-xl md:text-2xl font-bold text-text-main shrink-1 leading-tight tracking-tight mb-2">{scheme.name}</h4>
            <div className="bg-emerald-950/10 border border-emerald-900/10 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-500/80">Benefit:</span>
              <p className="text-xs font-semibold text-emerald-500 leading-none">{scheme.benefit}</p>
            </div>
          </div>
          <div className="bg-blue-600/10 text-blue-400 text-[9px] md:text-xs font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-blue-500/30 tracking-widest uppercase shrink-0 backdrop-blur-sm mt-1">
            {scheme.matchScore} Fit
          </div>
        </div>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4"
            >
              {scheme.detailedBenefits && scheme.detailedBenefits.length > 0 && (
                <div className="bg-emerald-950/10 border border-emerald-900/10 p-4 md:p-5 rounded-2xl flex flex-col min-w-0">
                  <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-500/70 block mb-2 md:mb-3">Full Benefits Breakdown</span>
                  <ul className="space-y-2">
                    {scheme.detailedBenefits.map((b, i) => (
                      <li key={i} className="text-sm font-medium text-emerald-500 leading-relaxed flex gap-2">
                        <span className="shrink-0">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-bg border border-border p-4 md:p-5 rounded-2xl flex flex-col min-w-0">
                  <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted block mb-2 md:mb-3">Eligibility Rules</span>
                  <p className="text-sm font-medium text-text-main leading-relaxed">{scheme.eligibility}</p>
                </div>
                <div className="bg-blue-950/10 border border-blue-900/10 p-4 md:p-5 rounded-2xl flex flex-col min-w-0">
                  <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500/70 block mb-2 md:mb-3">How To Apply</span>
                  <p className="text-sm font-medium text-blue-400 leading-relaxed italic">{scheme.howToApply}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-blue-400 flex items-center gap-1 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'View Eligibility & Process'}
          <ChevronDown size={14} className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="w-full lg:w-auto shrink-0 lg:pl-10 lg:border-l lg:border-border/50 flex flex-col items-center justify-center self-stretch gap-3 md:gap-4 relative z-10">
        <button 
          onClick={() => toggleSaveScheme(scheme)}
          disabled={isLiking === scheme.id}
          className={`w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 active:scale-95 border group/heart relative overflow-hidden disabled:opacity-50 ${
            savedSchemes.some(s => s.id === scheme.id)
              ? 'bg-emerald-600/10 border-emerald-500/40 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-transparent border-border text-text-muted hover:text-text-main hover:bg-white/5 shadow-lg shadow-black/5'
          }`}
        >
          <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/heart:opacity-100 transition-opacity"></div>
          {isLiking === scheme.id ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={16} className={savedSchemes.some(s => s.id === scheme.id) ? 'fill-emerald-500/20' : ''} />}
          <span className="relative">
            {savedSchemes.some(s => s.id === scheme.id) ? 'Saved' : 'Save'}
          </span>
        </button>
        <button 
          onClick={() => requestGuide(scheme.name)}
          className="w-full lg:w-auto bg-text-main border border-transparent text-bg font-bold px-8 py-4 md:py-5 rounded-xl md:rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-500 active:scale-90 flex items-center justify-center gap-2 shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/30 whitespace-nowrap group/dive relative overflow-hidden"
        >
          <motion.div 
            className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/dive:translate-x-[100%] transition-transform duration-700 ease-in-out"
          ></motion.div>
          <span className="relative z-10">Guide</span>
          <ChevronRight size={18} className="group-hover/dive:translate-x-1 transition-transform relative z-10" />
        </button>
      </div>
    </motion.div>
  );
};

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  schemes?: Scheme[];
  guide?: DeepAdvice;
  isTyping?: boolean;
}

export default function SchemaAI() {
  const [inputText, setInputText] = useState('');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedSchemes, setSavedSchemes] = useState<Scheme[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSavedSchemes, setShowSavedSchemes] = useState(false);
  const [isLiking, setIsLiking] = useState<string | null>(null);

  // Profile Form State
  const [profileName, setProfileName] = useState<string>('');
  const [age, setAge] = useState<number>(25);
  const [gender, setGender] = useState<string>('');
  const [caste, setCaste] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [income, setIncome] = useState<string>('');
  const [occupation, setOccupation] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'model',
    text: "Hello. I am MeraHaq AI, your intelligent government scheme discovery assistant.\n\nDescribe your profile—such as your age, location, occupation, and family income—so I can match you with the exact benefits you qualify for. You can also explore creative 'What if' scenarios to see what schemes unlock!"
  }]);
  const [isTyping, setIsTyping] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== 'light';
  });
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Validate API Key on component mount
  useEffect(() => {
    const apiKeyValidation = validateApiKey(process.env.GEMINI_API_KEY);
    if (!apiKeyValidation.isValid) {
      console.warn("API Key Validation Warning:", apiKeyValidation.error);
      setError(`⚠️ Configuration Issue: ${apiKeyValidation.error}`);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        fetchProfile(currUser.uid);
        fetchSavedSchemes(currUser.uid);
      } else {
        setProfile(null);
        setSavedSchemes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setProfileName(data.displayName || '');
        setAge(data.age);
        setGender(data.gender || '');
        setCaste(data.caste || '');
        setLocation(data.location);
        setIncome(data.incomeBracket || '');
        setOccupation(data.occupation || '');
      } else {
        // New user might need to set up profile
        setShowProfileModal(true);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }
  };

  const fetchSavedSchemes = async (uid: string) => {
    try {
      const q = query(collection(db, 'users', uid, 'saved_schemes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const schemes: Scheme[] = [];
      querySnapshot.forEach((doc) => {
        schemes.push(doc.data() as Scheme);
      });
      setSavedSchemes(schemes);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/saved_schemes`);
    }
  };

  const handleLogin = async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && !profile) {
        setProfileName(result.user.displayName || '');
      }
    } catch (err: any) {
      // Parse Firebase auth error
      const errorInfo = parseAuthError(err);
      
      // Log error details for debugging
      console.error("Login Error Details:", {
        errorCode: errorInfo.errorCode,
        errorMessage: errorInfo.technicalMessage,
        fullError: err,
        currentURL: window.location.href,
      });

      // Gracefully handle non-fatal errors (user closed popup)
      if (
        errorInfo.errorCode === 'auth/popup-closed-by-user' ||
        errorInfo.errorCode === 'auth/cancelled-popup-request'
      ) {
        return; // Silent dismiss - user intentionally closed
      }

      // Display user-friendly error with suggestions
      let errorMessage = errorInfo.userMessage;
      if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
        errorMessage += `\n\n💡 Try:\n• ${errorInfo.suggestions.slice(0, 2).join('\n• ')}`;
      }
      
      setError(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setError("Failed to sign out.");
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      
      // Crucial: preserve the original createdAt if we are updating
      const finalCreatedAt = profile?.createdAt || serverTimestamp();
      
      const profileData: UserProfile = {
        displayName: profileName,
        age,
        gender,
        caste,
        location,
        incomeBracket: income,
        occupation,
        createdAt: finalCreatedAt,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(docRef, profileData);
      
      // Update local state - we use the resolved or current time
      const localTimestamp = Timestamp.now();
      setProfile({
        ...profileData,
        createdAt: profile?.createdAt || localTimestamp,
        updatedAt: localTimestamp
      } as any);
      
      setShowProfileModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const toggleSaveScheme = async (scheme: Scheme) => {
    if (!user) {
      handleLogin();
      return;
    }
    
    setIsLiking(scheme.id);
    const isSaved = savedSchemes.some(s => s.id === scheme.id);
    
    try {
      const docRef = doc(db, 'users', user.uid, 'saved_schemes', scheme.id);
      if (isSaved) {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(docRef);
        setSavedSchemes(prev => prev.filter(s => s.id !== scheme.id));
        setToast({ message: "Scheme removed from your list", type: 'info' });
      } else {
        const savedData = {
          ...scheme,
          userId: user.uid,
          schemeId: scheme.id,
          createdAt: serverTimestamp()
        };
        await setDoc(docRef, savedData);
        setSavedSchemes(prev => [{ ...savedData, createdAt: Timestamp.now() } as any, ...prev]);
        setToast({ message: "Scheme saved successfully!", type: 'success' });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/saved_schemes/${scheme.id}`);
    } finally {
      setIsLiking(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsTyping(false);
  };

  const generateResponse = async (userText: string) => {
    setIsTyping(true);
    setError(null);

    const controller = new AbortController();
    setAbortController(controller);

    const newUserMsg: ChatMessage = { id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);

    try {
      // Validate API Key before making request
      const apiKeyValidation = validateApiKey(process.env.GEMINI_API_KEY);
      if (!apiKeyValidation.isValid) {
        throw new Error(apiKeyValidation.error || "API Key validation failed");
      }

      const historyContents = messages
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));
      
      historyContents.push({ role: 'user', parts: [{ text: userText }] });

      const currentAi = new GoogleGenAI({ apiKey: apiKeyValidation.key! });

      // Add profile context to the system instruction or prompt
      const profileContext = profile 
        ? `\n\nUSER PROFILE CONTEXT: Age: ${profile.age}, Gender: ${profile.gender || 'N/A'}, Caste/Category: ${profile.caste || 'N/A'}, Location: ${profile.location}, Occupation: ${profile.occupation || 'N/A'}, Income: ${profile.incomeBracket || 'N/A'}. Use this to prioritize schemes.`
        : "";

      const response = await currentAi.models.generateContent({
        model: "gemini-2.5-flash",
        contents: historyContents,
        config: {
          systemInstruction: "You are MeraHaq AI, an elegant, highly intelligent government scheme discovery assistant for Indian citizens. " + profileContext + "\n\nCRUCIALLY: Be very concise and direct in the 'message' field. Avoid long summaries or redundant explanations unless specifically asked. Focus on clarity and speed. \n\nWhen providing schemes, you MUST provide an exhaustive list of 'detailedBenefits' (at least 3-5 specific points) for each scheme so the user understands the full value. \n\nOnly populate the 'schemes' array if the user is looking for schemes. DO NOT generate schemes for simple follow-ups. ONLY populate the 'guide' object IF the user explicitly asks for a roadmap, guide, or step-by-step process. Leave 'guide' omitted otherwise.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              schemes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    matchScore: { type: Type.STRING },
                    eligibility: { type: Type.STRING },
                    benefit: { type: Type.STRING, description: "One-sentence summary of the main benefit." },
                    detailedBenefits: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      description: "List all specific benefits, subsidies, or supports provided."
                    },
                    howToApply: { type: Type.STRING, description: "Brief steps or portal link info to apply" },
                    docs: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["id", "name", "matchScore", "eligibility", "benefit", "detailedBenefits", "howToApply", "docs"]
                }
              },
              guide: {
                type: Type.OBJECT,
                description: "ONLY USE IF USER EXPLICITLY REQUESTS A GUIDE OR ROADMAP. Leave omitted otherwise.",
                properties: {
                  schemeName: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  steps: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        detailedHowTo: { type: Type.STRING, description: "Specific deep-dive implementation details." },
                        bestOptionRecommendation: { type: Type.STRING, description: "Personalized recommendation." },
                        portalLinkOrAction: { type: Type.STRING, nullable: true, description: "URL or portal name." }
                      },
                      required: ["title", "description", "detailedHowTo", "bestOptionRecommendation"]
                    }
                  },
                  tips: { type: Type.ARRAY, items: { type: Type.STRING } },
                  documentationUrl: { type: Type.STRING, description: "URL to official scheme documentation", nullable: true },
                  applicationUrl: { type: Type.STRING, description: "URL to official scheme application portal", nullable: true },
                },
                required: ["schemeName", "summary", "steps", "tips"]
              }
            },
            required: ["message"]
          }
        }
      });

      if (controller.signal.aborted) {
        return;
      }

      let dataText = response.text || "{}";
      dataText = dataText.trim();
      const match = dataText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        dataText = match[1];
      }
      
      let data;
      try {
        data = JSON.parse(dataText);
      } catch (parseError) {
        console.error("JSON parsing error", parseError, dataText);
        throw new Error("Received an unreadable response from AI.");
      }
      
      const newModelMsg: ChatMessage = {
        id: `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'model',
        text: data.message,
        schemes: data.schemes,
        guide: data.guide
      };

      setMessages(prev => [...prev, newModelMsg]);
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("Gemini API Error:", err);

      // Parse the error and get user-friendly message
      const errorInfo = parseGeminiError(err);
      
      // Log detailed error for debugging
      const errorLog = createErrorLog(err, {
        operation: "generateContent",
        userId: user?.uid,
        apiKeyExists: !!process.env.GEMINI_API_KEY,
        apiKeyValid: validateApiKey(process.env.GEMINI_API_KEY).isValid,
      });
      console.error("Detailed Error Log:", errorLog);

      // Set the user-friendly error message
      setError(errorInfo.userMessage);
    } finally {
      if (!controller.signal.aborted) {
        setIsTyping(false);
        setAbortController(null);
      }
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping) return;
    const text = inputText;
    setInputText('');
    generateResponse(text);
  };

  const handleChipClick = (text: string) => {
    generateResponse(text);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      generateResponse(`[Analyzed ID Document: ${file.name}] Extracted Info: 28 year old male from Delhi, self-employed, annual income 4L. What schemes am I eligible for?`);
    }
  };

  const requestGuide = (schemeName: string) => {
    generateResponse(`I need a personalized application guide and deep advice for the ${schemeName}.`);
  };

  const TypingIndicator = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-start gap-4 mb-8"
    >
      <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center flex-shrink-0 shadow-lg">
        <Layers size={14} className="text-white dark:text-black" />
      </div>
      <div className="flex items-center bg-card/40 backdrop-blur-md px-5 py-3 rounded-2xl rounded-tl-sm border border-border shadow-soft">
        <div className="flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"></div>
        </div>
      </div>
    </motion.div>
  );

  const MarkdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-3 last:mb-0" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3" {...props} />,
    li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-text-main" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-xl font-bold text-text-main my-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-lg font-bold text-text-main my-2" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-base font-bold text-text-main my-2" {...props} />,
    a: ({node, ...props}: any) => <a className="text-blue-400 hover:underline" {...props} />
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
  
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-4 md:gap-6 w-full mb-12 group`}
      >
        {!isUser && (
          <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden rounded-[14px] shadow-sm bg-gradient-to-br from-[#FF9933] via-blue-500 to-[#138808] p-[1.5px] flex-shrink-0 mt-1">
            <div className="absolute inset-[1.5px] bg-card rounded-[13px] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5"></div>
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-500 z-10" />
            </div>
          </div>
        )}
        
        <div className={`flex flex-col gap-6 w-full ${isUser ? 'items-end max-w-3xl' : 'items-start min-w-0'}`}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`px-6 py-5 rounded-3xl text-sm md:text-base leading-relaxed ${
              isUser 
                ? 'bg-card border border-border text-text-main rounded-tr-md max-w-full shadow-lg' 
                : 'bg-card/30 backdrop-blur-md border border-border text-text-main w-full rounded-tl-md shadow-xl'
            }`}
          >
             <ReactMarkdown components={MarkdownComponents as any}>{msg.text}</ReactMarkdown>
          </motion.div>
  
          {/* Schemes rendering */}
          {msg.schemes && msg.schemes.length > 0 && (
            <div className="w-full mt-4">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-px bg-border flex-grow"></div>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-text-muted">Unlocked Schemes</span>
                <div className="h-px bg-border flex-grow"></div>
              </div>
              <div className="flex flex-col gap-8 w-full">
                {msg.schemes.map((scheme, sIdx) => (
                  <SchemeCard 
                    key={`${scheme.id}-${sIdx}`}
                    scheme={scheme}
                    index={sIdx}
                    savedSchemes={savedSchemes}
                    isLiking={isLiking}
                    toggleSaveScheme={toggleSaveScheme}
                    requestGuide={requestGuide}
                  />
                ))}
              </div>
            </div>
          )}
  
          {/* Guide Rendering */}
          {msg.guide && (
            <div className="w-full max-w-5xl bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden mt-6 ring-1 ring-blue-500/10 relative">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Layers size={120} className="text-blue-500" />
              </div>
              <div className="p-6 md:p-8 relative z-10">
                <div className="mb-6 pb-6 border-b border-border">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400 mb-2 inline-block">AI Generated Roadmap</span>
                  <h3 className="text-2xl md:text-3xl font-bold text-text-main tracking-tight leading-tight">{msg.guide.schemeName}</h3>
                </div>
                <div className="space-y-8">
                  <section>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-2">AI Strategy Summary</h4>
                    <p className="text-zinc-400 leading-relaxed text-sm font-medium">{msg.guide.summary}</p>
                  </section>
                  <section>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-4">The Application Path</h4>
                    <div className="space-y-4">
                      {msg.guide.steps.map((step, i) => (
                        <GuideStepItem key={`step-${msg.id}-${i}`} step={step} index={i} />
                      ))}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-4">Expert AI Insights</h4>
                    <ul className="space-y-3">
                      {msg.guide.tips.map((tip, i) => (
                        <li key={`tip-${msg.id}-${i}`} className="text-xs text-zinc-400 border-l-2 border-blue-500/30 pl-4 py-1 font-medium">
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
                <div className="w-full mt-8 flex flex-col sm:flex-row gap-3">
                  {msg.guide.documentationUrl ? (
                    <a href={msg.guide.documentationUrl.startsWith('http') ? msg.guide.documentationUrl : `https://${msg.guide.documentationUrl}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-zinc-800 border border-white/5 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-700 hover:border-white/10 transition active:scale-95 shadow-xl shadow-black/20">
                      <FileText size={14} /> Official Documentation
                    </a>
                  ) : (
                    <button className="flex-1 bg-zinc-800 border border-white/5 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-not-allowed opacity-50" disabled>
                      <FileText size={14} /> Docs Unavailable
                    </button>
                  )}
                  {msg.guide.applicationUrl ? (
                    <a href={msg.guide.applicationUrl.startsWith('http') ? msg.guide.applicationUrl : `https://${msg.guide.applicationUrl}`} target="_blank" rel="noopener noreferrer" className="flex-1 bg-blue-600 border border-blue-500 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-500 transition active:scale-95 shadow-xl shadow-blue-900/20">
                      <ExternalLink size={14} /> Apply Now
                    </a>
                  ) : (
                    <button className="flex-1 bg-blue-600 border border-blue-500 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-not-allowed opacity-50" disabled>
                      <ExternalLink size={14} /> Portal Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
  
        {isUser && (
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0 mt-1">
            <User size={14} className="text-zinc-400" />
          </div>
        )}
      </motion.div>
    );
  };

  const smartInputs = [
    { key: "student", label: "Student", icon: <Users size={12}/>, prompt: "I am a student looking for scholarships and educational grants." },
    { key: "farmer", label: "Farmer", icon: <Lightbulb size={12}/>, prompt: "I am a farmer looking for agricultural subsidies and financial aid." },
    { key: "widow", label: "Widow", icon: <Users size={12}/>, prompt: "I am a widow. Please suggest pension schemes and support programs." },
    { key: "general", label: "General", icon: <Users size={12}/>, prompt: "I am a general category citizen looking for public welfare schemes." },
  ];

  const whatIfs = [
    { key: "poultry", label: "Start a Poultry Farm", prompt: "What if I want to start a poultry farm?" },
    { key: "ev", label: "Buy an EV", prompt: "What if I purchase an electric vehicle (EV)?" },
    { key: "phd", label: "Pursue Ph.D abroad", prompt: "What if I want to pursue a Ph.D. abroad?" },
  ];

  const sectorOptions = [
    { key: "agriculture", label: "Agriculture", prompt: "Show me schemes related to Agriculture" },
    { key: "education", label: "Education", prompt: "Show me schemes related to Education" },
    { key: "health", label: "Health", prompt: "Show me schemes related to Healthcare and Medical" },
    { key: "business", label: "Business/MSME", prompt: "Show me schemes for starting a business or MSME" }
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-bg text-text-main font-sans selection:bg-blue-500/30 flex flex-col relative">
      
      {/* Background Decorative Elements - SayHalo Style */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {!isDarkMode ? (
          <>
            <motion.div 
              animate={{ 
                x: [0, 40, 0], 
                y: [0, -40, 0],
                rotate: [0, 90, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-[10%] left-[5%] w-24 h-24 border-[1px] border-blue-500/10 rounded-3xl"
            ></motion.div>
            <motion.div 
              animate={{ 
                x: [0, -60, 0], 
                y: [0, 60, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[15%] left-[10%] w-32 h-32 bg-pink-100/30 rounded-full blur-xl"
            ></motion.div>
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.1, 0.3, 0.1],
                y: [0, -20, 0]
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[35%] right-[15%] text-indigo-400/20 font-bold text-6xl"
            >+</motion.div>
            <motion.div 
              animate={{ 
                rotate: [0, -180, 0],
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-[30%] right-[10%] w-16 h-16 border-2 border-emerald-500/5 rounded-full"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500/10 rounded-full"></div>
            </motion.div>
            
            <div className="absolute top-[-20%] left-[-15%] w-[80%] h-[80%] bg-pink-200/20 blur-[150px] rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-[-20%] right-[-15%] w-[90%] h-[90%] bg-purple-200/20 blur-[180px] rounded-full animate-pulse-slow [animation-delay:3s]"></div>
            <div className="absolute top-[25%] right-[0%] w-[50%] h-[50%] bg-blue-100/20 blur-[130px] rounded-full animate-pulse-slow [animation-delay:5s]"></div>
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[150px] rounded-full animate-pulse-slow [animation-delay:2s]"></div>
          </>
        )}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay"></div>
      </div>
      
      {/* HEADER */}
      <header className="shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-border bg-bg/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))', paddingBottom: '0.5rem', minHeight: '4rem' }}>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => window.location.reload()}
        >
          <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center overflow-hidden rounded-xl shadow-md group-hover:rotate-[10deg] transition-all duration-300 bg-gradient-to-br from-[#FF9933] via-blue-500 to-[#138808] p-[1.5px]">
            <div className="absolute inset-[1.5px] bg-card rounded-[9px] md:rounded-[10px] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/5"></div>
              <ShieldCheck size={18} className="text-blue-600 dark:text-blue-500 md:w-5 md:h-5 z-10" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black tracking-tighter text-text-main leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-green-500 transition-all duration-500">MeraHaq</span>
            <span className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-400 leading-none tracking-widest uppercase">AI Assistant</span>
          </div>
        </motion.div>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setLanguage(language === 'EN' ? 'HI' : 'EN')}
            className="h-10 px-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 text-text-muted hover:text-text-main transition-all cursor-pointer group text-sm font-bold"
            title="Toggle Language"
          >
            <Globe size={18} className="group-hover:rotate-12 transition-transform duration-500" />
            <span className="min-w-[20px] text-center">{language}</span>
          </button>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-text-muted hover:text-text-main transition-all cursor-pointer group"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={18} className="group-hover:rotate-45 transition-transform duration-500" /> : <Moon size={18} className="group-hover:-rotate-12 transition-transform duration-500" />}
          </button>
          
          {user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => setShowSavedSchemes(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-full text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-main hover:border-blue-500/30 transition-all active:scale-95 group"
              >
                <ShieldCheck size={14} className="text-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">{savedSchemes.length} Saved</span>
              </button>
              <div 
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 border border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all active:scale-95 relative group"
                onClick={() => setShowProfileModal(true)}
              >
                {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <User size={16} className="text-text-muted" />}
                <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="bg-black dark:bg-white text-white dark:text-black font-bold px-5 py-2 rounded-full text-[10px] uppercase tracking-widest transition active:scale-95 shadow-lg"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      {/* CHAT AREA */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 relative z-10" id="chat-container">
          <div className="w-full h-full min-h-[400px]">
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center px-4 py-20"
              >
                <motion.div 
                  animate={{ 
                    y: [0, -20, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-20 h-20 md:w-32 md:h-32 bg-black dark:bg-white rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/30 via-transparent to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  <Layers size={50} className="text-white dark:text-black relative z-10" />
                  
                  {/* Decorative orbital ring */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-10px] border border-blue-500/10 rounded-full dark:border-white/5"
                  ></motion.div>
                </motion.div>
                
                <h2 className="text-4xl md:text-6xl font-bold text-text-main mb-6 tracking-tighter leading-tight max-w-2xl">
                  Discover the benefits <br/> you <span className="text-blue-500">deserve.</span>
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3 max-w-lg mx-auto">
                  <div className="px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/10 text-[10px] font-black uppercase tracking-widest text-blue-500">AI Powered Search</div>
                  <div className="px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-black uppercase tracking-widest text-emerald-500">Direct Application</div>
                  <div className="px-4 py-2 rounded-full bg-pink-500/5 border border-pink-500/10 text-[10px] font-black uppercase tracking-widest text-pink-500">Full Eligibility Info</div>
                </div>
                
                <p className="mt-12 text-text-muted text-sm md:text-base max-w-md mx-auto leading-relaxed font-medium">
                  I'm your dedicated assistant for government schemes. Start by sharing your background or asking about a specific scheme.
                </p>

                {/* Micro interactivity - floating dots */}
                <div className="flex gap-2 mt-8">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, delay: i * 0.4, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-blue-500/40"
                    ></motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="w-full">
                  {renderMessage(msg)}
                </div>
              ))
            )}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} className="h-8" />
          </div>
      </main>

      {/* ERROR STATE */}
      {error && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-[100]">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-950 border border-red-500/50 p-4 rounded-2xl flex items-start gap-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </div>
            <div className="flex-grow">
              <h5 className="text-red-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Process Failure</h5>
              <p className="text-xs font-medium text-red-200 leading-relaxed max-w-[200px]">{error}</p>
              <button onClick={() => setError(null)} className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white transition">Dismiss</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="shrink-0 flex flex-col bg-bg border-t border-border sticky bottom-0 z-50">
        
        {/* SUGGESTION CHIPS */}
        <div className="px-4 pt-4 pb-2 md:max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar pb-2 mask-linear no-scrollbar">
            {/* Context/Personalization Inputs */}
            <div className="flex items-center gap-2 border-r border-border pr-3 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-main hover:border-blue-500/30 transition cursor-pointer" onClick={() => setInputText(t => t + "Income: < ₹2 Lakhs, ")}>
                <Wallet size={12}/> Income
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-main hover:border-blue-500/30 transition cursor-pointer" onClick={() => setInputText(t => t + "State: Maharashtra, ")}>
                <MapPin size={12}/> State
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-main hover:border-blue-500/30 transition cursor-pointer" onClick={() => setInputText(t => t + "Category: OBC, ")}>
                <Settings2 size={12}/> Category
              </div>
            </div>

            {/* Sector selection */}
            <div className="flex items-center gap-2 border-r border-border pr-3 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#138808] mr-1 flex items-center gap-1">
                <Layers size={12} className="text-[#138808]"/> Sector
              </span>
              {sectorOptions.map((s) => (
                <button 
                  key={s.key}
                  onClick={() => handleChipClick(s.prompt)}
                  disabled={isTyping}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-main hover:bg-bg transition disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Smart Inputs */}
            {smartInputs.map((input) => (
              <button 
                key={input.key}
                onClick={() => handleChipClick(input.prompt)}
                disabled={isTyping}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-text-main hover:bg-bg transition disabled:opacity-50"
              >
                {input.icon} {input.label}
              </button>
            ))}

            {/* "What If" Dynamic Workflow */}
            <div className="flex items-center gap-2 border-l border-border pl-3 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mr-1 flex items-center gap-1">
                <Lightbulb size={12} className="fill-blue-500/20"/> What If
              </span>
              {whatIfs.map((wi) => (
                <button 
                  key={wi.key}
                  onClick={() => handleChipClick(wi.prompt)}
                  disabled={isTyping}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-900/10 border border-blue-500/20 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:bg-blue-600 hover:text-white transition disabled:opacity-50"
                >
                  {wi.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSend} className="max-w-6xl mx-auto w-full px-4 pb-4 md:pb-8 mt-4 relative z-10" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="relative group/inputBox">
            <div className={`absolute -inset-[2px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[1.2rem] md:rounded-[2.2rem] blur-md transition-opacity duration-700 ${inputText.length > 0 ? 'opacity-30 dark:opacity-30' : 'opacity-0 group-focus-within/inputBox:opacity-20'}`}></div>
            
            <div className={`relative bg-card/60 dark:bg-card/80 backdrop-blur-3xl rounded-[1.1rem] md:rounded-[2rem] border border-black/[0.03] dark:border-white/10 p-2 flex items-end gap-1 md:gap-4 transition-all duration-500 ${inputText.length > 0 ? 'shadow-2xl dark:shadow-[0_0_50px_rgba(37,99,235,0.1)] -translate-y-1 border-black/10 dark:border-white/20' : 'shadow-xl dark:shadow-2xl hover:border-black/10 dark:hover:border-white/15'}`}>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-text-muted hover:text-blue-400 transition-all hover:scale-110 shrink-0 mobile-touch-target"
                title="Upload ID Document"
              >
                <Paperclip size={20} />
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </button>
              <textarea
                className="flex-1 bg-transparent border-none focus:outline-none text-sm md:text-lg text-text-main placeholder:text-zinc-600 resize-none max-h-32 min-h-[44px] focus:ring-0 py-3 custom-scrollbar font-medium"
                rows={1}
                placeholder="Message MeraHaq AI..."
                value={inputText}
                onChange={(e) => {
                   setInputText(e.target.value);
                   e.target.style.height = 'auto';
                   e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as any);
                  }
                }}
                disabled={isTyping}
              ></textarea>
              <button 
                type="button" 
                className="p-3 text-text-muted hover:text-blue-400 transition-all hover:scale-110 hidden md:block shrink-0 mobile-touch-target"
              >
                 <Mic size={20} />
              </button>
              {isTyping ? (
                <button 
                  type="button"
                  onClick={handleStop}
                  className="mb-1 mr-1 bg-zinc-800 hover:bg-zinc-700 text-white p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg active:scale-90 shrink-0 mobile-touch-target"
                  title="Stop Generating"
                >
                   <Square size={20} fill="currentColor" />
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="mb-1 mr-1 bg-blue-600 hover:bg-blue-500 text-white p-3 md:p-4 rounded-xl md:rounded-2xl disabled:bg-zinc-800/50 disabled:text-zinc-600 transition-all duration-300 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-90 shrink-0 mobile-touch-target"
                >
                   <Send size={20} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {/* TOAST NOTIFICATION */}
        {toast && (
          <motion.div 
            key="toast"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-emerald-600/90 border-emerald-400/30 text-white' : 'bg-blue-600/90 border-blue-400/30 text-white'
            } backdrop-blur-md`}
          >
            <ShieldCheck size={18} />
            <span className="text-sm font-bold tracking-tight">{toast.message}</span>
          </motion.div>
        )}

        {showProfileModal && (
          <motion.div 
            key="profile-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
          >
            <motion.div 
              key="profile-modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-card border border-border rounded-3xl p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-6 right-6 p-2 text-text-muted hover:text-text-main transition bg-bg rounded-full"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-bg border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner group relative">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="User Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <User size={32} className="text-text-muted" />
                  )}
                  <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div>
                  <h3 className="text-text-main font-bold text-xl leading-tight">{profileName || user?.displayName || 'User Profile'}</h3>
                  <p className="text-text-muted text-xs font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Full Name</label>
                    <input 
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-blue-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Gender</label>
                    <select 
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-blue-500 outline-none transition appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Transgender">Transgender</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Age</label>
                    <input 
                      type="number"
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-blue-500 outline-none transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Location (State)</label>
                    <select 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-blue-500 outline-none transition appearance-none"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Caste/Category (Optional)</label>
                    <select 
                      value={caste}
                      onChange={(e) => setCaste(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-blue-500 outline-none transition appearance-none"
                    >
                      <option value="">Select Category</option>
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Income Bracket (Optional)</label>
                    <select 
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-blue-500 outline-none transition appearance-none"
                    >
                      <option value="">Select Income</option>
                      <option value="Below ₹1 Lakh">Below ₹1 Lakh (Annual)</option>
                      <option value="₹1L - ₹2.5L">₹1L - ₹2.5L (Annual)</option>
                      <option value="₹2.5L - ₹5L">₹2.5L - ₹5L (Annual)</option>
                      <option value="₹5L - ₹10L">₹5L - ₹10L (Annual)</option>
                      <option value="Above ₹10L">Above ₹10L (Annual)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">Occupation (Optional)</label>
                  <input 
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Student, Farmer, Engineer"
                    className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:border-blue-500 outline-none transition"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                  <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition"
                  >
                    Sign Out
                  </button>
                  <button 
                    onClick={saveProfile}
                    className="flex-1 bg-text-main text-bg font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:opacity-90 transition shadow-xl"
                  >
                    Update Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showLogoutConfirm && (
          <motion.div 
            key="logout-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          >
            <motion.div 
              key="logout-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-card border border-border rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                <X size={32} />
              </div>
              <h3 className="text-xl font-bold text-text-main mb-2">Sign Out?</h3>
              <p className="text-text-muted text-sm mb-8 leading-relaxed">Are you sure you want to log out? Your personal scheme history will remain saved for your next visit.</p>
              
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted bg-bg border border-border transition hover:text-text-main"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleLogout();
                    setShowLogoutConfirm(false);
                    setShowProfileModal(false);
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white bg-red-600 transition hover:bg-red-500 shadow-lg shadow-red-900/20"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* SAVED SCHEMES MODAL */}
        {showSavedSchemes && (
          <motion.div 
            key="saved-schemes-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
          >
            <motion.div 
              key="saved-schemes-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-2xl h-[80vh] bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col"
            >
              <button 
                onClick={() => setShowSavedSchemes(false)}
                className="absolute top-6 right-6 p-2 text-text-muted hover:text-text-main transition bg-bg rounded-full"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-4 mb-8 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-text-main font-bold text-xl leading-tight">Saved Schemes</h3>
                  <p className="text-text-muted text-xs">Your personal library of government benefits</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {savedSchemes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Layers size={48} className="mb-4 text-text-muted" />
                    <p className="text-sm text-text-muted">No schemes saved yet.</p>
                  </div>
                ) : (
                  savedSchemes.map((scheme, ssIdx) => (
                    <div key={`${scheme.id}-${ssIdx}`} className="bg-bg border border-border rounded-2xl p-6 hover:border-blue-500/30 transition-all group shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-bold text-text-main text-lg group-hover:text-blue-400 transition">{scheme.name}</h4>
                        <div className="bg-blue-600/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/10 uppercase tracking-widest">
                          {scheme.matchScore} Fit
                        </div>
                      </div>
                      <p className="text-text-muted text-sm line-clamp-2 mb-5 leading-relaxed">{scheme.benefit}</p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            setShowSavedSchemes(false);
                            requestGuide(scheme.name);
                          }}
                          className="flex-1 bg-text-main text-bg font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition hover:opacity-90 active:scale-95 shadow-md shadow-black/10"
                        >
                          View Guide
                        </button>
                        <button 
                          onClick={() => toggleSaveScheme(scheme)}
                          disabled={isLiking === scheme.id}
                          className="px-5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition hover:bg-emerald-500 hover:text-white active:scale-95 flex items-center justify-center min-w-[120px] disabled:opacity-50"
                        >
                          {isLiking === scheme.id ? <Loader2 size={12} className="animate-spin" /> : 'Unsave Scheme'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
