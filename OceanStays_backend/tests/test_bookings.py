from conftest import book, days, free_category, pay, sql


def test_guest_books_and_sees_booking(guest, other_guest):
    booking = book(guest, days(60), days(63))
    assert booking["status"] == "PENDING" and booking["paymentStatus"] == "PENDING"
    assert booking["nights"] == 3 and booking["guestId"] == guest.id
    assert booking["total"] == booking["roomTotal"] + booking["taxes"] + booking["serviceCharge"]
    assert booking["roomNumber"] and booking["reference"] == f"RSV-{booking['id']}"

    mine = guest.get(f"/bookings/guest/{guest.id}").get_json()
    assert booking["id"] in [b["id"] for b in mine["upcoming"]]
    assert guest.get(f"/bookings/{booking['id']}").status_code == 200
    # another guest can't see or touch it
    assert other_guest.get(f"/bookings/{booking['id']}").status_code == 404
    assert other_guest.get(f"/bookings/guest/{guest.id}").status_code == 403
    assert other_guest.post(f"/bookings/{booking['id']}/cancel").status_code == 404


def test_booking_validation(guest):
    category = free_category(days(70), days(72))
    assert guest.post("/bookings", json={"roomTypeId": category, "checkIn": days(72), "checkOut": days(70)}).status_code == 400
    assert guest.post("/bookings", json={"roomTypeId": category, "checkIn": days(-3), "checkOut": days(-1)}).status_code == 400
    assert guest.post("/bookings", json={"roomTypeId": 99999, "checkIn": days(70), "checkOut": days(72)}).status_code == 404
    capacity = sql("SELECT capacity FROM room_category WHERE room_category_id = %s", (category,))[0][0]
    too_many = guest.post("/bookings", json={"roomTypeId": category, "checkIn": days(70), "checkOut": days(72),
                                             "guests": {"adults": capacity + 1, "children": 0}})
    assert too_many.status_code == 400


def test_category_sells_out_then_refuses(guest):
    check_in, check_out = days(300), days(302)
    category = free_category(check_in, check_out)
    rooms = sql("SELECT COUNT(*) FROM room WHERE room_category_id = %s AND status <> 'Maintaining'", (category,))[0][0]
    for _ in range(rooms):
        book(guest, check_in, check_out, category=category)
    refused = guest.post("/bookings", json={"roomTypeId": category, "checkIn": check_in, "checkOut": check_out})
    assert refused.status_code == 409 and "booked" in refused.get_json()["message"]
    # non-overlapping dates still work
    book(guest, check_out, days(304), category=category)
    availability = guest.get(f"/rooms/availability?checkIn={check_in}&checkOut={check_out}").get_json()
    assert next(i for i in availability["items"] if i["roomTypeId"] == category)["available"] == 0


def test_modify_confirm_and_cancel_with_refund(guest):
    booking = book(guest, days(90), days(92))
    changed = guest.patch(f"/bookings/{booking['id']}", json={"checkIn": days(91), "checkOut": days(94)})
    assert changed.status_code == 200, changed.get_json()
    assert changed.get_json()["nights"] == 3 and changed.get_json()["total"] > booking["total"]

    receipt = pay(guest, booking["id"])
    assert receipt["booking"]["status"] == "CONFIRMED" and receipt["booking"]["paymentStatus"] == "PAID"
    assert receipt["receiptReference"].startswith("TXN-")

    cancelled = guest.post(f"/bookings/{booking['id']}/cancel", json={"reason": "Plans changed"})
    assert cancelled.status_code == 200
    body = cancelled.get_json()
    assert body["status"] == "CANCELLED" and body["refundedAmount"] > 0 and body["paymentStatus"] == "REFUNDED"
    assert guest.post(f"/bookings/{booking['id']}/cancel").status_code == 409


def test_guest_cannot_cancel_inside_window_but_reception_can(guest, reception):
    booking = book(guest, days(0), days(2))  # check-in today: inside the free window
    assert guest.post(f"/bookings/{booking['id']}/cancel").status_code == 409
    assert reception.post(f"/bookings/{booking['id']}/cancel", json={"reason": "No show"}).status_code == 200


def test_pay_on_arrival_confirm(guest):
    booking = book(guest, days(120), days(121))
    confirmed = guest.post(f"/bookings/{booking['id']}/confirm")
    assert confirmed.status_code == 200 and confirmed.get_json()["status"] == "CONFIRMED"
    assert confirmed.get_json()["paymentStatus"] == "PENDING"


def test_reception_lists_and_searches(reception):
    page = reception.get("/bookings?pageSize=5&page=2").get_json()
    assert page["page"] == 2 and len(page["items"]) == 5 and page["total"] >= 84
    found = reception.get("/bookings?search=RSV-1&pageSize=50").get_json()
    assert any(b["id"] == 1 for b in found["items"])
    checked_out = reception.get("/bookings?status=CHECKED_OUT&pageSize=500").get_json()
    assert checked_out["items"] and all(b["status"] == "CHECKED_OUT" for b in checked_out["items"])


def test_front_desk_summary(reception, guest):
    arriving = book(guest, days(0), days(2))
    desk = reception.get("/bookings/front-desk").get_json()
    assert set(desk) >= {"arrivals", "departures", "inHouse", "unpaid"}
    assert arriving["id"] in [b["id"] for b in desk["arrivals"]]
    assert all(b["balanceDue"] > 0 for b in desk["unpaid"])


def test_invoice_for_booking(guest):
    booking = book(guest, days(130), days(132))
    quote = guest.get(f"/bookings/{booking['id']}/invoice").get_json()
    assert quote["total"] == booking["total"] and len(quote["lines"]) >= 2
