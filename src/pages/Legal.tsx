import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const content = {
  terms: {
    title: "Terms of Service",
    summary:
      "These terms outline the basic rules for using WeTalkTo. This is a short placeholder until the full terms are published.",
    bullets: [
      "Use WeTalkTo respectfully and follow local laws.",
      "Do not upload content you do not have rights to share.",
      "We can update the product and these terms over time.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    summary:
      "WeTalkTo stores account data and quote content to run the app. This is a brief placeholder until the full privacy policy is published.",
    bullets: [
      "We store your email and account details for login.",
      "Interactions help personalize your feed.",
      "You can request deletion of your account data.",
    ],
  },
  cookies: {
    title: "Cookie Policy",
    summary:
      "WeTalkTo uses cookies to keep sessions and personalize content. This is a brief placeholder until the full cookie policy is published.",
    bullets: [
      "Auth tokens and guest IDs are stored for session continuity.",
      "We use cookies to understand basic usage patterns.",
      "You can clear cookies at any time in your browser.",
    ],
  },
};

type LegalType = keyof typeof content;

export default function LegalPage({ type }: { type: LegalType }) {
  const navigate = useNavigate();
  const page = content[type];

  return (
    <div className="space-y-6 pt-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary dark:text-white">
            {page.title}
          </h1>
          <p className="text-sm text-muted-foreground">Updated soon</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <div className="rounded-[16px] border border-border-light dark:border-border-dark bg-white dark:bg-[#1f1f22] p-6 space-y-4 shadow-sm">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {page.summary}
        </p>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
          {page.bullets.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
