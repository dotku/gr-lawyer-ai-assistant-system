# Intake Demo Features

## Overview
The Intake Demo is a fully interactive demonstration of the OrdoLex Intake Inbox system. All data is stored in local component state and will reset on page refresh.

## Access
Navigate to: **http://localhost:3000/en/demo-intake**

## Demo Data
The demo includes 3 sample intakes:
1. **John Smith** (NEW) - Family Law case with initial consultation scheduled
2. **Sarah Johnson** (PROCESSING) - Corporate Law, business contract review
3. **Michael Brown** (NEED_REVIEW) - Real Estate matter

## Features You Can Test

### Left Sidebar
- **Search**: Filter intakes by client name or intake number
- **Status Filters**: View intakes by status (All, New, Processing, Need Review, Sent, Archived)
- **Intake Cards**: Click any intake to view details
- **New Button**: Opens dialog to create a new intake
  - Required fields: Client Name, Client Email
  - Optional fields: Client Phone, Legal Category
  - Auto-generates intake number (INT-YYYYMM-XXXX format)
  - Press Enter in any field to submit (when required fields are filled)
  - Newly created intake appears at top of list and is automatically selected

### Right Detail Panel

#### Client Information
- View client name, email, and phone number
- See intake number, status, category, and tags
- View share settings

#### Schedule Section
- **View existing meetings** with date, time, and Zoom links
- **Add new meetings**:
  - Enter meeting title
  - Select date and time
  - Optional meeting link (detects Zoom automatically)
  - Press Enter in the meeting link field to submit
  - Button is disabled until required fields are filled

#### Notices Section
- **View all notices** with star indicator for important items
- **Toggle starred status** by clicking the star icon (hover to see icon highlight)
- **Add new notices**:
  - Enter notice text
  - Press Cmd/Ctrl+Enter to submit
  - Button is disabled until text is entered

#### Questions Section
- **View questions** with answers
- **Add answers** to unanswered questions:
  - Click "Add Answer" button
  - Type answer and press Enter or click "Save Answer"
  - Cancel to abort
- **Add new questions**:
  - Enter question text
  - Press Enter to submit
  - Button is disabled until text is entered

#### Notes Section
- **View all notes** with author and timestamp
- **Add new notes**:
  - Enter note content
  - Press Cmd/Ctrl+Enter to submit
  - Button is disabled until text is entered
  - Notes appear newest first

#### Auto Summarization
- **Generate AI summary** of the intake
- Currently uses mock data (ready for OpenAI integration)
- Click "Regenerate" to update existing summary

#### Actions
- **Create Matter**: Converts intake to a case (shows alert in demo)
  - Button is disabled after conversion
  - Status changes to "CONVERTED"
- **Request Info**: Placeholder for email client request
- **Draft Confirmation Email**: Placeholder for email composer
- **Send Document List**: Placeholder for document checklist

## Status Badge Colors
- **NEW**: Blue (default variant)
- **PROCESSING**: Gray (secondary variant)
- **NEED_REVIEW**: Red (destructive variant)
- **CONVERTED**: Blue (default variant)

## Keyboard Shortcuts
- **Enter**: Submit in single-line inputs (meeting link, question field)
- **Cmd/Ctrl+Enter**: Submit in multi-line inputs (notices, notes)
- **Escape** (future): Close detail panel

## Empty States
Each section displays a helpful message when no items exist:
- "No meetings scheduled yet"
- "No notices yet"
- "No questions yet"
- "No notes yet"
- "No summary generated yet"
- "No intakes match your search" (when search returns no results)
- "No intakes in this category" (when filter returns no results)

## Responsive Design
- **Desktop**: Full sidebar + detail panel layout
- **Mobile**: Stacked layout with collapsible sections
- Demo banner shows abbreviated text on mobile

## Technical Implementation
- **State Management**: React useState hooks
- **Type Safety**: Full TypeScript interfaces for all mock data
- **Form Validation**: Disabled submit buttons when required fields are empty
- **Interactive Elements**: Hover effects, clickable stars, auto-focus inputs
- **Real-time Updates**: All changes immediately reflected in both sidebar and detail views

## Next Steps
To convert this to a production version:
1. Connect to database via Prisma (already configured)
2. Replace mock data with server actions (already implemented in `/src/app/actions/intake.ts`)
3. Add authentication (middleware already configured)
4. Integrate OpenAI API for real summarization
5. Add file upload for question attachments
6. Implement email composer integration
7. Add real-time collaboration features
