import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const BIGO_AGENCY_INVITE_URL = "https://slink.bigovideo.tv/dpQ6ls?new_source=5";

const Questionnaire = () => (
  <main className="min-h-screen bg-[#080808] px-4 py-10 text-white sm:px-6">
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-amber-200 hover:text-amber-100"><ArrowLeft className="h-4 w-4" /> Elite NG home</Link>
      <div className="rounded-3xl border border-amber-200/20 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Elite NG · BIGO broadcaster onboarding</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Your agency invitation is one tap away.</h1>
        <p className="mt-5 text-base leading-7 text-white/70">You do not need to complete a long Elite NG form before joining. Open the official BIGO agency invitation first.</p>
        <a href={BIGO_AGENCY_INVITE_URL} target="_blank" rel="noreferrer" className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 py-4 text-base font-bold text-black transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
          Join BIGO Agency <ArrowRight className="h-5 w-5" />
        </a>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><Download className="mb-3 h-5 w-5 text-amber-200" /><p className="text-sm font-semibold">New to BIGO?</p><p className="mt-1 text-xs leading-5 text-white/55">Use the invite flow to install BIGO from your app store and create an account.</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><Smartphone className="mb-3 h-5 w-5 text-amber-200" /><p className="text-sm font-semibold">Already on BIGO?</p><p className="mt-1 text-xs leading-5 text-white/55">Open the invitation, sign in if asked, and follow BIGO's acceptance steps.</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><CheckCircle2 className="mb-3 h-5 w-5 text-amber-200" /><p className="text-sm font-semibold">After acceptance</p><p className="mt-1 text-xs leading-5 text-white/55">Return to ChatB2K for a short profile and agency-status verification.</p></div>
        </div>
        <p className="mt-6 text-xs leading-5 text-white/45">BIGO controls app installation and confirms whether an agency invitation has been accepted. Elite NG does not guarantee contracting, audience growth or earnings.</p>
        <Button asChild variant="outline" className="mt-6 w-full border-white/15 bg-white/[0.03] text-white hover:bg-white/10"><Link to="/">Back to Elite NG</Link></Button>
      </div>
    </div>
  </main>
);

export default Questionnaire;
