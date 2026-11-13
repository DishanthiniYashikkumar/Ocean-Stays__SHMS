"""Static marketing content (gallery, highlights, imagery).

Kept in code rather than tables: nobody edits it from the admin screens. The
captions and images are the ones the frontend team wrote for the mock data.
"""

U = "https://images.unsplash.com/"
Q = "?auto=format&fit=crop&w=1200&q=80"

GALLERY = [
    {"id": "g1", "caption": "The bay at first light", "category": "Property", "src": f"{U}photo-1582719508461-905c673771fd{Q}"},
    {"id": "g2", "caption": "Ocean Deluxe interior", "category": "Rooms", "src": f"{U}photo-1590490360182-c33d57733427{Q}"},
    {"id": "g3", "caption": "Infinity pool, late afternoon", "category": "Facilities", "src": f"{U}photo-1571003123894-1f0594d2b5d9{Q}"},
    {"id": "g4", "caption": "Horizon Restaurant terrace", "category": "Dining", "src": f"{U}photo-1414235077428-338989a2e8c0{Q}"},
    {"id": "g5", "caption": "Coastal Suite living room", "category": "Rooms", "src": f"{U}photo-1582719478250-c89cae4dc85b{Q}"},
    {"id": "g6", "caption": "Sunset through the palms", "category": "Property", "src": f"{U}photo-1610045058619-8c37e8913c55{Q}"},
    {"id": "g7", "caption": "Spa pavilion", "category": "Facilities", "src": f"{U}photo-1540555700478-4be289fbecef{Q}"},
    {"id": "g8", "caption": "Ocean Deluxe bathroom", "category": "Rooms", "src": f"{U}photo-1519868343531-805e97cbda3e{Q}"},
    {"id": "g9", "caption": "The main pool at dusk", "category": "Facilities", "src": f"{U}photo-1610641818989-c2051b5e2cfd{Q}"},
    {"id": "g10", "caption": "Table set for dinner", "category": "Dining", "src": f"{U}photo-1519690889869-e705e59f72e1{Q}"},
    {"id": "g11", "caption": "Garden Villa plunge pool", "category": "Rooms", "src": f"{U}photo-1604709177225-055f99402ea3{Q}"},
    {"id": "g12", "caption": "Pool deck, early morning", "category": "Facilities", "src": f"{U}photo-1583522862616-c7c405b9e0ed{Q}"},
    {"id": "g13", "caption": "Evening on the beach", "category": "Property", "src": f"{U}photo-1552272492-3053fbacbf4b{Q}"},
    {"id": "g14", "caption": "Horizon Restaurant, morning service", "category": "Dining", "src": f"{U}photo-1551632436-cbf8dd35adfa{Q}"},
    {"id": "g15", "caption": "Sunset from the west wing", "category": "Property", "src": f"{U}photo-1507525428034-b723cf961d3e{Q}"},
    {"id": "g16", "caption": "Loungers by the main pool", "category": "Facilities", "src": f"{U}photo-1549294413-26f195200c16{Q}"},
    {"id": "g17", "caption": "First light over the water", "category": "Property", "src": f"{U}photo-1529348915581-73628f0cf212{Q}"},
    {"id": "g18", "caption": "Poolside cabanas", "category": "Facilities", "src": f"{U}photo-1604348825621-22800b6ed16d{Q}"},
]

HIGHLIGHTS = [
    {"id": "h1", "icon": "bi-water", "title": "Every room faces water",
     "description": "Ocean, lagoon or harbour — no interior rooms anywhere on the property."},
    {"id": "h2", "icon": "bi-lightning-charge", "title": "Four-minute check-in",
     "description": "Pre-arrival details are captured online, so arrival is a handshake and a key."},
    {"id": "h3", "icon": "bi-shield-check", "title": "Flexible cancellation",
     "description": "Free cancellation up to 48 hours before arrival on most rates."},
    {"id": "h4", "icon": "bi-people", "title": "One team, all year",
     "description": "Ninety percent of our staff have been with us more than three seasons."},
]

# activity.activity_name -> (icon, image, one-line summary)
EXPERIENCE_EXTRAS = {
    "Whale Watching": ("bi-water", f"{U}photo-1568430462989-44163eb1752f{Q}",
                       "Blue whales and spinner dolphins off the Mirissa shelf, from a small boat."),
    "Galle Fort at Dusk": ("bi-building", f"{U}photo-1509982724584-2ce0d4366d8b{Q}",
                           "A guided walk through the ramparts, ending at the lighthouse for sunset."),
    "Private Surf Lesson": ("bi-wind", f"{U}photo-1502680390469-be75c86b636f{Q}",
                            "One-to-one coaching on a beach break suited to first-timers."),
    "Coastal Cooking Class": ("bi-fire", f"{U}photo-1596040033229-a9821ebd058d{Q}",
                              "Market visit, then a hands-on lesson in southern Sri Lankan curries."),
    "Tea Country Day Trip": ("bi-cup-hot", f"{U}photo-1748753778598-2e5c4244e90e{Q}",
                             "A drive into the hills, a working estate, and a tasting at altitude."),
    "Turtle Hatchery Visit": ("bi-egg", f"{U}photo-1437622368342-7a3d73a34c8f{Q}",
                              "A conservation project we've supported since 2019, seen up close."),
}
DEFAULT_EXPERIENCE_IMAGE = f"{U}photo-1507525428034-b723cf961d3e{Q}"

# facility.facility_name -> (icon, image)
FACILITY_EXTRAS = {
    "Infinity Pool": ("bi-water", f"{U}photo-1571003123894-1f0594d2b5d9{Q}"),
    "Coastal Spa": ("bi-flower1", f"{U}photo-1540555700478-4be289fbecef{Q}"),
    "Horizon Restaurant": ("bi-egg-fried", f"{U}photo-1414235077428-338989a2e8c0{Q}"),
    "Fitness Studio": ("bi-heart-pulse", f"{U}photo-1534438327276-14e5300c3a48{Q}"),
    "Events & Meetings": ("bi-people", f"{U}photo-1519167758481-83f550bb49b3{Q}"),
    "Concierge Desk": ("bi-bell", f"{U}photo-1566073771259-6a8506099945{Q}"),
}
DEFAULT_FACILITY_IMAGE = f"{U}photo-1566073771259-6a8506099945{Q}"
