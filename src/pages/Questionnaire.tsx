import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SubmissionState = "idle" | "submitting" | "success" | "error";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

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
      country: String(form.get("country") ?? "Nigeria"),
      state: String(form.get("state") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      bigo_username: String(form.get("bigo_username") ?? "").trim(),
      bigo_uid: String(form.get("bigo_uid") ?? "").trim(),
      tiktok: String(form.get("tiktok") ?? "").trim(),
      instagram: String(form.get("instagram") ?? "").trim(),
      experience: String(form.get("experience") ?? "").trim(),
      availability: String(form.get("availability") ?? "").trim(),
      languages: String(form.get("languages") ?? "").trim(),
      device: String(form.get("device") ?? "").trim(),
      content_category: String(form.get("content_category") ?? "").trim(),
      internet_ready: form.get("internet_ready") === "on",
      whatsapp_opt_in: form.get("whatsapp_opt_in") === "on",
      consent_age: form.get("consent_age") === "on",
      consent_identity: form.get("consent_identity") === "on",
      consent_terms: form.get("consent_terms") === "on",
      website: String(form.get("website") ?? "").trim(),
      source_channel: "elite.resofit.fit/questionnaire",
    };

    try {
      const { data, error } = await supabase.functions.invoke("elite-host-apply", { body: payload });
      if (error) throw error;
      if (!data?.ok) {
        setSubmission("error");
        setMessage(data?.message || "We could not submit your application. Please review the form and try again.");
        return;
      }
      setSubmission("success");
      setReference(data.reference || "");
      setMessage(data.message || "Your application has been received.");
      formElement.reset();
    } catch (error) {
      console.error("Elite NG application submission failed", error);
      setSubmission("error");
      setMessage("Submission could not be confirmed. Please try again in a moment. Do not submit repeatedly if you already received a reference.");
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-amber-200 hover:text-amber-100">← Elite NG home</Link>
        <header className="mt-8 border-b border-white/10 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Elite NG · Creator opportunity</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">Host application</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
            Tell us about yourself, your live-streaming experience and your setup. Applicants must be 18 or older.
            Submitting this form does not guarantee acceptance.
          </p>
        </header>

        {message && (
          <div role={submission === "error" ? "alert" : "status"} className={`mt-6 rounded-xl border p-4 text-sm ${submission === "error" ? "border-red-400/30 bg-red-400/10 text-red-100" : "border-amber-300/30 bg-amber-300/10 text-amber-50"}`}>
            <p>{message}</p>
            {reference && <p className="mt-2 font-semibold">Reference: {reference}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-2 sm:p-7">
            <div className="sm:col-span-2"><h2 className="text-lg font-semibold">Your details</h2></div>
            <label className="text-sm text-white/80">Full name *<input className={fieldClass} name="full_name" autoComplete="name" minLength={2} maxLength={100} required /></label>
            <label className="text-sm text-white/80">Email address *<input className={fieldClass} name="email" type="email" autoComplete="email" maxLength={255} required /></label>
            <label className="text-sm text-white/80">Phone / WhatsApp *<input className={fieldClass} name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={25} required /></label>
            <label className="text-sm text-white/80">Age (18+) *<input className={fieldClass} name="age" type="number" min={18} max={80} required /></label>
            <label className="text-sm text-white/80">Country *<input className={fieldClass} name="country" defaultValue="Nigeria" maxLength={80} required /></label>
            <label className="text-sm text-white/80">State / region<input className={fieldClass} name="state" maxLength={80} /></label>
            <label className="text-sm text-white/80 sm:col-span-2">City *<input className={fieldClass} name="city" autoComplete="address-level2" minLength={2} maxLength={80} required /></label>
          </section>

          <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-2 sm:p-7">
            <div className="sm:col-span-2"><h2 className="text-lg font-semibold">Creator profiles</h2><p className="mt-1 text-sm text-white/55">Enter the profiles you want the review team to assess.</p></div>
            <label className="text-sm text-white/80">BIGO username<input className={fieldClass} name="bigo_username" maxLength={80} /></label>
            <label className="text-sm text-white/80">BIGO UID<input className={fieldClass} name="bigo_uid" maxLength={80} /></label>
            <label className="text-sm text-white/80">TikTok handle<input className={fieldClass} name="tiktok" maxLength={80} /></label>
            <label className="text-sm text-white/80">Instagram handle<input className={fieldClass} name="instagram" maxLength={80} /></label>
            <label className="text-sm text-white/80 sm:col-span-2">Preferred content category<input className={fieldClass} name="content_category" placeholder="e.g. lifestyle, music, fitness, talk shows" maxLength={200} /></label>
          </section>

          <section className="grid gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:grid-cols-2 sm:p-7">
            <div className="sm:col-span-2"><h2 className="text-lg font-semibold">Experience and setup</h2></div>
            <label className="text-sm text-white/80 sm:col-span-2">Relevant experience<textarea className={fieldClass} name="experience" rows={4} maxLength={2000} placeholder="Tell us about your live sessions, audience and goals." /></label>
            <label className="text-sm text-white/80">Availability<input className={fieldClass} name="availability" placeholder="e.g. evenings, 4 days/week" maxLength={500} /></label>
            <label className="text-sm text-white/80">Languages<input className={fieldClass} name="languages" placeholder="e.g. English, Pidgin, Igbo" maxLength={300} /></label>
            <label className="text-sm text-white/80 sm:col-span-2">Streaming device and setup<input className={fieldClass} name="device" placeholder="Phone model, lighting, microphone, etc." maxLength={200} /></label>
            <label className="flex items-start gap-3 text-sm text-white/75 sm:col-span-2"><input className="mt-1 accent-amber-300" type="checkbox" name="internet_ready" />I have reliable internet access for live streaming.</label>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
            <h2 className="text-lg font-semibold">Consent and eligibility</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">We use these details to review your application and coordinate the recruitment process. Do not submit passwords, verification codes or payment-card details.</p>
            <div className="mt-5 space-y-4">
              <label className="flex items-start gap-3 text-sm text-white/80"><input className="mt-1 accent-amber-300" type="checkbox" name="consent_age" required />I confirm I am at least 18 years old. *</label>
              <label className="flex items-start gap-3 text-sm text-white/80"><input className="mt-1 accent-amber-300" type="checkbox" name="consent_identity" required />I confirm that the information and profile handles I supplied are accurate and may be reviewed for this application. *</label>
              <label className="flex items-start gap-3 text-sm text-white/80"><input className="mt-1 accent-amber-300" type="checkbox" name="consent_terms" required />I agree to have my application details processed for recruitment and verification, as described above. *</label>
              <label className="flex items-start gap-3 text-sm text-white/80"><input className="mt-1 accent-amber-300" type="checkbox" name="whatsapp_opt_in" />I agree to receive application updates by WhatsApp.</label>
            </div>
          </section>

          <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
            <label>Leave this field blank<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>

          <button type="submit" disabled={submission === "submitting"} className="w-full rounded-xl bg-amber-300 px-6 py-4 text-sm font-bold text-black transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60">
            {submission === "submitting" ? "Submitting securely…" : "Submit host application"}
          </button>
          <p className="text-center text-xs leading-5 text-white/40">Required fields are marked *. If the submission result is unclear, wait before retrying to avoid duplicate applications.</p>
        </form>
      </div>
    </main>
  );
};

export default Questionnaire;
