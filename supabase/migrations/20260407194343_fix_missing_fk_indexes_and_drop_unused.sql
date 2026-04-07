/*
  # Fix Missing FK Indexes and Drop Unused Indexes

  ## Summary
  Adds covering indexes for all foreign key columns that lacked them, and drops
  indexes that are unused and only add write overhead.

  ## New Indexes (Foreign Key Coverage)
  Covers FK columns across activity_log, ai_price_suggestions, booking_engine_config,
  channel_rates, channel_sync_logs, competitor_rates, direct_bookings,
  guest_communications, guest_documents, guest_portal_sessions, guest_stay_history,
  guests, hotels, housekeeping_checklist_items, housekeeping_tasks, invoice_items,
  invoice_line_items, invoices, maintenance_requests, owner_properties,
  owner_statements, payment_rules, payment_transactions, payments,
  pre_arrival_forms, pricing_rules, property_owners, reservations, room_types,
  rooms, staff_members, upsell_items, upsell_orders.

  ## Dropped Indexes
  Removes 17 unused indexes confirmed to have zero usage.
*/

-- ─── Drop unused indexes ───────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_guest_profiles_tenant_id;
DROP INDEX IF EXISTS public.idx_payment_transactions_status;
DROP INDEX IF EXISTS public.idx_user_hotel_assignments_assigned_by;
DROP INDEX IF EXISTS public.idx_guest_profiles_guest_id;
DROP INDEX IF EXISTS public.idx_payments_tenant_id;
DROP INDEX IF EXISTS public.idx_channel_rates_channel;
DROP INDEX IF EXISTS public.idx_pricing_rules_dates;
DROP INDEX IF EXISTS public.idx_ai_suggestions_room_type_date;
DROP INDEX IF EXISTS public.idx_owner_properties_owner_id;
DROP INDEX IF EXISTS public.idx_owner_statements_owner_id;
DROP INDEX IF EXISTS public.idx_guest_portal_sessions_token;
DROP INDEX IF EXISTS public.idx_invoice_audit_log_hotel;
DROP INDEX IF EXISTS public.idx_invoice_audit_log_invoice;
DROP INDEX IF EXISTS public.idx_invoice_audit_log_changed_at;
DROP INDEX IF EXISTS public.idx_payment_audit_log_hotel;
DROP INDEX IF EXISTS public.idx_payment_audit_log_payment;
DROP INDEX IF EXISTS public.idx_payment_audit_log_changed_at;

-- ─── activity_log ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_log_hotel_id ON public.activity_log(hotel_id);

-- ─── ai_price_suggestions ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_price_suggestions_tenant_id ON public.ai_price_suggestions(tenant_id);

-- ─── booking_engine_config ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_booking_engine_config_hotel_id ON public.booking_engine_config(hotel_id);

-- ─── channel_rates ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_channel_rates_room_type_id ON public.channel_rates(room_type_id);

-- ─── channel_sync_logs ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_channel_sync_logs_channel_id ON public.channel_sync_logs(channel_id);

-- ─── competitor_rates ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_competitor_rates_tenant_id ON public.competitor_rates(tenant_id);

-- ─── direct_bookings ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_direct_bookings_room_type_id ON public.direct_bookings(room_type_id);

-- ─── guest_communications ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guest_communications_guest_id ON public.guest_communications(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_hotel_id ON public.guest_communications(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_communications_tenant_id ON public.guest_communications(tenant_id);

-- ─── guest_documents ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guest_documents_guest_id ON public.guest_documents(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_hotel_id ON public.guest_documents(hotel_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_reservation_id ON public.guest_documents(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_session_id ON public.guest_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_documents_tenant_id ON public.guest_documents(tenant_id);

-- ─── guest_portal_sessions ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guest_portal_sessions_reservation_id ON public.guest_portal_sessions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_guest_portal_sessions_tenant_id ON public.guest_portal_sessions(tenant_id);

-- ─── guest_stay_history ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_booking_id ON public.guest_stay_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_guest_stay_history_tenant_id ON public.guest_stay_history(tenant_id);

-- ─── guests ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guests_hotel_id ON public.guests(hotel_id);

-- ─── hotels ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hotels_tenant_id ON public.hotels(tenant_id);

-- ─── housekeeping_checklist_items ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_housekeeping_checklist_items_hotel_id ON public.housekeeping_checklist_items(hotel_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_checklist_items_task_id ON public.housekeeping_checklist_items(task_id);

-- ─── housekeeping_tasks ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_hotel_id ON public.housekeeping_tasks(hotel_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_room_id ON public.housekeeping_tasks(room_id);

-- ─── invoice_items ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- ─── invoice_line_items ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_hotel_id ON public.invoice_line_items(hotel_id);

-- ─── invoices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_guest_id ON public.invoices(guest_id);
CREATE INDEX IF NOT EXISTS idx_invoices_hotel_id ON public.invoices(hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation_id ON public.invoices(reservation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON public.invoices(tenant_id);

-- ─── maintenance_requests ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_hotel_id ON public.maintenance_requests(hotel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_room_id ON public.maintenance_requests(room_id);

-- ─── owner_properties ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_owner_properties_room_id ON public.owner_properties(room_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_tenant_id ON public.owner_properties(tenant_id);

-- ─── owner_statements ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_owner_statements_tenant_id ON public.owner_statements(tenant_id);

-- ─── payment_rules ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_rules_tenant_id ON public.payment_rules(tenant_id);

-- ─── payment_transactions ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reservation_id ON public.payment_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON public.payment_transactions(tenant_id);

-- ─── payments ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_guest_id ON public.payments(guest_id);
CREATE INDEX IF NOT EXISTS idx_payments_hotel_id ON public.payments(hotel_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);

-- ─── pre_arrival_forms ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_reservation_id ON public.pre_arrival_forms(reservation_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_session_id ON public.pre_arrival_forms(session_id);
CREATE INDEX IF NOT EXISTS idx_pre_arrival_forms_tenant_id ON public.pre_arrival_forms(tenant_id);

-- ─── pricing_rules ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pricing_rules_room_type_id ON public.pricing_rules(room_type_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON public.pricing_rules(tenant_id);

-- ─── property_owners ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_property_owners_tenant_id ON public.property_owners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_owners_user_id ON public.property_owners(user_id);

-- ─── reservations ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reservations_guest_id ON public.reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id ON public.reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room_type_id ON public.reservations(room_type_id);

-- ─── room_types ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_room_types_hotel_id ON public.room_types(hotel_id);

-- ─── rooms ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON public.rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON public.rooms(room_type_id);

-- ─── staff_members ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_members_hotel_id ON public.staff_members(hotel_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_tenant_id ON public.staff_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON public.staff_members(user_id);

-- ─── upsell_items ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_upsell_items_tenant_id ON public.upsell_items(tenant_id);

-- ─── upsell_orders ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_upsell_orders_tenant_id ON public.upsell_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_upsell_orders_upsell_item_id ON public.upsell_orders(upsell_item_id);
