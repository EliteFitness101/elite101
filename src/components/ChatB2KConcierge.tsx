import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Bot, ChevronDown, CircleHelp, Compass, CreditCard, Globe2,
  MessageCircle, Send, ShieldCheck, Sparkles, X,
} from "lucide-react";

const prompts = [
  { label: "Explore services", answer: "Explore creator media, production, talent discovery, and agency workflows.", to: "/explore" },
  { label: "Start onboarding", answer: "Choose your goal first, then follow the matching onboarding pathway.", to: "/explore#start" },
  { label: "Open my dashboard", answer: "Sign in to open the dashboard available to your account.", to: "/auth" },
  { label: "Creator & media tools", answer: "Review the creator workspace and media production options.", to: "/monetization" },
  { label: "BIGO host pathway", answer: "Open the BIGO host application and review the next steps.", to: "/questionnaire" },
  { label: "Find talent", answer: "Browse the talent marketplace and available profiles.", to: "/marketplace" },
];

export function ChatB2KConcierge() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const sendMessage = () => {
    const text = message.trim().toLowerCase();
    if (!text) return;
    const route = text.includes("dashboard") || text.includes("account") ? prompts[2]
      : text.includes("bigo") || text.includes("host") ? prompts[4]
      : text.includes("talent") || text.includes("model") || text.includes("brand") ? prompts[5]
      : text.includes("pay") || text.includes("price") || text.includes("plan") || text.includes("media") ? prompts[3]
      : text.includes("onboard") || text.includes("start") || text.includes("help") ? prompts[1]
      : prompts[0];
    setAnswer(route.answer);
    setMessage("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[80] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            role="dialog"
            aria-label="ChatB2K guided concierge"
            className="mb-3 flex max-h-[min(76vh,640px)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-3xl border border-amber-200/20 bg-[#0c0c10]/95 text-white shadow-2xl shadow-black/60 backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between border-b border-white/10 bg-gradient-to-r from-amber-300/10 to-emerald-300/5 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-200/30 bg-amber-200/10 text-amber-200"><Bot className="h-5 w-5" /></div>
                <div><p className="font-semibold tracking-wide">ChatB2K <span className="text-amber-200">Concierge</span></p><p className="mt-0.5 text-xs text-white/55">Your next step, made clear</p></div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close concierge" className="rounded-full p-2 text-white/65 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 overflow-y-auto p-4">
              <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.055] p-3 text-sm leading-6 text-white/85">
                Welcome to Elite Media. What would you like to accomplish today? Pick a path or ask me in your own words.
              </div>
              {answer && <div className="rounded-2xl rounded-tl-sm border border-amber-200/20 bg-amber-200/[0.07] p-3 text-sm leading-6 text-white/85">{answer}<div className="mt-3"><button onClick={() => { const q = answer.toLowerCase(); navigate(q.includes("dashboard") ? "/auth" : q.includes("bigo") ? "/questionnaire" : q.includes("talent") ? "/marketplace" : q.includes("media production") ? "/monetization" : "/explore"); setOpen(false); }} className="inline-flex items-center gap-2 rounded-full bg-amber-200 px-3 py-2 text-xs font-semibold text-black">Continue <ArrowRight className="h-3.5 w-3.5" /></button></div></div>}
              <div className="flex flex-wrap gap-2">
                {prompts.map((item) => <button key={item.label} onClick={() => { setAnswer(item.answer); }} className="rounded-full border border-white/15 bg-white/[0.035] px-3 py-2 text-xs text-white/75 transition hover:border-amber-200/50 hover:bg-amber-200/10 hover:text-white">{item.label}</button>)}
              </div>
              <p className="flex items-start gap-2 text-[11px] leading-5 text-white/45"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Payments, connected platforms, and account-specific actions are confirmed in their own secure flows.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="flex items-center gap-2 border-t border-white/10 p-3">
              <label className="sr-only" htmlFor="chatb2k-question">Ask ChatB2K</label>
              <input id="chatb2k-question" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask what to do next…" className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-200/50" />
              <button type="submit" aria-label="Send question" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-200 text-black transition hover:bg-amber-100"><Send className="h-4 w-4" /></button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close ChatB2K concierge" : "Open ChatB2K concierge"} className="ml-auto flex items-center gap-2 rounded-full border border-amber-200/40 bg-[#111115]/95 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-black/40 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-amber-200/80">
        {open ? <X className="h-4 w-4 text-amber-200" /> : <MessageCircle className="h-5 w-5 text-amber-200" />}
        <span>ChatB2K</span><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" />
      </button>
    </div>
  );
}
