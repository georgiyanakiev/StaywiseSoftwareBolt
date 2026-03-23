import { useEffect } from 'react';

const sections = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `StayWise is a professional, cloud-based hotel management system designed to streamline every aspect of hotel operations. Built for hotels of all sizes, it provides a centralised platform for managing reservations, rooms, guests, housekeeping, billing, and business analytics — all from a single, intuitive interface.

Key highlights:
• Role-based access control (Admin, Manager, Receptionist, Housekeeping)
• Real-time data synchronisation across all connected devices
• Bilingual interface (English and Bulgarian)
• Fully responsive design for desktop, tablet, and mobile
• Secure, cloud-hosted data via Supabase

Demo credentials for testing:
Email: admin@demo.com
Password: demo123456`,
  },
  {
    id: 'login',
    title: '2. Login & Authentication',
    content: `Accessing the system requires a valid staff account. New accounts can be created by an administrator from the Settings page.

Sign In
• Navigate to the StayWise login page
• Enter your email address and password
• Click "Sign In" to access the system

Sign Up (Admin action)
• Administrators can invite new staff by creating accounts in Settings > Users & Permissions
• Roles assigned at creation determine which features are accessible

Language Selection
• The login screen includes an EN / BG toggle to switch the interface language before signing in

Security
• All sessions are managed securely via Supabase Auth
• Passwords must be at least 6 characters long
• Leaked password protection checks credentials against known breached databases`,
  },
  {
    id: 'dashboard',
    title: '3. Dashboard',
    content: `The Dashboard is the home screen and provides a real-time overview of the hotel's operational status.

Key Metrics (top row)
• Room Status — shows occupied, available, dirty, clean, maintenance, and out-of-service room counts along with the occupancy rate
• Today's Departures — expected checkouts, already completed, total guests departing
• In-House Guests — current occupied room count with adult/children breakdown
• Today's Arrivals — expected check-ins and already completed arrivals

Revenue Summary Cards
• Today's Revenue
• This Week's Revenue
• This Month's Revenue
• Year-to-Date Revenue

Charts
• 7-Day Revenue Trend — area chart showing daily income for the past week
• 14-Day Occupancy Forecast — colour-coded forecast (green = low, blue = medium, amber = high, red = full)

Quick Actions
Buttons for common tasks: New Reservation, Quick Check-In, Housekeeping, View Rooms, Reports.

Recent Activity Feed
A scrollable feed showing the latest operational events across the property.`,
  },
  {
    id: 'reservations',
    title: '4. Reservations',
    content: `The Reservations page is the central hub for managing all guest bookings throughout their full lifecycle.

Reservation List
The table shows: confirmation code, guest name, room, check-in/check-out dates, status, amount, and payment status.

Search & Filters
• Search by guest name or confirmation code
• Filter by status: Pending, Confirmed, Checked In, Checked Out, Cancelled
• Date range filters for check-in or check-out periods

Reservation Status Workflow
  Pending → Confirm → Confirmed → Check In → Checked In → Check Out → Checked Out
Any non-completed reservation can also be Cancelled (with a reason recorded).

Creating a Reservation
1. Click "New Reservation"
2. Select or create a guest
3. Choose room type and specific room
4. Set check-in and check-out dates
5. Enter adult/children count
6. Adjust rate, discount, and payment details if needed
7. Select booking source (Direct, Website, Booking.com, Expedia, Airbnb, Corporate)
8. Add any special requests
9. Click "Save"

A unique confirmation code is automatically generated.

Checkout Automation
When a reservation is checked out, the system automatically:
• Creates an invoice for the guest
• Assigns a high-priority housekeeping cleaning task to the room
• Updates room status to "Dirty"

Conflict Prevention
The system checks for date overlaps and prevents double-booking of the same room.

Pagination
10 reservations are shown per page with navigation controls.`,
  },
  {
    id: 'rooms',
    title: '5. Rooms',
    content: `The Rooms page has two tabs: Rooms Management and Room Types.

Rooms Management Tab

View Modes
• Grid View — card-based layout showing room number, type, status, floor, and nightly rate
• Board View — visual floor-by-floor layout (similar to a kanban board) with colour-coded room status

Room Status Colours
• Green — Available / Clean
• Blue — Occupied
• Amber/Red — Dirty / Being Cleaned
• Grey — Maintenance / Out of Service

Filters
Search by room number or type; filter by status, floor, or room type.

Adding / Editing a Room
Fields: Room number, Floor, Room type, Rate override (optional), Notes.

Room Types Tab
Room types define the template for all rooms of that category.

Room Type Details
• Name and description
• Base nightly rate
• Maximum occupancy
• Bed type (Single, Double, Queen, King, Twin)
• Optional room image URL
• Amenities (choose from 14 options including WiFi, AC, Balcony, Sea View, Mini Bar, Safe, and more)

Managing Room Types
Create, edit, or delete room types. Deleting a type is blocked if rooms are currently assigned to it.`,
  },
  {
    id: 'guests',
    title: '6. Guests',
    content: `The Guests page provides a comprehensive CRM (Customer Relationship Management) module for tracking all guest information and history.

Guest List
Displays: name avatar, email, phone, country, total stays, total spent, VIP status, last visit.

VIP Status Levels
• Regular — standard guests
• Silver — returning loyal guests
• Gold — high-value guests (crown icon)
• Platinum — top-tier guests (crown icon)

Search, Filter & Sort
• Search by name, email, or phone
• Filter by VIP level or country
• Sort by: Newest, Oldest, Name A-Z/Z-A, Most Stays, Highest Spent

Guest Profile Tabs
Each guest has a detailed profile with five tabs:

Profile — Personal info, contact details, address, ID/passport, marketing preferences, and internal notes.

Bookings — Complete reservation history with status, dates, room type, and amounts.

Communications — Log of all emails, SMS, WhatsApp, and phone calls with delivery status.

Documents — Uploaded identity documents (passport, ID card, visa, etc.).

Preferences — Room floor/view/bed-type preferences, dietary restrictions, allergies, special requests, and complaint history.

Adding / Editing Guests
Fields include: title, first/last name, email, phone, mobile, preferred contact method, address, nationality, date of birth, ID number, room preferences, dietary/allergy info, VIP status, and marketing opt-ins.

Send Communication
Staff can send a message to a guest (email, SMS, WhatsApp, or phone note) directly from the guest profile. All communications are logged.

Export
Export the full guest list to a CSV file for external use.`,
  },
  {
    id: 'housekeeping',
    title: '7. Housekeeping',
    content: `The Housekeeping page manages all cleaning and maintenance operations.

Dashboard Statistics
Four metric cards show: Pending tasks, In-Progress tasks, Completed today, and Total dirty rooms.

Task Views
• Task List (Table) — shows room, task type, priority, assigned staff, status, and notes
• Room Status Board — visual floor grid with colour-coded room status buttons

Task Types
• Clean — standard room cleaning (8 checklist items)
• Deep Clean — thorough cleaning (11 checklist items)
• Linen Change — bed and towel refresh (5 items)
• Restock — replenish amenities (5 items)
• Inspection — quality assurance check (6 items)

Priority Levels
Low, Normal, High, Urgent — colour-coded badges for quick visual identification.

Task Checklist
Each task has a step-by-step interactive checklist. Staff check off items as they complete them. The "Complete Task" button only activates when all items are ticked. Completing a task automatically updates the room status to "Clean."

Filters
Filter tasks by assigned staff, status, priority, or task type.

Maintenance Requests
A collapsible section for logging and tracking maintenance issues:
• Fields: room, description, priority, assigned staff
• Workflow: Reported → In Progress → Completed

Staff Performance
A modal showing a performance table for all housekeeping staff with completed count, in-progress, pending, and completion rate percentage.

Adding Tasks
Click "Add Task" to assign a new cleaning or inspection task to a room and staff member.`,
  },
  {
    id: 'billing',
    title: '8. Billing',
    content: `The Billing page handles all financial transactions, invoices, and payment tracking.

Financial Overview Cards
• Total Revenue — sum of all payments received
• Outstanding Balance — total amount still owed
• Paid Invoices — count of fully settled invoices
• Overdue Invoices — invoices past their due date

Invoice List
Table shows: invoice number, guest name, issue date, due date, total, amount paid, balance due, and status.

Invoice Status Flow
  Draft → Sent → Paid
  (or Cancelled / Overdue if past due date without full payment)

Creating an Invoice
1. Click "New Invoice"
2. Select a guest and optionally link a reservation
3. Set issue date and due date
4. Add line items (description, category, quantity, unit price)
5. Apply a discount if applicable
6. Tax is calculated automatically from hotel settings
7. Add payment notes
8. Save as Draft or Send directly

Line Item Categories
Room, Food & Beverage, Spa, Laundry, Parking, Other.

Recording Payments
Click "Record Payment" on any invoice to log a payment:
• Enter amount paid (up to the balance due)
• Select payment method: Cash, Credit/Debit Card, Bank Transfer, Cheque, Other
• Add reference notes (e.g. transaction ID)

Invoice status updates automatically to "Partial" or "Paid" based on the amount recorded.

Payment History
View a full payment log for any invoice showing dates, amounts, methods, and who processed them.

PDF Generation
Any invoice can be rendered as a print-ready PDF directly in the browser, formatted with hotel header, guest details, line items, and totals.

Search & Filters
Search by invoice number or guest name; filter by status; set date range filters.`,
  },
  {
    id: 'reports',
    title: '9. Reports',
    content: `The Reports page provides seven categories of business intelligence with charts, tables, and export options.

Date Range Controls
Set a custom date range or click "Last 30 Days" for a quick view. All reports update dynamically.

1. Occupancy Reports
• Average occupancy rate and length of stay
• RevPAR (Revenue Per Available Room)
• Line chart: occupancy rate over time
• Bar chart: occupancy by room type
• Room utilisation table

2. Revenue Reports
• Total revenue, ADR (Average Daily Rate), RevPAR
• Bar chart: monthly revenue trends
• Pie chart: revenue by payment method
• Table: top revenue-generating rooms

3. Guest Reports
• Total guests, VIP breakdown (Silver, Gold, Platinum)
• New vs. returning guests chart
• Top spenders table
• Guests by country chart

4. Booking Sources
• Total bookings, direct booking percentage, commission costs
• Pie chart: distribution by source (Direct, Website, Booking.com, Expedia, Airbnb, Corporate)
• Revenue breakdown per source

5. Housekeeping Reports
• Tasks completed, in-progress, and pending
• Daily task completion bar chart
• Staff performance table with completion rates

6. Financial Reports
• Revenue, expenses (estimated at 35% of revenue), net income
• Revenue vs. expenses comparison chart (6 months)
• Payment method breakdown pie chart

7. Cancellations Report
• Total cancellations, cancellation rate, lost revenue
• Average days before check-in when cancelled
• Cancellations over time line chart
• Recent cancellations table with reasons

Export Options
• Export CSV — downloads the active report tab as a formatted spreadsheet
• Print — opens the browser print dialog for the current report view`,
  },
  {
    id: 'settings',
    title: '10. Settings',
    content: `The Settings page allows authorised staff to configure all aspects of the hotel system. It is organised into eight tabs.

1. Hotel Settings
Configure the hotel's basic profile: name, star rating, address, city, country, phone, email, website, check-in/check-out times, currency, timezone, cancellation policy, and payment policy.

2. Room Types
Add, edit, or remove room type templates. Fields: name, description, base rate, max occupancy, amenities.

3. Tax Configuration
Set tax rates (%) for:
• Standard tax / hotel tax
• VAT / GST
• City tax
• Service charge
The combined total rate is displayed. An option for tax-inclusive pricing is also available.

4. Users & Permissions (Admin only)
Manage all staff accounts:
• Add new staff with name, email, phone, and role
• Roles: Admin (full access), Manager (all operations), Receptionist (bookings and check-in/out), Housekeeping (tasks only)
• Deactivate or re-activate accounts as needed

5. Email Templates
Customise the content of automated emails:
• Booking Confirmation
• Check-in Reminder
• Thank You (post-stay)
Template variables such as {guest_name}, {room_number}, {check_in_date} are supported.

6. Payment Settings (Admin only)
• Enable/disable accepted payment methods (Credit Card, Debit Card, Cash, Bank Transfer)
• Configure deposit requirements and deposit percentage
• Toggle Stripe online payment integration (test mode)

7. Notifications
Toggle email, SMS, and in-app notifications for events:
• New bookings
• Check-in / check-out reminders
• Payment received alerts
• Housekeeping task assignments

8. Preferences
Personalise the interface:
• Language (8 languages including English, Spanish, French, German, etc.)
• Date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY)
• Time format (12-hour or 24-hour)
• First day of week
• Theme (Light, Dark, Auto/System)`,
  },
  {
    id: 'roles',
    title: '11. Roles & Permissions',
    content: `StayWise uses four staff roles to control access to features.

Admin
Full system access including user management, payment settings, tax configuration, and all operational modules.

Manager
Access to all operational modules: reservations, rooms, guests, housekeeping, billing, and reports. Cannot manage users or system-level settings.

Receptionist
Access to reservations (create, confirm, check-in, check-out), guest profiles, and basic reporting. Cannot access housekeeping management or billing settings.

Housekeeping
Can view and update housekeeping tasks and room status only. No access to guest data, billing, or reports.

Role Assignment
Roles are assigned when a staff account is created in Settings > Users & Permissions. Only Admins can change roles.`,
  },
  {
    id: 'tips',
    title: '12. Tips & Best Practices',
    content: `Daily Operations Checklist
• Check the Dashboard each morning for arrivals, departures, and room status
• Use the Arrivals tile to quickly confirm expected check-ins
• Review the Activity Feed for overnight events and any issues

Reservations
• Always link a reservation to an existing guest profile to maintain accurate stay history
• Use the "Special Requests" field to capture guest preferences at booking time
• Set the booking source correctly to track channel performance in Reports

Housekeeping
• Assign tasks to specific staff members for accountability
• Use the checklist feature to ensure consistent cleaning standards
• Check the Room Status Board for a quick visual of floor-by-floor readiness

Billing
• Generate invoices immediately after checkout to minimise outstanding balances
• Use line item categories consistently (Room, Food, Spa, etc.) for accurate financial reports
• Record partial payments as they arrive — the system will automatically update invoice status

Guests
• Update VIP status when guests reach loyalty milestones
• Log all communications in the guest profile for a complete interaction history
• Use the preferences tab to prepare the room before arrival (floor, view, bed type)

Reports
• Run the Revenue Report at month-end to compare ADR and RevPAR against targets
• Use the Booking Sources report to evaluate OTA commission costs vs. direct bookings
• Export CSV reports for use in external accounting or business intelligence tools

Settings
• Review and update email templates seasonally or for special promotions
• Keep tax rates current to ensure invoices are accurate
• Deactivate staff accounts immediately when an employee leaves`,
  },
  {
    id: 'glossary',
    title: '13. Glossary',
    content: `ADR (Average Daily Rate) — Total room revenue divided by the number of rooms sold. Indicates the average price achieved per occupied room.

RevPAR (Revenue Per Available Room) — Total room revenue divided by total available rooms. A key performance metric combining both occupancy and rate.

OTA (Online Travel Agency) — Third-party booking platforms such as Booking.com, Expedia, or Airbnb.

Occupancy Rate — The percentage of available rooms that are occupied during a given period.

Check-In — The process of welcoming an arriving guest and assigning them their room.

Check-Out — The process of a guest departing and settling their bill.

Confirmation Code — A unique reference number automatically assigned to each reservation (e.g. SW-2024-0001).

VIP Status — A loyalty classification (Regular, Silver, Gold, Platinum) used to recognise and prioritise valued guests.

Invoice — A financial document sent to a guest itemising all charges for their stay and additional services.

RLS (Row Level Security) — A database security feature ensuring each user can only access data they are authorised to see.

RevPAR Index — A comparison of a hotel's RevPAR against a competitive set benchmark (not calculated within StayWise but useful for context).

Dirty Room — A room that has been vacated and requires cleaning before it can be assigned to a new guest.

Checklist — A structured list of tasks within a housekeeping job, used to ensure quality and consistency.`,
  },
];

export default function GuidePage() {
  useEffect(() => {
    document.title = 'StayWise Software — User Guide';
  }, []);

  return (
    <div className="guide-root" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a2e', background: '#fff' }}>
      <style>{`
        @page {
          size: A4;
          margin: 18mm 16mm 18mm 16mm;
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        .guide-root { width: 100%; max-width: 820px; margin: 0 auto; padding: 0 24px 48px; }

        /* Cover */
        .cover {
          page-break-after: always;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          text-align: center;
          padding: 48px 24px;
        }
        .cover-logo { width: 72px; height: 72px; background: #1e3a5f; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .cover-logo svg { width: 40px; height: 40px; fill: none; stroke: #fff; stroke-width: 2; }
        .cover-brand { font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: #1e3a5f; font-family: Arial, sans-serif; font-weight: 700; margin-bottom: 8px; }
        .cover-title { font-size: 42px; font-weight: 700; color: #1a1a2e; line-height: 1.15; margin: 0 0 16px; }
        .cover-subtitle { font-size: 18px; color: #4a5568; margin-bottom: 48px; font-style: italic; }
        .cover-divider { width: 80px; height: 3px; background: #1e3a5f; margin: 0 auto 48px; border-radius: 2px; }
        .cover-meta { font-size: 13px; color: #718096; font-family: Arial, sans-serif; line-height: 1.8; }
        .cover-version { display: inline-block; background: #edf2f7; color: #4a5568; font-size: 12px; font-family: Arial, sans-serif; padding: 4px 14px; border-radius: 999px; margin-top: 24px; }

        /* TOC */
        .toc-page { page-break-after: always; padding: 48px 0; }
        .toc-heading { font-size: 28px; font-weight: 700; color: #1a1a2e; margin-bottom: 32px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; font-family: Arial, sans-serif; }
        .toc-list { list-style: none; margin: 0; padding: 0; }
        .toc-item { display: flex; align-items: center; padding: 9px 0; border-bottom: 1px dotted #e2e8f0; font-family: Arial, sans-serif; font-size: 14px; }
        .toc-num { font-weight: 700; color: #1e3a5f; width: 28px; flex-shrink: 0; }
        .toc-label { flex: 1; color: #2d3748; }
        .toc-dots { flex: 1; border-bottom: 1px dotted #cbd5e0; margin: 0 10px; }

        /* Section */
        .section { page-break-before: always; padding: 48px 0 24px; }
        .section:first-of-type { page-break-before: auto; }
        .section-header { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; padding-bottom: 14px; border-bottom: 2px solid #1e3a5f; }
        .section-num { background: #1e3a5f; color: #fff; font-size: 13px; font-family: Arial, sans-serif; font-weight: 700; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .section-title { font-size: 22px; font-weight: 700; color: #1a1a2e; font-family: Arial, sans-serif; margin: 0; }
        .section-body { font-size: 13.5px; line-height: 1.75; color: #2d3748; white-space: pre-wrap; }

        /* Screen-only print button */
        .print-bar {
          position: fixed; top: 0; left: 0; right: 0;
          background: #1e3a5f; color: #fff;
          display: flex; align-items: center; justify-content: center; gap: 16px;
          padding: 12px 24px;
          font-family: Arial, sans-serif; font-size: 14px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.25);
          z-index: 9999;
        }
        .print-bar-text { color: #cbd5e0; }
        .print-btn {
          background: #fff; color: #1e3a5f;
          border: none; border-radius: 6px;
          padding: 8px 20px; font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: Arial, sans-serif;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .print-btn:hover { background: #edf2f7; }
        .guide-root { padding-top: 60px; }

        @media print {
          .print-bar { display: none !important; }
          .section { page-break-before: always; }
          .cover { page-break-after: always; }
          .toc-page { page-break-after: always; }
        }
      `}</style>

      <div className="print-bar">
        <span className="print-bar-text">To download this guide as a PDF:</span>
        <button className="print-btn" onClick={() => window.print()}>Open Print / Save as PDF</button>
        <span className="print-bar-text">then choose <strong style={{color:'#fff'}}>"Save as PDF"</strong> as the destination</span>
      </div>

      {/* COVER */}
      <div className="cover">
        <div className="cover-logo">
          <svg viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 9l10-7 10 7v11a2 2 0 01-2 2H4a2 2 0 01-2-2V9z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10"/>
          </svg>
        </div>
        <div className="cover-brand">StayWise Software</div>
        <h1 className="cover-title">Complete User Guide</h1>
        <div className="cover-subtitle">Hotel Management System — Full Feature Reference</div>
        <div className="cover-divider" />
        <div className="cover-meta">
          A comprehensive guide to all features and modules<br />
          of the StayWise hotel management platform.<br />
          For use by hotel staff at all levels.
        </div>
        <div className="cover-version">Version 1.0 &nbsp;·&nbsp; March 2026</div>
      </div>

      {/* TABLE OF CONTENTS */}
      <div className="toc-page">
        <div className="toc-heading">Table of Contents</div>
        <ul className="toc-list">
          {sections.map((s, i) => (
            <li key={s.id} className="toc-item">
              <span className="toc-num">{i + 1}.</span>
              <span className="toc-label">{s.title.replace(/^\d+\.\s*/, '')}</span>
              <span className="toc-dots" />
            </li>
          ))}
        </ul>
      </div>

      {/* SECTIONS */}
      {sections.map((s) => {
        const numMatch = s.title.match(/^(\d+)\.\s*(.*)/);
        const num = numMatch ? numMatch[1] : '';
        const label = numMatch ? numMatch[2] : s.title;
        return (
          <div key={s.id} className="section">
            <div className="section-header">
              <div className="section-num">{num}</div>
              <h2 className="section-title">{label}</h2>
            </div>
            <div className="section-body">{s.content}</div>
          </div>
        );
      })}
    </div>
  );
}
