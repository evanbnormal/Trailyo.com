import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // For our simple implementation, we don't have email verification
    // This page can be used for future OAuth implementations
    toast.info("Auth callback - no action needed for current implementation");
    setTimeout(() => navigate("/"), 2000);
  }, [navigate]);

  return <div>Redirecting...</div>;
} 