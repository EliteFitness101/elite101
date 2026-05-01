import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const BookingSuccess = () => {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!reference) { setStatus("failed"); return; }
      const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference } });
      if (error || !data?.success) { setStatus("failed"); return; }
      setBooking(data.booking);
      setStatus("success");
    })();
  }, [reference]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-md py-20">
        <div className="glass-strong rounded-3xl p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 mx-auto text-gold animate-spin mb-4" />
              <h1 className="font-display text-2xl">Verifying payment...</h1>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-14 w-14 mx-auto text-neon mb-4" />
              <h1 className="font-display text-3xl mb-2">Booking confirmed</h1>
              <p className="text-sm text-muted-foreground mb-6">
                ₦{booking?.amount_ngn?.toLocaleString()} processed. The model has been notified.
              </p>
              <Button asChild className="bg-gold text-primary-foreground"><Link to="/dashboard/brand">Back to dashboard</Link></Button>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="h-14 w-14 mx-auto text-destructive mb-4" />
              <h1 className="font-display text-2xl mb-2">Verification failed</h1>
              <p className="text-sm text-muted-foreground mb-6">We couldn't verify your payment. Please contact support.</p>
              <Button asChild variant="outline"><Link to="/dashboard/brand">Back</Link></Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
