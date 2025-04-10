# **App Name**: AttendAI

## Core Features:

- Basic Authentication: Simple login using phone number or email and password. Only one login method needs to be supported to start with.
- Facial Recognition Attendance: AI-powered facial recognition for attendance marking. Use the front-facing camera to confirm identify before marking attendance.
- Attendance History: Display attendance history, including dates and times of check-in and check-out.
- Profile Management: Allow users to view and edit their profile information, such as name, contact details, and profile picture.
- AI-Powered FAQ: Use an LLM tool to provide helpful answers to frequently asked questions about using the app.

## Style Guidelines:

- Primary color: Use a calming blue (#3498db) for the primary app interface.
- Secondary color: Light gray (#ecf0f1) for backgrounds and neutral elements.
- Accent color: Green (#2ecc71) to highlight successful attendance and confirmations.
- Use clear, simple layouts with intuitive navigation. Prioritize a user-friendly experience.
- Employ consistent and recognizable icons for key actions such as check-in, check-out, and settings.
- Subtle animations for transitions and feedback, enhancing the user experience without being distracting.

## Original User Request:
"Create an AI-based Self-Attendance app with the following features:

User Authentication: Secure login/signup with email/phone and password; OAuth 2.0 for Google/Facebook.
Facial Recognition: Prioritize AI-based facial recognition (95%+ accuracy, <2s recognition time) using OpenCV/TensorFlow.
Geo-fencing: Auto-track attendance in admin-defined zones via GPS.
Overtime & Salary: Calculate salary/overtime with configurable rates for weekends/holidays.
Dashboard: Visual attendance trends, exportable as PDF/CSV.
Breaks & Shifts: Track breaks and manage shift schedules.
Gamification: Reward consistent attendance (e.g., 'Punctuality Star' for 30 days).
Offline Mode: Store up to 7 days of data locally, sync when online.
Multi-language: Support Hindi, Marathi, English, with user-selectable options.
Admin Panel: Web-based, built with React.js, for attendance/salary management.
Security: Encrypt data, use SSL/TLS, comply with GDPR and Indian privacy laws.
UI: Intuitive design with Flutter, include dark mode.
Tech Stack: Frontend: Flutter; Backend: Node.js; DB: PostgreSQL; AI: TensorFlow.
Extras: Add FAQs, modular code, and a feedback system."
  