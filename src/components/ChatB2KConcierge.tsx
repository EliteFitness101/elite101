import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, Globe2, MessageCircle, Mic, Send, ShieldCheck, Sparkles, Volume2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChatMessage = { role: "user" | "assistant"; content: string };
const prompts = [
  { label: "Explore services", text: "Help me explore Elite Media services and choose the right starting point.", to: "/explore" },
  { label: "Start onboarding", text: "Guide me through onboarding.", to: "/explore#start" },
  { label: "My dashboard", text: "How do I open my account dashboard?", to: "/auth" },
  { label: "Creator & media", text: "Explain creator and media tools available to me.", to: "/monetization" },
  { label: "BIGO host pathway", text: "Guide me through the BIGO host pathway.", to: "/questionnaire" },
  { label: "Find talent", text: "Help me find talent.", to: "/marketplace" },
];

export function ChatB2KConcierge() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [persona, setPersona] = useState<"coach-b2k" | "mavia">("coach-b2k");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Welcome. I’m ChatB2K Omni. Tell me your goal and I’ll help you choose a clear next step. I’ll be compassionate with your circumstances and firm about what moves you forward." },
  ]);
  const [answerTo, setAnswerTo] = useState("/explore");
  const navigate = useNavigate();

  const sendMessage = async (override?: string) => {
    const text = (override ?? message).trim();
    if (!text || busy) return;
    const history = messages.slice(-8);
    setMessages((old) => [...old, { role: "user", content: text }]);
    setMessage("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("chatb2k-live-assistant", {
        body: { message: text, persona: persona === "mavia" ? "mavia" : "coach-b2k", history },
      });
      if (error) throw error;
      if (!data?.ok || typeof data.reply !== "string") throw new Error(data?.error || "Live assistant did not return a reply.");
      setMessages((old) => [...old, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Connection unavailable";
      setMessages((old) => [...old, { role: "assistant", content: "I couldn’t reach the live intelligence service just now. Your message has not been actioned. Please try again shortly. (" + detail + ")" }]);
    } finally {
      setBusy(false);
    }
  };

  const speakLatest = () => {
    const latest = [...messages].reverse().find((item) => item.role === "assistant");
    if (!latest || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latest.content);
    utterance.lang = navigator.language || "en";
    utterance.rate = persona === "mavia" ? 0.98 : 0.94;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[80] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.section initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} role="dialog" aria-label="ChatB2K Omni live assistant" className="mb-3 flex max-h-[min(78vh,700px)] w-[min(94vw,410px)] flex-col overflow-hidden rounded-3xl border border-amber-200/25 bg-[#08090d]/95 text-white shadow-2xl shadow-black/70 backdrop-blur-2xl">
            <div className="border-b border-white/10 bg-gradient-to-br from-amber-300/15 via-transparent to-emerald-300/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-100/20 to-amber-500/5 text-amber-100 shadow-inner"><Sparkles className="h-6 w-6" /></div>
                  <div><p className="font-semibold tracking-wide">ChatB2K <span className="text-amber-200">Omni</span></p><p className="mt-0.5 text-xs text-emerald-200/80">Live intelligence · language-aware</p></div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-full p-2 text-white/65 hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/25 p-1">
                <button onClick={() => setPersona("coach-b2k")} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${persona === "coach-b2k" ? "bg-amber-200 text-black" : "text-white/65 hover:bg-white/5"}`}>Coach B2K · Firm & caring</button>
                <button onClick={() => setPersona("mavia")} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${persona === "mavia" ? "bg-amber-200 text-black" : "text-white/65 hover:bg-white/5"}`}>Mavia · Concierge</button>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((item, index) => <div key={index} className={`max-w-[95%] whitespace-pre-wrap rounded-2xl p-3 text-sm leading-6 ${item.role === "user" ? "ml-auto rounded-tr-sm border border-amber-100/15 bg-amber-100/10 text-white" : "rounded-tl-sm border border-white/10 bg-white/[0.055] text-white/85"}`}>{item.content}</div>)}
              {busy && <div className="flex items-center gap-2 rounded-2xl border border-amber-200/15 bg-amber-200/[0.06] p-3 text-xs text-amber-100"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-200" /> ChatB2K is thinking…</div>}
              <div className="flex flex-wrap gap-2">{prompts.map((item) => <button key={item.label} onClick={() => { setAnswerTo(item.to); void sendMessage(item.text); }} disabled={busy} className="rounded-full border border-white/15 bg-white/[0.035] px-3 py-2 text-xs text-white/75 transition hover:border-amber-200/50 hover:bg-amber-200/10 disabled:opacity-40">{item.label}</button>)}</div>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2">
              <span className="flex items-center gap-1.5 text-[10px] text-white/45"><Globe2 className="h-3 w-3" /> Reply language adapts to your message</span>
              <button onClick={speakLatest} aria-label="Speak latest reply" className="rounded-full p-2 text-amber-100/80 hover:bg-white/10"><Volume2 className="h-4 w-4" /></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex items-center gap-2 border-t border-white/10 p-3">
              <label className="sr-only" htmlFor="chatb2k-question">Ask ChatB2K</label>
              <input id="chatb2k-question" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={persona === "mavia" ? "How may I help you today?" : "Tell me the goal. Let's move."} className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-200/50" />
              <button type="submit" disabled={busy || !message.trim()} aria-label="Send question" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-200 text-black transition hover:bg-amber-100 disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </form>
            <p className="px-4 pb-3 text-[10px] leading-4 text-white/35"><ShieldCheck className="mr-1 inline h-3 w-3" />Live AI replies. No payment or account action is confirmed here unless its secure flow verifies it.</p>
          </motion.section>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close ChatB2K Omni" : "Open ChatB2K Omni"} className="ml-auto flex items-center gap-2 rounded-full border border-amber-200/40 bg-[#090a0e]/95 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-black/50 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-amber-200/80">
        {open ? <X className="h-4 w-4 text-amber-200" /> : <MessageCircle className="h-5 w-5 text-amber-200" />}<span>ChatB2K Omni</span><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.8)]" />
      </button>
    </div>
  );
}
