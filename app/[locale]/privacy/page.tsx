"use client";

import { useState } from "react";

type Lang = "he" | "en";

const content = {
  he: {
    dir: "rtl",
    lang: "he",
    toggle: "English",
    title: "מדיניות פרטיות",
    lastUpdated: "עודכן לאחרונה: אפריל 2025",
    intro:
      "ב-Kululu אנו מייחסים חשיבות עליונה לפרטיות המשתמשים שלנו. מדיניות פרטיות זו מתארת כיצד אנו אוספים, משתמשים ומגנים על המידע האישי שלך בעת שימוש בפלטפורמת ניהול האירועים שלנו.",
    sections: [
      {
        title: "1. מידע שאנו אוספים",
        content: [
          "**מידע שמסרת לנו ישירות:**",
          "• שם מלא – לזיהוי חשבונך ולניהול רשימת האורחים.",
          "• כתובת דוא\"ל – לצורך כניסה לחשבון, שליחת עדכונים ותקשורת שירות.",
          "• מספר טלפון – לצורך שליחת הודעות WhatsApp ו-SMS הקשורות לאירוע.",
          "• פרטי תשלום – מעובדים בצורה מאובטחת דרך Stripe. Kululu אינה שומרת מספרי כרטיס אשראי על שרתיה.",
          "",
          "**מידע הנאסף אוטומטית:**",
          "• נתוני שימוש ולוגים (כתובת IP, סוג דפדפן, עמודים שביקרת).",
          "• קובצי Cookie הכרחיים לפעולת המערכת.",
        ],
      },
      {
        title: "2. כיצד אנו משתמשים במידע",
        content: [
          "אנו משתמשים במידע שנאסף לצורך:",
          "• מתן שירות ניהול האירועים, כולל ניהול רשימות אורחים ואישורי הגעה.",
          "• שליחת הודעות WhatsApp ו-SMS לאורחי האירוע בהתאם להרשאות שהענקת.",
          "• שיפור חוויית המשתמש ותפקוד הפלטפורמה.",
          "• תקשורת שירות, עדכוני מערכת והודעות אבטחה.",
          "• עמידה בדרישות חוקיות ורגולטוריות.",
        ],
      },
      {
        title: "3. שיתוף מידע עם צדדים שלישיים",
        content: [
          "Kululu אינה מוכרת, מסחרת או מעבירה מידע אישי לצדדים שלישיים, למעט:",
          "• **ספקי שירות:** Supabase (אחסון נתונים), Vercel (אירוח), Stripe (עיבוד תשלומים), Resend (דוא\"ל), ActiveTrail (SMS), Meta WhatsApp Business API – כולם מחויבים לאי-גילוי המידע.",
          "• **דרישות חוקיות:** במקרה שנדרשים על-פי חוק לגלות מידע.",
        ],
      },
      {
        title: "4. אבטחת מידע",
        content: [
          "אנו נוקטים אמצעים טכניים וארגוניים סבירים להגנה על המידע שלך:",
          "• תקשורת מוצפנת באמצעות HTTPS/TLS.",
          "• גישה מוגבלת למידע על בסיס הרשאות תפקידיות (Row Level Security).",
          "• עיבוד תשלומים מאובטח דרך Stripe בלבד.",
          "עם זאת, אין שיטת אבטחה מושלמת לחלוטין, ואנו ממליצים לשמור על סיסמאות חזקות.",
        ],
      },
      {
        title: "5. שמירת מידע",
        content: [
          "אנו שומרים את המידע האישי שלך כל עוד חשבונך פעיל, או כל עוד נדרש לצורך מתן השירות. עם מחיקת חשבונך, נמחק את נתוניך האישיים תוך 30 ימים, למעט מידע שנדרש לשמור על-פי חוק.",
        ],
      },
      {
        title: "6. זכויותיך",
        content: [
          "בהתאם לחוק הגנת הפרטיות הישראלי ולתקנות GDPR (ככל שחלות), יש לך זכות:",
          "• לעיין במידע האישי שנשמר עליך.",
          "• לתקן מידע שגוי.",
          "• למחוק את חשבונך ואת המידע הקשור אליו.",
          "• להתנגד לעיבוד מידע מסוים.",
          'לפניות בנושאי פרטיות: <a href="mailto:privacy@kulu-lu.com" class="text-link">privacy@kulu-lu.com</a>',
        ],
      },
      {
        title: "7. קובצי Cookie",
        content: [
          "Kululu משתמשת בקובצי Cookie הכרחיים לתפקוד המערכת בלבד (ניהול כניסה לחשבון). איננו משתמשים ב-Cookie לצרכי פרסום.",
        ],
      },
      {
        title: "8. שינויים במדיניות",
        content: [
          "אנו עשויים לעדכן מדיניות זו מעת לעת. במקרה של שינויים מהותיים, נודיע לך באמצעות הדוא\"ל הרשום או בהתראה בתוך האפליקציה.",
        ],
      },
      {
        title: "9. יצירת קשר",
        content: [
          "לשאלות בנוגע למדיניות הפרטיות שלנו:",
          'דוא"ל: <a href="mailto:privacy@kulu-lu.com" class="text-link">privacy@kulu-lu.com</a>',
          "אתר: kulu-lu.com",
        ],
      },
    ],
  },
  en: {
    dir: "ltr",
    lang: "en",
    toggle: "עברית",
    title: "Privacy Policy",
    lastUpdated: "Last updated: April 2025",
    intro:
      "At Kululu, we take your privacy seriously. This Privacy Policy describes how we collect, use, and protect your personal information when you use our event and RSVP management platform.",
    sections: [
      {
        title: "1. Information We Collect",
        content: [
          "**Information you provide directly:**",
          "• Full name – to identify your account and manage your guest list.",
          "• Email address – for account login, updates, and service communications.",
          "• Phone number – to send WhatsApp and SMS messages related to your event.",
          "• Payment information – securely processed through Stripe. Kululu does not store credit card numbers on its servers.",
          "",
          "**Information collected automatically:**",
          "• Usage data and logs (IP address, browser type, pages visited).",
          "• Essential cookies required for platform functionality.",
        ],
      },
      {
        title: "2. How We Use Your Information",
        content: [
          "We use the collected information to:",
          "• Provide our event management service, including guest list management and RSVP tracking.",
          "• Send WhatsApp and SMS messages to event guests in accordance with your permissions.",
          "• Improve user experience and platform performance.",
          "• Send service communications, system updates, and security notices.",
          "• Comply with legal and regulatory requirements.",
        ],
      },
      {
        title: "3. Sharing Information with Third Parties",
        content: [
          "Kululu does not sell, trade, or transfer personal information to third parties, except:",
          "• **Service providers:** Supabase (data storage), Vercel (hosting), Stripe (payment processing), Resend (email), ActiveTrail (SMS), Meta WhatsApp Business API – all bound by confidentiality obligations.",
          "• **Legal requirements:** When required by law to disclose information.",
        ],
      },
      {
        title: "4. Data Security",
        content: [
          "We take reasonable technical and organizational measures to protect your data:",
          "• Encrypted communication via HTTPS/TLS.",
          "• Role-based access control (Row Level Security).",
          "• Secure payment processing exclusively through Stripe.",
          "No security method is completely foolproof, and we recommend maintaining strong passwords.",
        ],
      },
      {
        title: "5. Data Retention",
        content: [
          "We retain your personal data for as long as your account is active or as needed to provide the service. Upon account deletion, your personal data will be deleted within 30 days, except where retention is required by law.",
        ],
      },
      {
        title: "6. Your Rights",
        content: [
          "Under Israeli Privacy Protection Law and GDPR (where applicable), you have the right to:",
          "• Access the personal information we hold about you.",
          "• Correct inaccurate information.",
          "• Delete your account and associated data.",
          "• Object to certain data processing.",
          'For privacy inquiries: <a href="mailto:privacy@kulu-lu.com" class="text-link">privacy@kulu-lu.com</a>',
        ],
      },
      {
        title: "7. Cookies",
        content: [
          "Kululu uses only essential cookies required for platform functionality (session management). We do not use cookies for advertising purposes.",
        ],
      },
      {
        title: "8. Policy Changes",
        content: [
          "We may update this policy from time to time. For material changes, we will notify you via your registered email or via an in-app notification.",
        ],
      },
      {
        title: "9. Contact Us",
        content: [
          "For questions about our privacy policy:",
          'Email: <a href="mailto:privacy@kulu-lu.com" class="text-link">privacy@kulu-lu.com</a>',
          "Website: kulu-lu.com",
        ],
      },
    ],
  },
};

export default function PrivacyPage() {
  const [lang, setLang] = useState<Lang>("he");
  const c = content[lang];

  return (
    <div
      dir={c.dir}
      lang={c.lang}
      className="min-h-screen bg-background text-foreground"
    >
      <style>{`
        .text-link {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .text-link:hover {
          opacity: 0.8;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">Kululu</span>
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="text-sm text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors"
          >
            {c.toggle}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.lastUpdated}</p>
        </div>

        {/* Intro */}
        <p className="text-base leading-relaxed text-muted-foreground mb-10 border-s-4 border-primary ps-4">
          {c.intro}
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {c.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold mb-3">{section.title}</h2>
              <div className="space-y-1.5">
                {section.content.map((line, j) => {
                  if (line === "") return <div key={j} className="h-2" />;

                  // Bold prefix support: **text:**
                  const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/);
                  if (boldMatch) {
                    return (
                      <p key={j} className="text-sm leading-relaxed">
                        <strong>{boldMatch[1]}</strong>
                        {boldMatch[2]}
                      </p>
                    );
                  }

                  // Lines with HTML links
                  if (line.includes("<a ")) {
                    return (
                      <p
                        key={j}
                        className="text-sm leading-relaxed text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: line }}
                      />
                    );
                  }

                  return (
                    <p
                      key={j}
                      className="text-sm leading-relaxed text-muted-foreground"
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Kululu. All rights reserved.
        </div>
      </main>
    </div>
  );
}
