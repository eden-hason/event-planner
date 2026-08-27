"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Lang = "he" | "en";

const content = {
  he: {
    dir: "rtl",
    lang: "he",
    toggle: "English",
    back: "חזרה",
    title: "תנאי שימוש",
    lastUpdated: "עודכן לאחרונה: אפריל 2025",
    intro:
      "ברוכים הבאים ל-Kululu. תנאי שימוש אלה מסדירים את השימוש שלך בפלטפורמת ניהול האירועים ואישורי ההגעה שלנו. השימוש בשירות מהווה הסכמה מלאה לתנאים אלה. אם אינך מסכים לתנאים, אנא הימנע משימוש בשירות.",
    sections: [
      {
        title: "1. קבלת התנאים",
        content: [
          "בעצם יצירת חשבון או שימוש בשירותי Kululu, אתה מאשר כי קראת, הבנת והסכמת להיות מחויב לתנאי שימוש אלה ולמדיניות הפרטיות שלנו.",
          "אם אתה משתמש בשירות מטעם ארגון, אתה מצהיר כי יש לך את הסמכות לחייב אותו בתנאים אלה.",
        ],
      },
      {
        title: "2. תיאור השירות",
        content: [
          "Kululu היא פלטפורמה לניהול אירועים המאפשרת, בין היתר:",
          "• ניהול רשימות אורחים ומעקב אחר אישורי הגעה.",
          "• שליחת הזמנות ועדכונים באמצעות WhatsApp ו-SMS.",
          "• ניהול תקציב, סידורי הושבה ולוחות זמנים לאירוע.",
          "אנו רשאים להוסיף, לשנות או להפסיק תכונות בשירות מעת לעת.",
        ],
      },
      {
        title: "3. הרשמה וחשבון משתמש",
        content: [
          "• עליך להיות בן 18 לפחות כדי לפתוח חשבון.",
          "• עליך לספק מידע מדויק ומעודכן בעת ההרשמה.",
          "• אתה אחראי באופן בלעדי לשמירה על סודיות פרטי הכניסה לחשבונך ולכל הפעילות המתבצעת דרכו.",
          "• עליך להודיע לנו מיידית על כל שימוש בלתי מורשה בחשבונך.",
        ],
      },
      {
        title: "4. שימוש מותר",
        content: [
          "אתה מתחייב שלא:",
          "• להשתמש בשירות למטרה בלתי חוקית או אסורה.",
          "• לשלוח דואר זבל (spam) או תוכן פוגעני, מטריד או מפר זכויות.",
          "• לנסות לפרוץ, לשבש או להעמיס יתר על המידה על מערכות השירות.",
          "• להעתיק, לשכפל או להנדס לאחור חלקים מהשירות ללא רשות.",
        ],
      },
      {
        title: "5. נתוני אורחים והודעות",
        content: [
          "בעת העלאת פרטי אורחים (שמות, מספרי טלפון וכדומה), אתה מצהיר כי קיבלת את ההסכמות הנדרשות לפי דין לשליחת הודעות WhatsApp ו-SMS לאותם אנשים.",
          "אתה נושא באחריות המלאה לתוכן ההודעות שאתה שולח באמצעות הפלטפורמה ולעמידתן בכללי Meta WhatsApp Business ובחוק הספאם.",
        ],
      },
      {
        title: "6. תשלומים ומנויים",
        content: [
          "• חבילות בתשלום מעובדות באופן מאובטח דרך Stripe. Kululu אינה שומרת פרטי כרטיסי אשראי על שרתיה.",
          "• המחירים ותנאי החיוב מוצגים בעמוד החבילות ועשויים להשתנות בהודעה מראש.",
          "• אלא אם צוין אחרת, תשלומים אינם ניתנים להחזר לאחר אספקת השירות.",
        ],
      },
      {
        title: "7. קניין רוחני",
        content: [
          "כל הזכויות בשירות, לרבות העיצוב, הקוד, הלוגו והתכנים של Kululu, שמורות ל-Kululu. התוכן שאתה מעלה נותר בבעלותך, ואתה מעניק ל-Kululu רישיון מוגבל להשתמש בו לצורך אספקת השירות בלבד.",
        ],
      },
      {
        title: "8. שירותי צד שלישי",
        content: [
          "השירות נשען על ספקי צד שלישי (בהם Supabase, Vercel, Stripe, Resend, ActiveTrail ו-Meta WhatsApp Business API). השימוש ברכיבים אלה כפוף גם לתנאים ולמדיניות של אותם ספקים.",
        ],
      },
      {
        title: "9. הגבלת אחריות",
        content: [
          'השירות מסופק כמות שהוא ("AS IS") וללא אחריות מכל סוג. Kululu לא תישא באחריות לנזקים עקיפים, תוצאתיים או מיוחדים הנובעים מהשימוש בשירות, לרבות אובדן נתונים או אי-מסירת הודעות, במידה המרבית המותרת על-פי דין.',
        ],
      },
      {
        title: "10. סיום ההתקשרות",
        content: [
          "אנו רשאים להשעות או לבטל את חשבונך במקרה של הפרת תנאים אלה. אתה רשאי למחוק את חשבונך בכל עת. עם הסיום, השימוש שלך בשירות יופסק, ונתוניך יטופלו בהתאם למדיניות הפרטיות שלנו.",
        ],
      },
      {
        title: "11. שינויים בתנאים",
        content: [
          "אנו עשויים לעדכן תנאים אלה מעת לעת. במקרה של שינויים מהותיים, נודיע לך באמצעות הדוא\"ל הרשום או בהתראה בתוך האפליקציה. המשך השימוש בשירות לאחר השינוי מהווה הסכמה לתנאים המעודכנים.",
        ],
      },
      {
        title: "12. דין וסמכות שיפוט",
        content: [
          "תנאים אלה כפופים לדיני מדינת ישראל. סמכות השיפוט הבלעדית בכל מחלוקת נתונה לבתי המשפט המוסמכים במחוז תל אביב-יפו.",
        ],
      },
      {
        title: "13. יצירת קשר",
        content: [
          "לשאלות בנוגע לתנאי השימוש שלנו:",
          'דוא"ל: <a href="mailto:support@kulu-lu.com" class="text-link">support@kulu-lu.com</a>',
          "אתר: kulu-lu.com",
        ],
      },
    ],
  },
  en: {
    dir: "ltr",
    lang: "en",
    toggle: "עברית",
    back: "Back",
    title: "Terms of Use",
    lastUpdated: "Last updated: April 2025",
    intro:
      "Welcome to Kululu. These Terms of Use govern your use of our event and RSVP management platform. By using the service, you agree to these terms in full. If you do not agree, please do not use the service.",
    sections: [
      {
        title: "1. Acceptance of Terms",
        content: [
          "By creating an account or using Kululu's services, you confirm that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.",
          "If you use the service on behalf of an organization, you represent that you have the authority to bind it to these terms.",
        ],
      },
      {
        title: "2. Description of Service",
        content: [
          "Kululu is an event management platform that enables, among other things:",
          "• Guest list management and RSVP tracking.",
          "• Sending invitations and updates via WhatsApp and SMS.",
          "• Managing budgets, seating arrangements, and event schedules.",
          "We may add, modify, or discontinue features of the service from time to time.",
        ],
      },
      {
        title: "3. Registration and Account",
        content: [
          "• You must be at least 18 years old to open an account.",
          "• You must provide accurate and current information when registering.",
          "• You are solely responsible for keeping your account credentials confidential and for all activity conducted through your account.",
          "• You must notify us immediately of any unauthorized use of your account.",
        ],
      },
      {
        title: "4. Acceptable Use",
        content: [
          "You agree not to:",
          "• Use the service for any unlawful or prohibited purpose.",
          "• Send spam or content that is offensive, harassing, or infringing.",
          "• Attempt to hack, disrupt, or overload the service's systems.",
          "• Copy, reproduce, or reverse-engineer parts of the service without permission.",
        ],
      },
      {
        title: "5. Guest Data and Messaging",
        content: [
          "When uploading guest details (names, phone numbers, etc.), you represent that you have obtained the consents required by law to send WhatsApp and SMS messages to those individuals.",
          "You bear full responsibility for the content of the messages you send through the platform and for their compliance with Meta WhatsApp Business rules and anti-spam law.",
        ],
      },
      {
        title: "6. Payments and Subscriptions",
        content: [
          "• Paid plans are processed securely through Stripe. Kululu does not store credit card details on its servers.",
          "• Prices and billing terms are shown on the pricing page and may change with prior notice.",
          "• Unless stated otherwise, payments are non-refundable once the service has been delivered.",
        ],
      },
      {
        title: "7. Intellectual Property",
        content: [
          "All rights in the service, including Kululu's design, code, logo, and content, are reserved to Kululu. Content you upload remains yours, and you grant Kululu a limited license to use it solely for the purpose of providing the service.",
        ],
      },
      {
        title: "8. Third-Party Services",
        content: [
          "The service relies on third-party providers (including Supabase, Vercel, Stripe, Resend, ActiveTrail, and Meta WhatsApp Business API). Use of these components is also subject to those providers' own terms and policies.",
        ],
      },
      {
        title: "9. Limitation of Liability",
        content: [
          'The service is provided "AS IS" and without warranty of any kind. To the maximum extent permitted by law, Kululu shall not be liable for indirect, consequential, or special damages arising from use of the service, including data loss or non-delivery of messages.',
        ],
      },
      {
        title: "10. Termination",
        content: [
          "We may suspend or terminate your account if you breach these terms. You may delete your account at any time. Upon termination, your use of the service will cease, and your data will be handled in accordance with our Privacy Policy.",
        ],
      },
      {
        title: "11. Changes to Terms",
        content: [
          "We may update these terms from time to time. For material changes, we will notify you via your registered email or via an in-app notification. Continued use of the service after a change constitutes acceptance of the updated terms.",
        ],
      },
      {
        title: "12. Governing Law and Jurisdiction",
        content: [
          "These terms are governed by the laws of the State of Israel. Exclusive jurisdiction over any dispute lies with the competent courts of the Tel Aviv-Yafo district.",
        ],
      },
      {
        title: "13. Contact Us",
        content: [
          "For questions about our terms of use:",
          'Email: <a href="mailto:support@kulu-lu.com" class="text-link">support@kulu-lu.com</a>',
          "Website: kulu-lu.com",
        ],
      },
    ],
  },
};

export default function TermsPage() {
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
        <div className="relative max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {c.dir === "rtl" ? (
              <ArrowRight className="size-4" />
            ) : (
              <ArrowLeft className="size-4" />
            )}
            {c.back}
          </Link>
          <Link
            href="/"
            dir="ltr"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2"
          >
            <Image
              src="/kululu-logo-gray.svg"
              alt="Kululu"
              width={28}
              height={28}
              className="size-7"
            />
            <span className="text-xl font-bold tracking-tight">Kululu</span>
          </Link>
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
