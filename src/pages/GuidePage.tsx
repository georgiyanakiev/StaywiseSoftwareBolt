import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useHotelNavigate } from '../hooks/useHotelPath';

const sections = [
  {
    id: 'overview',
    title: '1. Overview',
    content: `StayWise is a professional, cloud-based Property Management System (PMS) designed to streamline every aspect of hotel operations. Built for hotels of all sizes, it provides a centralized platform for managing reservations, rooms, guests, housekeeping, maintenance, billing, channel distribution, and business intelligence — all from a single intuitive interface.

Key Capabilities:
• Role-based access control (Owner, Admin, Manager, Front Desk, Housekeeping)
• Real-time data synchronization across all connected devices
• Bilingual interface (English and Bulgarian)
• Fully responsive design for desktop, tablet, and mobile
• Secure cloud data powered by Supabase
• Path-based multi-property routing (staywisesoftwarepms.com/h/<slug>/…)
• Integrated channel management, booking engine, and payment automation

Demo Credentials for Testing:
Email: admin@demo.com
Password: demo123456`,
  },
  {
    id: 'login',
    title: '2. Login & Authentication',
    content: `Access to the system requires a valid staff account. New accounts can be created by an administrator from the Settings page.

Signing In
• Navigate to the StayWise login page
• Choose your login method: Email, Phone, or Google
• Enter your credentials and click "Sign In"
• Select your property from the lobby to enter the management interface

Registration (Admin Action)
• Administrators can invite new staff by creating accounts in Settings > Staff Management
• Roles assigned at creation determine which features are accessible

Hotel Lobby
After authentication, users land in the Hotel Lobby where all assigned properties are listed. Click "Enter" on any property to access its management dashboard. The URL changes to /h/<hotel-slug>/ reflecting the active property.

Language Selection
• The login screen includes an EN / BG toggle to switch the interface language before signing in

Security
• All sessions are managed securely via Supabase Auth
• Passwords must be at least 6 characters
• Session tokens are stored securely and refreshed automatically`,
  },
  {
    id: 'dashboard',
    title: '3. Dashboard',
    content: `The Dashboard is the home screen and provides a real-time overview of hotel operational status.

Key Metrics (Top Row)
• Room Status — shows counts of occupied, available, dirty, clean, under maintenance, and out-of-service rooms, plus the occupancy rate
• Departures Today — expected departures, already completed, total guests leaving
• Guests In-House — current number of occupied rooms with adult/child breakdown
• Arrivals Today — expected check-ins and already completed arrivals

Revenue Summary Cards
• Revenue Today
• Revenue This Week
• Revenue This Month
• Revenue Year-to-Date

Charts
• 7-Day Revenue Trend — area chart showing daily income over the past week
• 14-Day Occupancy Forecast — color-coded forecast (green = low, blue = medium, amber = high, red = full)

Quick Actions
Buttons for common tasks: New Reservation, Quick Check-In, Housekeeping, View Rooms, Reports.

Recent Activity Feed
Scrollable panel showing the most recent operational events at the hotel.`,
  },
  {
    id: 'front-desk',
    title: '4. Front Desk',
    content: `The Front Desk module is a streamlined operational hub designed for reception staff to handle day-to-day check-in and check-out workflows efficiently.

Today's Overview
• Arrivals panel — lists all guests expected to arrive today with reservation details, room assignment, and a one-click "Check In" action
• Departures panel — lists all guests departing today with outstanding balance, room number, and a one-click "Check Out" action
• In-House panel — quick view of all currently checked-in guests

Quick Actions
• Walk-in check-in — register a guest without a prior reservation
• Room swap — move a checked-in guest to a different room
• Extend stay — modify departure date for a current guest
• Early check-out — process departure before scheduled date

Room Availability Glance
A compact visual grid showing room availability for today and the next few days, color-coded by status.

Notes & Alerts
Flagged reservations (VIP arrivals, special requests, payment issues) appear as highlighted cards at the top of the view for immediate attention.`,
  },
  {
    id: 'reservations',
    title: '5. Reservations',
    content: `The Reservations page is the central hub for managing all guest bookings throughout their lifecycle.

Reservation List
The table displays: confirmation code, guest name, room, check-in/check-out dates, status, amount, and payment status.

Search & Filters
• Search by guest name or confirmation code
• Filter by status: Pending, Confirmed, Checked In, Checked Out, Cancelled
• Date range filters for check-in or check-out periods

Reservation Status Workflow
  Pending → Confirm → Confirmed → Check In → Checked In → Check Out → Checked Out
Any incomplete reservation can be cancelled (with reason recorded).

Creating a Reservation
1. Click "New Reservation"
2. Select or create a guest
3. Choose room type and specific room
4. Set check-in and check-out dates
5. Enter adult/child count
6. Adjust rate, discount, and payment details if needed
7. Select booking source (Direct, Website, Booking.com, Expedia, Airbnb, Corporate)
8. Add any special requests
9. Click "Save"

A unique confirmation code is generated automatically.

Checkout Automation
When a reservation is checked out, the system automatically:
• Creates a guest invoice
• Assigns a high-priority housekeeping cleaning task to the room
• Updates the room status to "Dirty"

Conflict Prevention
The system checks for date overlaps and prevents double-booking the same room.

Pagination
10 reservations are shown per page with navigation controls.`,
  },
  {
    id: 'rooms',
    title: '6. Rooms',
    content: `The Rooms page has two tabs: Room Management and Room Types.

Room Management Tab

View Modes
• Grid View — card-based layout showing room number, type, status, floor, and nightly rate
• Floor View — visual floor-based layout (kanban-like) with color-coded room status tiles

Room Status Colors
• Green — Available / Clean
• Blue — Occupied
• Amber/Red — Dirty / Being cleaned
• Gray — Under Maintenance / Out of Service

Filters
Search by room number or type; filter by status, floor, or room type.

Adding / Editing a Room
Fields: Room Number, Floor, Room Type, Rate Override (optional), Notes.

Room Types Tab
Room types define the template for all rooms in that category.

Room Type Details
• Name and description
• Base nightly rate
• Maximum occupancy
• Bed type (Single, Double, Queen, King, Twin)
• Optional room photo URL
• Amenities (select from 14+ options including WiFi, AC, Balcony, Sea View, Mini Bar, Safe, and more)

Managing Room Types
Create, edit, or delete room types. Deleting a type is blocked if rooms are currently assigned to it.`,
  },
  {
    id: 'guests',
    title: '7. Guests & CRM',
    content: `The Guests page provides a comprehensive CRM (Customer Relationship Management) module for tracking all guest information and history.

Guest List
Displays: name avatar, email, phone, country, total stays, total spent, VIP status, last visit.

VIP Status Levels
• Regular — standard guests
• Silver — returning loyal guests
• Gold — high-value guests (crown icon)
• Platinum — premium-tier guests (crown icon)

Search, Filter & Sort
• Search by name, email, or phone
• Filter by VIP level or country
• Sort by: Newest, Oldest, Name A-Z/Z-A, Most Stays, Highest Spent

Guest Profile Tabs
Each guest has a detailed profile with five tabs:

Profile — Personal information, contact details, address, ID/passport, marketing preferences, and internal notes.

Reservations — Full booking history with status, dates, room type, and amounts.

Communications — Log of all emails, SMS, WhatsApp, and phone calls with delivery status.

Documents — Uploaded identity documents (passport, ID card, visa, etc.).

Preferences — Room floor/view/bed type preferences, dietary restrictions, allergies, special requests, and complaint history.

Adding / Editing Guests
Fields include: title, first/last name, email, phone, mobile, preferred contact method, address, nationality, date of birth, document number, room preferences, dietary/allergy info, VIP status, and marketing opt-in management.

Sending Communications
Staff can send a message to a guest (email, SMS, WhatsApp, or phone note) directly from the guest profile. All communications are logged.

Export
Export the full guest list to a CSV file for external needs.`,
  },
  {
    id: 'housekeeping',
    title: '8. Housekeeping',
    content: `The Housekeeping page manages all cleaning operations and task assignments.

Dashboard Statistics
Four metric cards show: Pending Tasks, In-Progress Tasks, Completed Today, and Total Dirty Rooms.

Task Views
• Task List (Table) — shows room, task type, priority, assigned staff, status, and notes
• Room Status Board — visual floor-based grid with color-coded room status buttons

Task Types
• Cleaning — standard room turnover (8-item checklist)
• Deep Cleaning — thorough cleaning (11-item checklist)
• Linen Change — bed and towel refresh (5 items)
• Restock — amenity replenishment (5 items)
• Inspection — quality control check (6 items)

Priority Levels
Low, Normal, High, Urgent — color-coded badges for quick visual identification.

Task Checklist
Each task has an interactive step-by-step checklist. Staff checks off items as they complete them. The "Complete Task" button activates only when all items are checked. Completing a task automatically updates the room status to "Clean".

Filters
Filter tasks by assigned staff, status, priority, or task type.

Staff Performance
A modal showing a performance table for all housekeeping staff with completed, in-progress, pending counts, and completion percentage.

Adding Tasks
Click "Add Task" to assign a new cleaning or inspection task to a room and staff member.`,
  },
  {
    id: 'maintenance',
    title: '9. Maintenance',
    content: `The Maintenance module tracks repair requests, preventive maintenance schedules, and equipment issues across the property.

Maintenance Requests
• Log new maintenance issues with: room/location, description, category (Plumbing, Electrical, HVAC, Furniture, Other), priority, and photos
• Assign requests to maintenance staff members
• Track workflow: Reported → In Progress → Completed

Priority Levels
Low, Normal, High, Urgent — each with distinct color coding for quick triage.

Dashboard View
• Open Requests — total unresolved issues
• In Progress — currently being worked on
• Completed Today — resolved issues for the day
• Average Resolution Time — performance metric

Preventive Maintenance
Schedule recurring maintenance tasks (e.g., HVAC filter changes, plumbing inspections) with due dates and auto-assignment.

Room Impact
When a maintenance request marks a room as "Out of Service", the room is automatically blocked from new reservations until the issue is resolved and the room status is restored.

History
Full audit trail of all maintenance activities per room, including timestamps, staff notes, and resolution details.`,
  },
  {
    id: 'channel-manager',
    title: '10. Channel Manager',
    content: `The Channel Manager provides centralized control over room distribution across multiple Online Travel Agencies (OTAs) and booking platforms.

Connected Channels
• Booking.com
• Expedia
• Airbnb
• Direct Website (Booking Engine)
• Additional integrations: Cloudbeds, SiteMinder, Lodgify

Rate Management
• Set base rates per room type per channel
• Apply channel-specific markups or discounts
• Bulk rate updates across all connected channels simultaneously

Availability Sync
• Real-time inventory synchronization prevents overbooking
• When a room is booked on any channel, availability updates across all platforms automatically
• Manual overrides available for blocking rooms on specific channels

Restrictions & Rules
• Minimum/maximum length of stay per channel
• Closed-to-arrival or closed-to-departure dates
• Stop-sell controls per room type

Performance Analytics
• Bookings by channel (pie chart)
• Revenue by channel comparison
• Commission costs per OTA
• Channel contribution trends over time

Integration Pages
Each connected OTA has a dedicated settings page for:
• API credentials and connection status
• Sync frequency configuration
• Mapping room types to channel-specific categories
• Rate plan assignment`,
  },
  {
    id: 'booking-engine',
    title: '11. Booking Engine',
    content: `The Booking Engine is a direct booking solution embedded in the hotel's website, allowing guests to book rooms without going through third-party platforms.

Features
• Customizable widget that matches hotel branding (colors, logo, fonts)
• Mobile-responsive design for guests booking on any device
• Real-time availability display pulled directly from the PMS
• Secure payment processing at time of booking
• Automatic confirmation emails sent to guests

Configuration
• Set booking engine URL and embed code
• Customize colors and branding to match hotel website
• Configure accepted payment methods
• Set cancellation policy display
• Enable/disable promotional codes

Rate Plans
• Standard Rate — default public rate
• Early Bird — discounted rate for advance bookings
• Last Minute — special rates for same-day or next-day availability
• Package rates — bundled offers (room + breakfast, room + spa, etc.)

Commission Savings
Direct bookings through the engine carry zero OTA commission, significantly improving profit margins compared to third-party channels. The Reports module tracks direct vs. OTA booking ratios.`,
  },
  {
    id: 'dynamic-pricing',
    title: '12. Dynamic Pricing',
    content: `The Dynamic Pricing module uses demand-based algorithms to automatically adjust room rates for maximum revenue.

Pricing Strategies
• Occupancy-based — rates increase as occupancy rises (configurable thresholds)
• Demand forecasting — adjusts rates based on historical booking patterns and seasonal trends
• Day-of-week — different pricing for weekdays vs. weekends
• Event-based — spike pricing during local events or peak seasons

Configuration
• Set minimum and maximum rate boundaries per room type
• Define occupancy thresholds that trigger rate adjustments
• Configure percentage increases/decreases at each threshold level
• Set lead-time rules (rates can differ based on how far in advance the booking is made)

Rate Calendar
Visual calendar view showing:
• Current dynamic rate per room type per day
• Color-coded pricing levels (green = base, amber = elevated, red = peak)
• Manual override capability for specific dates

Competitor Monitoring
• Track competitor rates (manual input or integration)
• Rate positioning recommendations based on market data

Revenue Impact
Dashboard showing revenue uplift from dynamic pricing vs. flat-rate scenarios, with before/after comparisons.`,
  },
  {
    id: 'upselling',
    title: '13. Upselling',
    content: `The Upselling module helps hotels increase revenue per guest by offering add-on services and room upgrades throughout the guest journey.

Available Upsell Categories
• Room upgrades — offer a higher-category room at a discounted premium
• Early check-in / Late check-out — flexible arrival and departure times
• Breakfast packages — meal plan add-ons
• Parking — on-site parking reservations
• Spa & wellness — treatments and access passes
• Airport transfers — shuttle service bookings
• Custom services — hotel-defined offerings

Upsell Triggers
• Pre-arrival email — sent automatically before check-in with personalized offers
• Digital check-in flow — upsell options presented during online registration
• Front desk prompt — staff-facing suggestions shown during check-in
• In-stay offers — services available through the Guest Portal

Performance Tracking
• Conversion rate per upsell type
• Revenue generated from upsells
• Most popular add-ons
• Guest acceptance patterns

Configuration
• Enable/disable individual upsell options
• Set pricing and descriptions for each service
• Configure display timing and channels
• Customize messaging per offer type`,
  },
  {
    id: 'guest-portal',
    title: '14. Guest Portal & Digital Check-In',
    content: `The Guest Portal allows guests to complete their arrival process remotely before or upon arrival through a secure online portal. This streamlines front desk operations and improves guest experience.

Digital Check-In Flow
1. Guest receives a unique check-in link via email (sent automatically or manually by staff)
2. Guest accesses the secure portal with a time-limited token
3. Guest completes a multi-step form:
   - Step 1: ID document upload and details
   - Step 2: Preferences and special requests
   - Step 3: Digital signature and terms acceptance
   - Step 4: Review upsell options and optional purchases
   - Step 5: Confirmation and receipt
4. Data is stored securely and linked to the guest profile

Dashboard Statistics
• Arrivals Today & Tomorrow — guests expected in the next 48 hours
• Links Sent — number of distributed check-in invitations
• Completed Forms — guests who have finished digital check-in
• Pending Check-Ins — guests who haven't yet submitted their form

Management Tabs
1. Pending Check-Ins — list of upcoming arrivals with portal status (Not Sent, Link Sent, Partial, Completed) and action buttons
2. Completed Submissions — all guests who finished check-in, with step completion tracker and review button
3. Settings — configure the check-in experience

Settings Configuration
• Data Collection Fields — toggle ID details, preferences, digital signature
• Upsell Options — configure services shown after check-in (late checkout, breakfast, parking) with descriptions and pricing
• Auto-Send — schedule automatic link delivery (1-14 days before arrival)
• Terms & Conditions — customize legal text with variables like {hotel_name}, {check_in_time}, {check_out_time}

QR Code Access
Generate QR codes for rooms or common areas that guests can scan to access the portal, submit requests, or view hotel information.`,
  },
  {
    id: 'owner-portal',
    title: '15. Owner Portal (Super Admin)',
    content: `The Owner Portal provides property owners and super administrators with a high-level management interface for multi-property oversight.

Tenant Management
• View all registered properties in the system
• Access any property's dashboard directly (opens in new tab via /h/<slug>/)
• Monitor subscription plans and billing status per property
• Enable/disable properties

Property Overview
• Occupancy rates across all properties
• Revenue summaries per property
• Staff counts and role distributions
• System usage statistics

Configuration
• Manage global system settings
• Brand customization (logo, primary color) per tenant
• Plan and feature tier management
• API key and integration oversight

Access Control
Only users with the "owner" or "super_admin" role can access this portal. It is separated from individual property management to prevent accidental cross-property data access.`,
  },
  {
    id: 'payment-automation',
    title: '16. Payment Automation',
    content: `The Payment Automation module streamlines financial operations by automating payment collection, reminders, and reconciliation.

Supported Payment Methods
• Credit/Debit Card (via Stripe integration)
• Bank Transfer
• Cash
• Digital wallets

Automated Workflows
• Pre-authorization — automatically hold card funds at booking confirmation
• Deposit collection — charge configured percentage at time of booking
• Balance charge — automatically process remaining balance at check-in or check-out
• No-show fees — charge cancellation fees for missed reservations

Payment Rules Engine
• Configure rules based on booking source, room type, or guest VIP level
• Set different deposit percentages for direct vs. OTA bookings
• Define refund policies per cancellation window

Reconciliation
• Daily payment reconciliation dashboard
• Match incoming bank transfers to outstanding invoices
• Flag discrepancies for manual review
• Export reconciliation reports

Security
• PCI-compliant payment processing via Stripe
• Tokenized card storage (no card numbers stored locally)
• Audit trail for all payment operations`,
  },
  {
    id: 'invoicing',
    title: '17. Invoicing',
    content: `The Invoicing module manages all financial documents, from draft creation through payment collection.

Financial Overview Cards
• Total Revenue — sum of all received payments
• Outstanding Balance — total amount still owed
• Paid Invoices — count of fully settled invoices
• Overdue Invoices — invoices past their due date

Invoice Status Workflow
  Draft → Sent → Paid
  (or Cancelled / Overdue if due date passes without full payment)

Creating an Invoice
1. Click "New Invoice"
2. Select a guest and optionally link a reservation
3. Set issue date and due date
4. Add line items (description, category, quantity, unit price)
5. Apply discount if applicable
6. Tax is auto-calculated from hotel settings
7. Add payment notes
8. Save as Draft or Send directly

Line Item Categories
Room, Food & Beverage, Spa, Laundry, Parking, Mini Bar, Other.

Recording Payments
Click "Record Payment" on any invoice to register a payment:
• Enter amount paid (up to balance due)
• Select payment method: Cash, Credit/Debit Card, Bank Transfer, Check, Other
• Add reference notes (e.g., transaction ID)

Invoice status updates automatically to "Partial" or "Paid" based on the recorded amount.

Payment History
View a full payment ledger for each invoice showing dates, amounts, methods, and who processed them.

PDF Generation
Every invoice can be rendered as a print-ready PDF directly in the browser, formatted with the hotel header, guest details, line items, and totals.

Invoice Settings
• Configure hotel details displayed on invoices (name, address, tax IDs)
• Set default payment terms and due date offsets
• Customize invoice numbering format
• Add custom footer text or legal notices`,
  },
  {
    id: 'billing',
    title: '18. Billing & Financials',
    content: `The Billing page provides a comprehensive financial management dashboard combining invoice tracking with real-time revenue monitoring.

Financial Dashboard
• Total Revenue — aggregate of all received payments for the selected period
• Outstanding Balance — total amounts still pending collection
• Paid Invoices — count of fully settled transactions
• Overdue Invoices — flagged items requiring attention

Guest Folios
Each checked-in guest accumulates charges in a running folio:
• Room charges (auto-posted nightly)
• Restaurant and bar charges
• Mini bar consumption
• Spa and wellness services
• Miscellaneous charges

At check-out, the folio converts to a final invoice for settlement.

Search & Filters
Search by invoice number or guest name; filter by status; set date range filters.

Bulk Operations
• Batch-send overdue reminders
• Export selected invoices to CSV
• Print batch of invoices for accounting`,
  },
  {
    id: 'reports',
    title: '19. Reports & Analytics',
    content: `The Reports page provides seven categories of business intelligence with charts, tables, and export options.

Date Range Controls
Set a custom date range or click "Last 30 Days" for a quick overview. All reports update dynamically.

1. Occupancy Reports
• Average occupancy rate and length of stay
• RevPAR (Revenue Per Available Room)
• Line chart: occupancy rate over time
• Bar chart: occupancy by room type
• Room utilization table

2. Revenue Reports
• Total Revenue, ADR (Average Daily Rate), RevPAR
• Bar chart: monthly revenue trends
• Pie chart: revenue by payment method
• Table: top-performing rooms by revenue

3. Guest Reports
• Total guests, VIP breakdown (Silver, Gold, Platinum)
• New vs. returning guests chart
• Top spenders table
• Guests by country chart

4. Booking Sources
• Total reservations, direct booking percentage, commission costs
• Pie chart: distribution by source (Direct, Website, Booking.com, Expedia, Airbnb, Corporate)
• Revenue breakdown per source

5. Housekeeping Reports
• Tasks completed, in-progress, and pending
• Bar chart of daily task completion
• Staff performance table with completion percentages

6. Financial Reports
• Revenue, expenses (estimated 35% of revenue), net income
• Revenue vs. expenses comparison chart (6 months)
• Payment method breakdown pie chart

7. Cancellation Report
• Total cancellations, cancellation rate, lost revenue
• Average days before check-in at cancellation
• Cancellations over time chart
• Recent cancellations table with reasons

Export Options
• Export CSV — downloads the active report tab as a formatted spreadsheet
• Print — opens the browser print dialog for the current report view`,
  },
  {
    id: 'settings',
    title: '20. Settings',
    content: `The Settings page allows authorized staff to configure all aspects of the hotel system. It is organized into several tabs.

1. Hotel Settings
Configure the core hotel profile: name, star rating, address, city, country, phone, email, website, check-in/check-out times, currency, timezone, cancellation policy, and payment policy.

2. Room Types
Add, edit, or remove room type templates. Fields: name, description, base rate, max occupancy, amenities.

3. Tax Configuration
Set tax rates (%) for:
• Standard hotel tax
• VAT / Sales tax
• City/tourism tax
• Service charge
The combined total percentage is displayed. A tax-inclusive pricing option is also available.

4. Staff Management (Admin Only)
Manage all staff accounts:
• Add new staff with name, email, phone, and role
• Roles: Owner (full system), Admin (full access), Manager (all operations), Front Desk (reservations and check-in/out), Housekeeping (tasks only)
• Deactivate or reactivate accounts as needed
• View staff activity and last login

5. Email Templates
Customize the content of automated emails:
• Reservation Confirmation
• Check-in Reminder
• Thank You (post-stay)
• Payment Receipt
Template variables supported: {guest_name}, {room_number}, {check_in_date}, {hotel_name}.

6. Payment Settings (Admin Only)
• Enable/disable accepted payment methods (Credit Card, Debit Card, Cash, Bank Transfer)
• Configure deposit requirements and deposit percentage
• Toggle Stripe online payment integration
• Set auto-charge rules and timing

7. Notifications
Toggle email, SMS, and in-app notifications for events:
• New reservations
• Check-in/check-out reminders
• Payment received notifications
• Housekeeping task assignments
• Maintenance alerts

8. Digital Check-In Configuration
Configure digital check-in settings (see Section 14 for full details):
• Enable/disable data collection fields
• Set upsell options with descriptions and pricing
• Configure auto-send timing
• Customize terms and conditions text

9. Preferences
Customize the interface:
• Language (English and Bulgarian)
• Date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, DD.MM.YYYY)
• Time format (12-hour or 24-hour)
• First day of week
• Theme (Light, Dark, Auto/System)

10. Branding
• Upload hotel logo
• Set primary brand color (applied throughout sidebar, buttons, and accents)
• Configure property subdomain/slug for the URL path`,
  },
  {
    id: 'roles',
    title: '21. Roles & Permissions',
    content: `StayWise uses five staff roles to control feature access.

Owner / Super Admin
Full system access including multi-property management, tenant configuration, billing oversight, and all operational modules.

Admin
Full access within a single property: user management, payment settings, tax configuration, and all operational modules.

Manager
Access to all operational modules: reservations, rooms, guests, housekeeping, maintenance, billing, and reports. Cannot manage users or system-level settings.

Front Desk
Access to reservations (create, confirm, check-in, check-out), guest profiles, front desk module, and basic reports. Cannot access housekeeping management or billing settings.

Housekeeping
Can view and update only housekeeping tasks and room statuses. No access to guest data, billing, or reports.

Role Assignment
Roles are assigned when creating a staff account in Settings > Staff Management. Only admins and owners can change roles.

Permission Enforcement
• Navigation items are hidden for unauthorized roles
• Direct URL access to restricted pages shows a "Forbidden" screen with the user's current role displayed
• API-level row security ensures data isolation regardless of UI access`,
  },
  {
    id: 'integrations',
    title: '22. Integrations',
    content: `StayWise connects with leading hospitality platforms to extend functionality and automate operations.

Booking.com
• Two-way availability and rate sync
• Automatic reservation import
• Guest message forwarding
• Review score display

Expedia
• Real-time inventory updates
• Rate plan mapping
• Booking confirmation sync
• Revenue tracking per channel

Cloudbeds
• Property data synchronization
• Reservation bridging
• Rate parity management

SiteMinder
• Channel manager connectivity
• Distribution across 400+ OTAs
• Rate and availability pooling

Lodgify
• Vacation rental synchronization
• Multi-platform calendar sync
• Automated guest communication

Integration Setup
Each integration has a dedicated configuration page accessible from the sidebar under "Integrations" or "Operations":
1. Enter API credentials (key, secret, property ID)
2. Map room types to the platform's categories
3. Configure sync frequency and direction
4. Test connection and verify data flow
5. Enable live synchronization

All integration credentials are stored securely and encrypted at rest.`,
  },
  {
    id: 'navigation',
    title: '23. Navigation & Multi-Property',
    content: `StayWise uses a path-based routing system for multi-property management.

URL Structure
All hotel-specific pages are accessed via: /h/<hotel-slug>/<page>
Example: /h/grand-hotel/reservations

This approach:
• Works instantly with no DNS configuration needed
• Supports multiple properties under one account
• Allows easy switching between properties

Sidebar Navigation
The left sidebar provides quick access to all modules, organized into sections:
• Core Operations — Dashboard, Front Desk, Reservations, Rooms, Guests, Billing, Housekeeping, Maintenance, Reports
• Operations — Channel Manager, Booking Engine, Payments, Invoicing
• Integrations — Booking.com, Expedia, Cloudbeds, SiteMinder, Lodgify (collapsible section)
• System — Settings, User Guide

The sidebar can be collapsed for more screen space and is fully responsive on mobile (accessible via the hamburger menu).

Switching Properties
Click "Switch Hotel" at the bottom of the sidebar to return to the Hotel Lobby and select a different property.

Mobile Experience
On mobile devices, a top bar shows the hotel name and a menu button. Tapping the menu opens a full-height drawer with all navigation items.`,
  },
  {
    id: 'tips',
    title: '24. Tips & Best Practices',
    content: `Daily Operations Checklist
• Check the dashboard every morning for arrivals, departures, and room status
• Use the Arrivals tile to quickly confirm expected check-ins
• Review the activity feed for overnight events and any issues

Reservations
• Always link a reservation to an existing guest profile to maintain accurate stay history
• Use the "Special Requests" field to capture guest preferences at booking time
• Set the booking source correctly to track channel performance in reports

Front Desk
• Process arrivals from the Front Desk module for a streamlined workflow
• Pay attention to flagged reservations (VIP, special requests, payment issues)
• Use the walk-in feature for unannounced guests rather than creating a reservation first

Housekeeping
• Assign tasks to specific staff members for accountability
• Use the checklist feature to ensure consistent cleaning standards
• Check the room status board for a quick visual overview of readiness by floor

Channel Manager
• Review rate parity weekly to ensure consistency across channels
• Monitor commission costs in Reports > Booking Sources
• Use stop-sell controls strategically during peak periods

Billing & Payments
• Generate invoices immediately after checkout to minimize outstanding balances
• Use line item categories consistently for accurate financial reports
• Record partial payments as they arrive — the system automatically updates invoice status

Guests & CRM
• Update VIP status when guests reach loyalty milestones
• Log all communications in the guest profile for complete interaction history
• Use the preferences tab to prepare rooms before arrival (floor, view, bed type)

Reports
• Run the revenue report at month-end to compare ADR and RevPAR against targets
• Use the booking sources report to evaluate OTA commission costs vs. direct bookings
• Export CSV reports for use in external accounting or BI tools

Security
• Deactivate staff accounts immediately when an employee leaves
• Review user access levels quarterly
• Never share login credentials between staff members`,
  },
  {
    id: 'glossary',
    title: '25. Glossary',
    content: `ADR (Average Daily Rate) — Total room revenue divided by number of rooms sold. Shows the average price achieved per occupied room.

RevPAR (Revenue Per Available Room) — Total room revenue divided by total available rooms. Key performance metric combining occupancy and rate.

OTA (Online Travel Agency) — Third-party booking platforms such as Booking.com, Expedia, or Airbnb.

Occupancy Rate — The percentage of available rooms that are occupied during a given period.

Check-In — The process of welcoming an arriving guest and assigning their room.

Check-Out — The process of a guest departing and settling their account.

Confirmation Code — A unique reference number automatically assigned to each reservation (e.g., SW-2024-0001).

VIP Status — Loyalty classification (Regular, Silver, Gold, Platinum) used to recognize and prioritize valuable guests.

Folio — A running account of charges accumulated during a guest's stay.

Invoice — A financial document sent to a guest itemizing all charges for their stay and additional services.

PMS (Property Management System) — Software used by hotels to manage day-to-day operations including reservations, front desk, housekeeping, and billing.

RLS (Row Level Security) — A database security feature ensuring each user can only access data they are authorized to view.

Channel Manager — Software that synchronizes room availability and rates across multiple booking platforms simultaneously.

Booking Engine — A direct reservation system embedded in the hotel's website for commission-free bookings.

Dynamic Pricing — Automated rate adjustment based on demand, occupancy, and market conditions.

Upselling — Offering additional services or room upgrades to increase revenue per guest.

Slug — A URL-friendly identifier for each property (e.g., "grand-hotel") used in the path-based routing system.

Tenant — A registered property in the StayWise system, identified by its unique slug and configuration.

Token — A unique, time-limited security identifier used to grant guests access to their specific digital check-in form.`,
  },
];

export default function GuidePage() {
  const navigate = useHotelNavigate();

  useEffect(() => {
    document.title = 'StayWise Software — User Guide';
  }, []);

  return (
    <div className="guide-root" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a2e', background: '#fff' }}>
      <div style={{ fontFamily: 'system-ui, sans-serif', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          Back to Dashboard
        </button>
      </div>
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
          background: #1e3a5f; color: #fff;
          display: flex; align-items: center; justify-content: center; gap: 16px;
          padding: 12px 24px;
          font-family: Arial, sans-serif; font-size: 14px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.25);
          border-radius: 10px;
          margin-bottom: 24px;
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

        @media print {
          .print-bar { display: none !important; }
          .section { page-break-before: always; }
          .cover { page-break-after: always; }
          .toc-page { page-break-after: always; }
        }
      `}</style>

      <div className="print-bar">
        <span className="print-bar-text">To download this guide as PDF:</span>
        <button className="print-btn" onClick={() => window.print()}>Open Print / Save as PDF</button>
        <span className="print-bar-text">then select <strong style={{color:'#fff'}}>"Save as PDF"</strong> as destination</span>
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
        <div className="cover-subtitle">Property Management System — Full Feature Reference</div>
        <div className="cover-divider" />
        <div className="cover-meta">
          Comprehensive guide to all features and modules<br />
          of the StayWise hotel management platform.<br />
          For use by hotel staff at all levels.
        </div>
        <div className="cover-version">Version 2.0 &nbsp;&middot;&nbsp; June 2026</div>
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
