"""Housekeeping, admin, users, roles, settings, notifications."""

from conftest import sql


def a_room(status):
    rows = sql("SELECT room_id, room_number FROM room WHERE status = %s ORDER BY room_id LIMIT 1", (status,))
    return rows[0] if rows else None


def test_housekeeping_summary_and_tasks(housekeeper):
    summary = housekeeper.get(f"/housekeeping/summary?assignedToId={housekeeper.id}").get_json()
    assert {"PENDING", "IN_PROGRESS", "COMPLETED", "awaitingInspection"} <= set(summary)
    tasks = housekeeper.get("/housekeeping/tasks").get_json()
    assert len(tasks) >= 7 and all(t["roomNumber"] for t in tasks)
    assert tasks[0]["status"] in {"PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"}
    assert housekeeper.get(f"/housekeeping/tasks/{tasks[0]['id']}").status_code == 200
    assert housekeeper.get("/housekeeping/tasks/999999").status_code == 404
    assert housekeeper.get("/housekeeping/tasks?floor=1").status_code == 200


def test_failed_inspection_creates_reclean(housekeeper):
    room_id, number = a_room("Available")
    sql("UPDATE room SET status = 'Clean' WHERE room_id = %s", (room_id,))
    failed = housekeeper.post(f"/housekeeping/rooms/{room_id}/inspect", json={"passed": False, "note": "Hair in sink"})
    assert failed.status_code == 200 and failed.get_json()["status"] == "DIRTY"
    task = housekeeper.get(f"/housekeeping/tasks/{failed.get_json()['taskId']}").get_json()
    assert task["roomNumber"] == number and "Hair in sink" in task["note"]
    # a room that isn't waiting for inspection
    assert housekeeper.post(f"/housekeeping/rooms/{room_id}/inspect", json={"passed": True}).status_code == 409


def test_maintenance_report_takes_room_out_of_service(housekeeper, service_staff):
    room_id, number = a_room("Available")
    reported = housekeeper.post("/housekeeping/maintenance", json={
        "roomId": room_id, "roomNumber": number, "title": "Plumbing Repair", "details": "Leaking tap",
        "priority": "URGENT"})
    assert reported.status_code == 201, reported.get_json()
    assert reported.get_json()["reference"].startswith("SR-")
    assert sql("SELECT status FROM room WHERE room_id = %s", (room_id,))[0][0] == "Maintaining"
    queue = service_staff.get("/service-requests?type=MAINTENANCE").get_json()["items"]
    item = next(i for i in queue if i["id"] == reported.get_json()["requestId"])
    assert item["roomNumber"] == number and item["priority"] == "URGENT" and item["guestName"] == "Hotel staff"
    # finishing the repair sends the room to inspection
    service_staff.post(f"/service-requests/{item['id']}/assign", json={})
    service_staff.patch(f"/service-requests/{item['id']}/status", json={"status": "IN_PROGRESS"})
    service_staff.patch(f"/service-requests/{item['id']}/status", json={"status": "COMPLETED"})
    assert sql("SELECT status FROM room WHERE room_id = %s", (room_id,))[0][0] == "Clean"


def test_room_status_changes_by_role(reception, housekeeper):
    room_id, _ = a_room("Available")
    assert reception.patch(f"/rooms/{room_id}", json={"status": "MAINTENANCE"}).get_json()["status"] == "MAINTENANCE"
    assert reception.patch(f"/rooms/{room_id}", json={"status": "AVAILABLE"}).status_code == 200
    assert reception.patch(f"/rooms/{room_id}", json={"status": "CLEAN"}).status_code == 403
    assert reception.patch(f"/rooms/{room_id}", json={"status": "OCCUPIED"}).status_code == 403
    assert housekeeper.patch(f"/rooms/{room_id}", json={"status": "BOGUS"}).status_code == 400


def test_admin_dashboard(admin):
    stats = admin.get("/admin/stats").get_json()
    assert stats["totalRooms"] == 85 and 0 <= stats["occupancyRate"] <= 100
    trends = admin.get("/admin/trends").get_json()
    assert len(trends["occupancy"]) == 6 and len(trends["revenue"]) == 6
    assert {t["name"] for t in trends["roomTypePerformance"]} == {"Standard", "Deluxe", "Suite", "Villa", "Penthouse"}
    # the room-type join is right: bookings add up to the reservations that have rooms
    with_rooms = sql("""SELECT COUNT(DISTINCT r.reservation_id) FROM reservation r
                        JOIN reservation_room rr USING (reservation_id) WHERE r.reservation_status <> 'Cancelled'""")[0][0]
    assert sum(t["bookings"] for t in trends["roomTypePerformance"]) == with_rooms


def test_audit_log_filters(admin, client):
    client.post("/login", json={"email": "nobody@example.com", "password": "x"})
    failures = admin.get("/admin/audit-logs?result=FAILURE&pageSize=50").get_json()
    assert failures["items"] and all(i["result"] == "FAILURE" for i in failures["items"])
    logins = admin.get("/admin/audit-logs?action=LOGIN&pageSize=5&page=1").get_json()
    assert logins["total"] >= 1 and all(i["action"] == "LOGIN" for i in logins["items"])
    assert admin.get("/admin/audit-logs/actors").get_json()


def test_settings_round_trip(admin, client):
    settings = admin.get("/admin/settings").get_json()
    assert settings["operations"]["checkInTime"] == "14:00"
    ops = dict(settings["operations"], taxRatePercent="15", checkInTime="15:00")
    saved = admin.patch("/admin/settings/operations", json=ops).get_json()
    assert saved["operations"]["taxRatePercent"] == 15 and saved["operations"]["checkInTime"] == "15:00"
    assert client.get("/content/hotel").get_json()["policy"]["taxRate"] == 0.15
    admin.patch("/admin/settings/operations", json=settings["operations"])
    assert admin.patch("/admin/settings/operations", json=dict(ops, taxRatePercent=120)).status_code == 400
    notes = admin.patch("/admin/settings/notifications", json={"marketingEmails": True}).get_json()
    assert notes["notifications"]["marketingEmails"] is True
    hotel = dict(settings["hotel"], tagline="By the sea")
    assert admin.patch("/admin/settings/hotel", json=hotel).get_json()["hotel"]["tagline"] == "By the sea"
    assert admin.patch("/admin/settings/nope", json={}).status_code == 404


def test_roles_and_permissions(admin):
    roles = admin.get("/roles").get_json()
    assert [r["id"] for r in roles] == ["GUEST", "RECEPTIONIST", "HOUSEKEEPING", "SERVICE_STAFF", "ADMIN"]
    reception = next(r for r in roles if r["id"] == "RECEPTIONIST")
    assert reception["permissions"] and all("." in p for p in reception["permissions"])
    updated = admin.put("/roles/RECEPTIONIST/permissions", json={"permissions": ["booking.view", "room.view"]})
    assert updated.get_json()["permissions"] == ["booking.view", "room.view"]
    admin.put("/roles/RECEPTIONIST/permissions", json={"permissions": reception["permissions"]})
    assert admin.put("/roles/ADMIN/permissions", json={"permissions": []}).status_code == 403
    assert admin.put("/roles/GUEST/permissions", json={"permissions": ["made.up"]}).status_code == 400


def test_users_admin(admin, reception, guest):
    users = admin.get("/users").get_json()
    assert len(users) >= 22 and {"user_id", "role", "department", "created_at"} <= set(users[0])
    assert {u["role"] for u in reception.get("/users").get_json()} == {"GUEST"}
    staff = admin.get("/staff").get_json()["staff"]
    assert all(s["employment_status"] == "ACTIVE" for s in staff)
    assert admin.patch(f"/users/{admin.id}/status", json={"status": "INACTIVE"}).status_code == 409

    profile = guest.get(f"/users/{guest.id}").get_json()
    assert profile["email"] and profile["role"] == "GUEST"
    changed = guest.patch(f"/users/{guest.id}", json={"firstName": "Kasun", "phone": "+94 71 123 4567"})
    assert changed.get_json()["phone"] == "+94 71 123 4567"
    assert guest.patch(f"/users/{admin.id}", json={"firstName": "Hacker"}).status_code == 403
    assert guest.get(f"/users/{admin.id}").status_code == 403
    taken = guest.patch(f"/users/{guest.id}", json={"email": admin.user["email"]})
    assert taken.status_code == 409
    assert guest.patch(f"/users/{guest.id}", json={"role": "ADMIN"}).status_code == 403


def test_facilities_admin(admin, client):
    created = admin.post("/content/facilities", json={"name": "Rooftop Bar", "department": "Food and Beverage",
                                                      "summary": "Sunset cocktails", "hours": "17:00 - 23:00",
                                                      "capacity": "60", "icon": "bi-cup-straw", "status": "OPEN"})
    assert created.status_code == 201 and created.get_json()["status"] == "OPEN"
    assert admin.post("/content/facilities", json={"name": "rooftop bar"}).status_code == 409
    facility_id = created.get_json()["id"]
    assert admin.patch(f"/content/facilities/{facility_id}", json={"status": "CLOSED"}).get_json()["status"] == "CLOSED"
    names = [f["facility_name"] for f in client.get("/facilities").get_json()["facilities"]]
    assert "Rooftop Bar" in names


def test_notifications(guest, admin):
    items = guest.get("/notifications").get_json()
    assert all(n["userId"] == guest.id for n in items)
    count = guest.get("/notifications/unread-count").get_json()["count"]
    unread = [n for n in items if not n["read"]]
    if unread:
        assert guest.post(f"/notifications/{unread[0]['id']}/read").get_json()["read"] is True
    guest.post("/notifications/read-all", json={"userId": guest.id})
    assert guest.get("/notifications/unread-count").get_json()["count"] == 0 or count == 0
    assert guest.get(f"/notifications?userId={admin.id}").status_code == 403
    assert len(admin.get("/notifications?limit=500").get_json()) > len(items)
