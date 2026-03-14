# Kezdes Production Architecture (OpenTable-style)

## 1. Target Architecture

Platform type: modular SaaS with clear service boundaries.

Core services:
- API Gateway
- Auth Service
- Restaurant Service
- Reservation Service
- Table Service
- Customer Service
- Notification Service
- Analytics Service

## 2. System Topology

Frontend (React Web / React Native)
-> API Gateway
-> Microservices (Auth, Restaurant, Reservation, Table, Customer)
-> Data Layer (PostgreSQL, Redis, optional Search Index)
-> External Services (Email, SMS, Payments)

## 3. Data Model (Core)

### users
- id
- email
- password_hash
- role
- created_at

### restaurants
- id
- name
- address
- city
- phone
- owner_id
- status (pending|approved|rejected)
- created_at

### tables
- id
- restaurant_id
- table_number
- capacity
- pos_x
- pos_y
- status (available|reserved|occupied|cleaning)

### reservations
- id
- restaurant_id
- table_id
- customer_id
- date
- time
- guests
- status (pending|confirmed|cancelled|completed)
- created_at

### customers
- id
- restaurant_id
- name
- phone
- email
- visits

## 4. Reservation Engine Rules

Reservation must fail when:
- no available table
- table capacity is insufficient
- overlapping reservation conflict exists

Selection algorithm:
1. Filter by restaurant + date/time + availability
2. Keep only tables with capacity >= guests
3. Remove tables with overlap conflicts
4. Choose smallest fitting table (capacity optimization)
5. If none, try combined-table allocation
6. Apply slot buffer (`duration` default 90 min)

## 5. Table Map

Each table stores:
- pos_x
- pos_y

UI color mapping:
- green: available
- yellow: reserved
- red: occupied

## 6. Scale Targets

Target baseline:
- 1000 restaurants
- 100k users

Required technical controls:
- Redis caching
- strict DB indexes
- API rate limiting
- idempotent reservation create

## 7. MVP vs Production

MVP keeps modular monolith codebase with service-oriented boundaries.
Production can split to microservices incrementally:
1. Notification Service
2. Analytics Service
3. Reservation Engine

