from flask import Flask, request
from flask_cors import CORS
import psycopg2

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="Ocean Stays ",
        user="postgres",
        password="2002nisha",
        port="5432"
    )
    return conn

@app.route("/")
def test_connection():
    try:
        conn = get_db_connection()
        conn.close()
        return "PostgreSQL Connected Successfully!"
    except Exception as e:
        return f"Connection Failed: {e}"

# ======================
#Guest API
# ======================
@app.route("/guests")
def get_guests():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT g.*, u.first_name, u.last_name, u.email
    FROM guest g
    LEFT JOIN "user" u ON g.user_id = u.user_id
    ORDER BY g.guest_id
""")

    guests = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"guests": guests}

# ==================== 
#login API
#user + role
# ====================     

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT u.user_id, u.username, u.password_hash,
               u.first_name, u.last_name,
               r.role_id, r.role_name
        FROM "user" u
        JOIN role r ON u.role_id = r.role_id
        WHERE u.email = %s
    """, (username,))

    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if user is None:
        return {"message": "User not found"}, 404

    if password != user[2]:
        return {"message": "Incorrect password"}, 401

    return {
        "message": "Login successful",
        "user_id": user[0],
        "username": user[1],
        "role_id": user[5],
        "role": user[6]
    }
# ======================
#Room API
# ======================

@app.route("/rooms")
def get_rooms():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT room_id, room_number, room_type_id, status
        FROM room
        ORDER BY room_id
    """)

    rooms = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"rooms": rooms}

# ======================
#Room Facilities
# ======================

@app.route("/roomfacilities")
def get_room_facilities():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT room_facility_id, room_id, facility_id
        FROM room_facility
        ORDER BY room_facility_id
    """)

    room_facilities = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"room_facilities": room_facilities}

# ======================
#Room types
# ======================

@app.route('/roomtypes', methods=['GET'])
def get_room_types():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM room_type ORDER BY room_type_id")
    room_types = cur.fetchall()

    cur.close()
    conn.close()

    return {'room_types': room_types}

# ======================
# Facility API
# ======================

@app.route("/facilities")
def get_facilities():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT facility_id, facility_name, description, availability_status
        FROM facility
        ORDER BY facility_id
    """)

    facilities = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"facilities": facilities}

# ======================
# Staff API
# ======================


@app.route("/staff")
def get_staff():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            s.staff_id,
            s.user_id,
            u.first_name,
            u.last_name,
            s.position,
            s.department,
            r.role_name,
            u.phone_number,
            u.email,
            s.employment_status,
            s.employment_date
        FROM staff s
        JOIN "user" u ON s.user_id = u.user_id
        JOIN role r ON u.role_id = r.role_id
        ORDER BY s.staff_id
    """)

    columns = [desc[0] for desc in cursor.description]
    staff = [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]

    cursor.close()
    conn.close()

    return {"staff": staff}
 

# ======================
# Reservation API
# ======================

@app.route("/reservations")
def get_reservations():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.reservation_id, r.guest_id, r.reservation_date,
               r.check_in_date, r.check_out_date, r.number_of_guests,
               r.reservation_status, r.special_requests, r.total_amount,
               u.first_name, u.last_name, u.email
        FROM reservation r
        LEFT JOIN guest g ON r.guest_id = g.guest_id
        LEFT JOIN "user" u ON g.user_id = u.user_id
        ORDER BY r.reservation_id
    """)
        

    reservations = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"reservations": reservations}  

# ======================
# Reservation Room API
# ======================

@app.route("/reservationrooms")
def get_reservation_rooms():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT reservation_room_id, reservation_id, room_id,
               room_rate, number_of_nights
        FROM reservation_room
        ORDER BY reservation_room_id
    """)

    reservation_rooms = cursor.fetchall()

    cursor.close()
    conn.close()

    return {"reservation_rooms": reservation_rooms}





if __name__ == "__main__":
    app.run(debug=True)