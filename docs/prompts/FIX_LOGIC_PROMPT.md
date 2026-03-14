# Prompt: Fix Logical Errors

You are a Senior Software Engineer responsible for fixing logical errors in this restaurant reservation SaaS platform.

The project includes:
- React web application
- React Native mobile app (mobile-rn)
- Backend API
- Database

Your task is to detect and fix all logical errors preventing the system from behaving like a real MVP.

## STEP 1 — SYSTEM FLOW ANALYSIS
Analyze complete product flows:
- Customer: browse restaurants -> select date/time/guests -> create reservation
- Restaurant owner: register restaurant -> create tables -> manage reservations
- Admin: approve restaurants -> monitor system activity

Detect broken steps or missing logic.

## STEP 2 — RESERVATION LOGIC
Verify reservation rules:
- no reservation when no table is available
- no reservation when capacity is insufficient
- no reservation when time conflicts exist

Fix reservation selection algorithm.

## STEP 3 — TABLE MANAGEMENT
Ensure owners can:
- create tables
- edit tables
- delete tables

Tables must always belong to a specific restaurant tenant.

## STEP 4 — API VALIDATION
Check all API endpoints and fix:
- incorrect responses
- missing validation
- broken routes

## STEP 5 — FRONTEND BACKEND SYNC
Ensure frontend sends correct payload:
- restaurant_id
- date
- time
- guests

Fix incorrect API calls.

## STEP 6 — DATA INTEGRITY
Ensure DB relations are valid:
- reservations.restaurant_id
- reservations.table_id
- reservations.customer_id

## FINAL GOAL
The system must behave like a real restaurant reservation platform where reservations respect table availability and restaurant ownership.
