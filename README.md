# Hyperbaric Rescue: Diabetic Foot Wound Game / משחק הצלת כף רגל סוכרתית

[English description below]

משחק אינטראקטיבי מתקדם ומעוצב המיועד לסמארטפונים, העוסק באבחון וטיפול בכף רגל סוכרתית ובטיפול בחמצן היפרברי (תא לחץ) למניעת קטיעות.

המשחק משלב חוויית משחוק (Gamification) עשירה הכוללת סריקת לייזר של כף הרגל, בדיקת מדדים דינמית, סימולטור לחץ של תא הלחץ וניהול אירועי חירום רפואיים בזמן אמת.

## תכונות מרכזיות
* **אבחון ומיון**: הערכת פוטנציאל ההחלמה של הפצע באמצעות בדיקת **TcPO2** וביצוע סריקה ידנית של כף הרגל.
* **הכנה ובטיחות**: איזון רמות הגלוקוז בדם לטווח יעד בטוח של **150-250 mg/dL** ומניעת היפוגליקמיה מראש.
* **סימולטור תא לחץ (The Dive)**: שליטה על לחץ התא בטווח הבטוח של **2.0 - 2.4 ATA** וניהול אירועי חירום (כאבי אוזניים ממשמרת לחץ, נפילת סוכר קשה).
* **מנוע סאונד מובנה**: שימוש ב-Web Audio API לסינתזה דינמית של צלילים והתרעות.
* **רספונסיביות מלאה**: מותאם אישית למסכי מובייל וסמארטפונים.

---

## English Version

An advanced, interactive mobile-friendly web game focused on diabetic foot care and Hyperbaric Oxygen Therapy (HBOT) to prevent amputations.

The game offers high-level gamification elements, including transcutaneous oxygen (TcPO2) laser scanning, blood glucose checks, real-time pressure chamber adjustments, and handling medical emergency events inside the chamber.

### Key Features
* **Triage & Diagnosis**: Evaluate wound healing potential with **TcPO2** using a laser scanner on a dynamic foot model.
* **Pre-Dive Safety**: Balance blood glucose levels to the target range of **150-250 mg/dL** and identify high-risk patients.
* **Hyperbaric Chamber Simulator**: Keep the chamber pressure between **2.0 and 2.4 ATA** using a dial, while managing sudden ear barotrauma and hypoglycemia crises.
* **Synthesized Audio Engine**: Built-in sound generation using the Web Audio API for immersive medical alerts.
* **Mobile-First Design**: Completely responsive layout for all smartphone screens.

---

## כיצד להריץ / How to Run

1. פתחו את הקובץ `index.html` ישירות בדפדפן, או הריצו שרת סטטי מקומי בתיקייה:
   ```bash
   npx http-server
   ```
2. כנסו לכתובת השרת (לדוגמה `http://localhost:8080`).
3. לחצו על כפתור הרמקול בפינה הימנית העליונה של המשחק כדי לאפשר את הסאונד.

---
*פותח כחלק מאתגר למידה ומשחוק רפואי.*
