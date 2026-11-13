from conftest import days, sql


def test_health(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_json()["database"] == "connected"


def test_rooms_positional_rows(client):
    rooms = client.get("/rooms").get_json()["rooms"]
    assert len(rooms) == sql("SELECT COUNT(*) FROM room")[0][0]
    room_id, number, category, status, floor, _notes = rooms[0]
    assert isinstance(number, str) and isinstance(floor, int)
    assert status in {"AVAILABLE", "RESERVED", "OCCUPIED", "DIRTY", "CLEANING", "CLEAN", "INSPECTED", "MAINTENANCE"}
    assert "MAINTAINING" not in {r[3] for r in rooms}
    assert client.get("/rooms?status=MAINTENANCE").status_code == 200
    assert client.get("/rooms?status=NOPE").status_code == 400


def test_roomtypes_and_facilities(client):
    types = client.get("/roomtypes").get_json()["room_types"]
    assert len(types) == 21 and len(types[0]) == 12
    assert isinstance(types[0][4], (int, float))  # price is a number, not a string
    assert types[0][10] in {"Standard", "Deluxe", "Suite", "Villa", "Penthouse"}
    assert client.get("/roomfacilities").get_json()["room_facilities"]
    facilities = client.get("/facilities").get_json()["facilities"]
    assert facilities[0]["facility_name"] and facilities[0]["icon"].startswith("bi-")


def test_availability(client):
    body = client.get(f"/rooms/availability?checkIn={days(200)}&checkOut={days(203)}&guests=2").get_json()
    assert body["nights"] == 3 and len(body["items"]) == 21
    assert all(item["available"] <= item["total"] for item in body["items"])
    assert client.get(f"/rooms/availability?checkIn={days(5)}&checkOut={days(4)}").status_code == 400
    assert client.get("/rooms/availability?checkIn=31-12-2026").status_code == 400


def test_content_endpoints(client):
    experiences = client.get("/content/experiences").get_json()
    assert len(experiences) == 6 and experiences[0]["image"].startswith("https://")
    assert len(client.get("/content/gallery?category=All").get_json()) == 18
    rooms_only = client.get("/content/gallery?category=Rooms").get_json()
    assert rooms_only and all(item["category"] == "Rooms" for item in rooms_only)
    assert len(client.get("/content/highlights").get_json()) == 4
    testimonials = client.get("/content/testimonials").get_json()
    assert all(t["rating"] >= 4 and t["quote"] for t in testimonials)
    hotel = client.get("/content/hotel").get_json()
    assert hotel["hotel"]["name"] == "Ocean Stays"
    assert hotel["policy"]["taxRate"] == 0.12 and hotel["policy"]["checkInTime"] == "14:00"


def test_contact_message(client):
    ok = client.post("/content/contact", json={"name": "Ana", "email": "ana@example.com",
                                                "subject": "Wedding", "message": "Do you host weddings?"})
    assert ok.status_code == 201 and ok.get_json()["reference"].startswith("MSG-")
    assert client.post("/content/contact", json={"name": "Ana", "email": "nope", "message": "Hello there"}).status_code == 400
    assert client.post("/content/contact", json={"email": "a@b.co", "message": "Hello there"}).status_code == 400


def test_unknown_route_is_json_404(client):
    response = client.get("/does-not-exist")
    assert response.status_code == 404 and response.get_json()["message"]
