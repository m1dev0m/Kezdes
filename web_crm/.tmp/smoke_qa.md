# Public Booking Flow QA Scenario

## Public Booking
1. Navigate to /restaurant/1 (assume restaurant exists)
2. Verify page loads: Hero image, restaurant name, description, "Book Table" button visible
3. Click "Book Table" → Redirect to /restaurant/1/book
4. Verify form: Date (min today), Time (default 19:00), Guests (1-20), Name, Phone fields
5. Fill form: Valid date/time, guests=2, name="Test Guest", phone="+7700000000"
6. Click "Reserve table" → Should show loading, then redirect to /restaurant/1/success
7. Verify confirmation: Shows reservation details, "Back to restaurant" and "Make another booking" links

## Admin Confirm/Seat/Complete
1. Login as admin (username/password from env or test data)
2. Navigate to /app/bookings
3. Find the new booking (status: pending or confirmed)
4. Click "Confirm" if pending → Status should change to confirmed
5. Click "Seat" → Select available table → Status to seated
6. Click "Complete" → Status to completed

## Expected Results
- No errors, smooth flow
- All actions <5s
- Clear feedback on success/failure

## Blockers
- Backend API must be running with restaurant data
- Admin credentials must work
- No 404s on routes

## Non-Blockers
- Styling inconsistencies
- Loading states could be smoother