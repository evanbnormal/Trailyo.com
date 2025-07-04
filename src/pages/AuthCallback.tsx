import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      // This will parse the URL and set the session if it's a magic link
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (!error) {
        toast.success("Email verified! You're now signed in.");
        setTimeout(() => navigate("/"), 2000);
      } else {
        toast.error("There was a problem verifying your email.");
      }
    };
    handleAuth();
  }, [navigate]);

  return <div>Verifying your email...</div>;
} 