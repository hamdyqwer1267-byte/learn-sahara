# Egyptian Learning Hub

Act as an expert Full-Stack Web Developer. Build a comprehensive, modern, and responsive Educational E-Learning Platform inspired by top Egyptian tutor platforms like "khaled-sakr.com". The platform must support RTL (Right-to-Left) direction and fully support the Arabic language.

Tech Stack & UI/UX:

Design Style: Clean, high-performance, dark/light mode toggle, modern dashboard UI, smooth animations, fully responsive for all devices.

Frontend: React/Next.js, Tailwind CSS, Lucide Icons, Shadcn UI components.

Backend/Database: Firebase or Supabase integration (Authentication, Database, Storage).

Key User Roles & Features:

1. Admin / Teacher Panel (Full Management Control):

Video Management: Upload, organize into courses/units, edit, or delete video lessons (support for secure video embedding or custom player).

Quiz & Exam Builder: Create quizzes linked to specific videos/units with multiple-choice questions (MCQs), timer limits, passing grades, and automated scoring.

Student Analytics & Tracking: View a comprehensive student list, monitor individual progress, inspect quiz scores, track watch time, and filter students by grade/course.

Content Access Control: Lock/unlock lessons based on payment status or completed prerequisites.

2. Student Panel:

Dashboard: Overview of enrolled courses, recent activity, upcoming/completed exams, and overall performance stats.

Course Player: Secure video player interface with lesson navigation, downloadable PDF attachments, and a "Mark as Complete" trigger.

Interactive Quiz Portal: Clean interface for taking timed exams with instant results, detailed score breakdown, and answer reviews.

3. Authentication & Security:

Secure Login/Register system (Role-based access: Admin vs Student).

Basic anti-piracy precautions (e.g., dynamic watermark showing student name/phone number over video playback).

Instructions:

Provide the full database schema, key folder structure, and production-ready React components for both the Admin Dashboard and the Student Video/Quiz interface.
Add a Code Redemption System for course activation via pre-generated codes

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://learn-sahara.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d46af27e-377f-470c-acd6-b8f1316d7f4c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
