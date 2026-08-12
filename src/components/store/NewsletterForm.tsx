"use client";

import { useState, type FormEvent } from "react";
import { isValidEmail } from "@/lib/utils/validation";

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();

    if (!isValidEmail(trimmed)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await response.json()) as { subscribed?: boolean; error?: string };

      if (!response.ok || !data.subscribed) {
        setStatus("error");
        setMessage(data.error ?? "Unable to subscribe right now. Please try again.");
        return;
      }

      setStatus("success");
      setMessage("You're on the list — watch for drops and sale alerts.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Unable to subscribe right now. Please try again.");
    }
  }

  if (status === "success") {
    return <p className="footer-newsletter-status is-success">{message}</p>;
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="Email for fashion updates"
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === "submitting"}
        />
        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Joining..." : "Join"}
        </button>
      </form>
      {status === "error" ? <p className="footer-newsletter-status is-error">{message}</p> : null}
    </>
  );
}
