"""One complete stay: book → pay → check in → request → check out → clean → inspect → feedback."""

from conftest import book, days, free_category, pay, sql


def room_status(room_id):
    return sql("SELECT status FROM room WHERE room_id = %s", (room_id,))[0][0]


def test_full_stay(guest, reception, service_staff, housekeeper):
    # A guest with no stay can't raise requests yet
    no_stay = guest.post("/service-requests", json={"type": "ROOM_SERVICE", "title": "Food Order", "details": "Tea"})
    if not sql("""SELECT 1 FROM reservation r JOIN guest g USING (guest_id)
                  WHERE g.user_id = %s AND r.reservation_status = 'Checked in'""", (guest.id,)):
        assert no_stay.status_code == 400

    category = free_category(days(0), days(2))
    booking = book(guest, days(0), days(2), category=category)
    pay(guest, booking["id"])

    # Check-in without choosing a room: the assigned room, or a ready one of the same type
    checked_in = reception.post(f"/bookings/{booking['id']}/check-in", json={})
    assert checked_in.status_code == 200, checked_in.get_json()
    assert checked_in.get_json()["status"] == "CHECKED_IN"
    assert checked_in.get_json()["roomTypeId"] == category
    chosen = (checked_in.get_json()["roomId"], checked_in.get_json()["roomNumber"])
    assert room_status(chosen[0]) == "Occupied"
    assert reception.post(f"/bookings/{booking['id']}/check-in").status_code == 409
    desk = reception.get("/bookings/front-desk").get_json()
    assert booking["id"] in [b["id"] for b in desk["inHouse"]]

    # Guest raises a request; service staff take it through to completion
    raised = guest.post("/service-requests", json={"type": "ROOM_SERVICE", "title": "Food Order",
                                                   "details": "Club sandwich", "priority": "HIGH"})
    assert raised.status_code == 201, raised.get_json()
    request = raised.get_json()
    assert request["roomNumber"] == chosen[1] and request["bookingId"] == booking["id"]
    assert request["status"] == "PENDING" and request["priority"] == "HIGH" and request["guestId"] == guest.id

    assigned = service_staff.post(f"/service-requests/{request['id']}/assign", json={"staffId": service_staff.id})
    assert assigned.get_json()["status"] == "ASSIGNED" and assigned.get_json()["assignedToId"] == service_staff.id
    queue = service_staff.get(f"/service-requests?assignedToId={service_staff.id}&type=ROOM_SERVICE").get_json()
    assert request["id"] in [i["id"] for i in queue["items"]]
    assert service_staff.patch(f"/service-requests/{request['id']}/status", json={"status": "COMPLETED"}).status_code == 409
    assert service_staff.patch(f"/service-requests/{request['id']}/status", json={"status": "IN_PROGRESS"}).status_code == 200
    done = service_staff.patch(f"/service-requests/{request['id']}/status", json={"status": "COMPLETED"})
    assert done.get_json()["status"] == "COMPLETED" and done.get_json()["completedAt"]
    mine = guest.get(f"/service-requests?guestId={guest.id}").get_json()["items"]
    assert next(i for i in mine if i["id"] == request["id"])["status"] == "COMPLETED"

    # Check-out hands the room to housekeeping
    out = reception.post(f"/bookings/{booking['id']}/check-out")
    assert out.status_code == 200, out.get_json()
    assert out.get_json()["status"] == "CHECKED_OUT" and room_status(chosen[0]) == "Dirty"
    task_id = out.get_json()["housekeepingTaskId"]
    tasks = housekeeper.get(f"/housekeeping/tasks?assignedToId={housekeeper.id}").get_json()
    task = next(t for t in tasks if t["id"] == task_id)
    assert task["taskType"] == "DEPARTURE_CLEAN" and task["status"] == "PENDING" and task["roomNumber"] == chosen[1]

    started = housekeeper.patch(f"/housekeeping/tasks/{task_id}/status", json={"status": "IN_PROGRESS"})
    assert started.status_code == 200 and room_status(chosen[0]) == "Cleaning"
    assert started.get_json()["assignedToId"] == housekeeper.id and started.get_json()["startedAt"]
    housekeeper.patch(f"/housekeeping/tasks/{task_id}/status", json={"status": "COMPLETED"})
    assert room_status(chosen[0]) == "Clean"
    inspected = housekeeper.post(f"/housekeeping/rooms/{chosen[0]}/inspect", json={"passed": True})
    assert inspected.get_json()["status"] == "INSPECTED" and room_status(chosen[0]) == "Inspected"

    # Feedback, once per stay
    feedback = guest.post("/feedback", json={"bookingId": booking["id"], "rating": 5,
                                             "comment": "Lovely stay", "category": "ROOM"})
    assert feedback.status_code == 201, feedback.get_json()
    assert guest.post("/feedback", json={"bookingId": booking["id"], "rating": 4}).status_code == 409

    # The guest was told about each step
    titles = [n["title"] for n in guest.get("/notifications").get_json()]
    for expected in ("Booking received", "Payment received", "Welcome to Ocean Stays", "Thank you for staying with us"):
        assert expected in titles


def test_check_out_requires_settled_balance(guest, reception):
    booking = book(guest, days(0), days(1))
    reception.post(f"/bookings/{booking['id']}/confirm")
    assert reception.post(f"/bookings/{booking['id']}/check-in").status_code == 200
    blocked = reception.post(f"/bookings/{booking['id']}/check-out")
    assert blocked.status_code == 409 and "outstanding" in blocked.get_json()["message"]
    pay(reception, booking["id"], "cash")
    assert reception.post(f"/bookings/{booking['id']}/check-out").status_code == 200


def test_future_booking_cannot_check_in(guest, reception):
    booking = book(guest, days(30), days(31))
    assert reception.post(f"/bookings/{booking['id']}/check-in").status_code == 409


def test_guest_can_cancel_own_request_only(guest, other_guest, reception):
    booking = book(guest, days(0), days(3))
    reception.post(f"/bookings/{booking['id']}/confirm")
    reception.post(f"/bookings/{booking['id']}/check-in")
    raised = guest.post("/service-requests", json={"type": "HOUSEKEEPING", "title": "Extra Towels",
                                                   "details": "Two please"}).get_json()
    assert other_guest.patch(f"/service-requests/{raised['id']}/status", json={"status": "CANCELLED"}).status_code == 404
    assert guest.patch(f"/service-requests/{raised['id']}/status", json={"status": "COMPLETED"}).status_code == 403
    assert guest.patch(f"/service-requests/{raised['id']}/status", json={"status": "CANCELLED"}).status_code == 200
    # housekeeping requests create a task, cancelled with the request
    assert sql("SELECT task_status FROM housekeeping_task WHERE service_request_id = %s", (raised["id"],))[0][0] == "Cancelled"
