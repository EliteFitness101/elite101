import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SubmissionState = "idle" | "submitting" | "success" | "error";
const BIGO_AGENCY_INVITE_URL = "https://slink.bigovideo.tv/dpQ6ls?new_source=5";
const fieldClass = "mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  let sessionId = sessionStorage.getItem("elite_bigo_rsid");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("elite_bigo_rsid", sessionId);
  }
  return {
    rsid: sessionId,
    landing_path: window.location.pathname,
    referrer: document.referrer.slice(0, 1000),
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    fbclid: params.get("fbclid") || "",
    gclid: params.get("gclid") || "",
    ttclid: params.get("ttclid") || "",
  };
}

const Questionnaire = () => {
  const [submission, setSubmission] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submission === "submitting") return;
    setSubmission("submitting");
    setMessage("");
    setReference("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      full_name: String(form.get("full_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      phone: String(form.get("phone") ?? "").trim(),
      age: Number(form.get("age")),
      country: "Nigeria",
      state: "",
      city: "",
      bigo_username: "",
      bigo_uid: "",
      tiktok: "",
      instagram: "",
      experience: "",
      availability: "",
      languages: "",
      device: "",
      content_category: "",
      internet_ready: false,
      whatsapp_opt_in: false,
      consent_age: form.get("consent_age") === "on",
      consent_identity: form.get("consent_terms") === "on",
      consent_terms: form.get("consent_terms") === "on",
      website: String(form.get("website") ?? "").trim(),
      source_channel: "elite.resofit.fit/questionnaire",
      attribution: getAttribution(),
    };

    try {
      const { data, error } = await supabase.functions.invoke("elite-host-apply", { body: payload });
      if (error) throw error;
      if (!data?.ok) {
        setSubmission("error");
        setMessage(data?.message || "We could not submit your application. Please try again.");
        return;
      }
      setSubmission("success");
      setReference(data.reference || "");
      setMessage("Application received. You can continue to BIGO whenever you're ready.");
      formElement.reset();
    } catch (error) {
      console.error("Elite NG application submission failed", error);
      setSubmission("error");
      setMessage("We could not confirm submission. Please try again. If you already received a reference, do not submit again.");
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="text-sm text-amber-200 hover:text-amber-100">← Elite NG home</Link>
        <header className="mt-7 border-b border-white/10 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Elite NG · BIGO creator opportunity</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Register your interest</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">Share a few details and our team can follow up. No Elite NG account, BIGO UID, portfolio or uploads needed.</p>
        </header>

        {message && (
          <div role={submission === "error" ? "alert" : "status"} className={`mt-6 rounded-xl border p-4 text-sm ${submission === "error" ? "border-red-400/30 bg-red-400/10 text-red-100" : "border-amber-300/30 bg-amber-300/10 text-amber-50"}`}>
            <p>{message}</p>
            {reference && <p className="mt-2 font-semibold">Application reference: {reference}</p>}
            {submission === "success" && (
              <a href={BIGO_AGENCY_INVITE_URL} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-200">
                Continue to BIGO
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
          <label className="block text-sm text-white/80">Full name *
            <input className={fieldClass} name="full_name" autoComplete="name" minLength={2} maxLength={100} placeholder="Your name" required />
          </label>
          <label className="block text-sm text-white/80">Email address *
            <input className={fieldClass} name="email" type="email" autoComplete="email" maxLength={255} placeholder="you@example.com" required />
          </label>
          <label className="block text-sm text-white/80">Phone / WhatsApp *
            <input className={fieldClass} name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={25} placeholder="+234…" required />
          </label>
          <label className="block text-sm text-white/80">Age *
            <input className={fieldClass} name="age" type="number" min={18} max={80} inputMode="numeric" placeholder="18 or above" required />
          </label>
          <label className="flex items-start gap-3 text-sm leading-5 text-white/75">
            <input className="mt-1 accent-amber-300" type="checkbox" name="consent_age" required />
            I confirm that I am at least 18 years old.
          </label>
          <label className="flex items-start gap-3 text-sm leading-5 text-white/75">
            <input className="mt-1 accent-amber-300" type="checkbox" name="consent_terms" required />
            I confirm these details are accurate and agree that Elite NG may use them to respond to my recruitment enquiry.
          </label>
          <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
            <label>Leave this field blank<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <button type="submit" disabled={submission === "submitting"} className="w-full rounded-xl bg-amber-300 px-6 py-4 text-sm font-bold text-black transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60">
            {submission === "submitting" ? "Submitting…" : "Submit interest"}
          </button>
          <p className="text-center text-xs leading-5 text-white/40">No password, BIGO UID, profile links or document uploads required.</p>
        </form>
      </div>
    </main>
  );
};

export default Questionnaire;
