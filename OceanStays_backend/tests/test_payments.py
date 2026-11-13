from conftest import book, days, pay, sql


def test_card_payment_confirms_booking(guest):
    booking = book(guest, days(140), days(142))
    receipt = pay(guest, booking["id"], "card")
    assert receipt["invoice"]["status"] == "PAID" and receipt["invoice"]["balanceDue"] == 0
    method = sql("SELECT payment_method FROM payment WHERE payment_id = %s", (receipt["invoice"]["id"],))[0][0]
    assert method == "Credit Card"
    # already paid in full
    assert guest.post("/payments/intent", json={"bookingId": booking["id"], "method": "card"}).status_code == 409


def test_bank_transfer_and_invoice_lookup(guest, other_guest):
    booking = book(guest, days(150), days(151))
    receipt = pay(guest, booking["id"], "bank")
    invoice_id = receipt["invoice"]["id"]
    assert guest.get(f"/payments/invoices/{invoice_id}").get_json()["reference"] == f"INV-{invoice_id}"
    assert other_guest.get(f"/payments/invoices/{invoice_id}").status_code == 404
    mine = guest.get("/payments").get_json()["payments"]
    assert invoice_id in [p["id"] for p in mine] and all(p["guestId"] == guest.id for p in mine)


def test_declined_and_double_confirm(guest):
    booking = book(guest, days(160), days(161))
    intent = guest.post("/payments/intent", json={"bookingId": booking["id"], "method": "card"}).get_json()
    declined = guest.post("/payments/confirm", json={"intentId": intent["intentId"], "bookingId": booking["id"],
                                                     "providerToken": "tok_fake"})
    assert declined.status_code == 402
    assert sql("SELECT payment_status FROM payment WHERE payment_id = %s", (intent["intentId"],))[0][0] == "Failed"
    receipt = pay(guest, booking["id"])
    again = guest.post("/payments/confirm", json={"intentId": receipt["invoice"]["id"], "bookingId": booking["id"],
                                                  "providerToken": "sim_x"})
    assert again.status_code == 409


def test_reception_sees_all_payments_with_filters(reception):
    everything = reception.get("/payments").get_json()["payments"]
    assert len(everything) >= 84
    paid = reception.get("/payments?status=PAID").get_json()["payments"]
    assert paid and all(p["status"] == "PAID" for p in paid)
    assert reception.get("/payments?status=WHATEVER").status_code == 400


def test_cannot_pay_cancelled_booking(guest):
    booking = book(guest, days(170), days(171))
    guest.post(f"/bookings/{booking['id']}/cancel")
    assert guest.post("/payments/intent", json={"bookingId": booking["id"], "method": "card"}).status_code == 409
