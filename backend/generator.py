"""
generator.py — Data generation engine for Flanufactured.

This module is the core of the application. It defines:

  FIELD_TYPES       Registry of all available field types, with metadata used
                    by both the generation engine and the frontend type picker.

  _generate_value() Produces one value for a single field. Receives row_context
                    (values already generated for the current row) so that
                    relational fields (e.g. email derives from first_name/last_name,
                    city is consistent with state) work correctly.

  generate_row()    Calls _generate_value() for each field in a schema and
                    accumulates results into a dict. Passes a shared row_context
                    so each field can see what prior fields produced.

  generate_dataset() Calls generate_row() N times and serialises to JSON or CSV.

Adding a new field type requires two changes:
  1. Add an entry to FIELD_TYPES with label, category, description, and examples.
  2. Add a corresponding `if t == "your_type":` branch in _generate_value().
"""

import random
import csv
import io
import re
import secrets
from faker import Faker
from faker.config import AVAILABLE_LOCALES
from models import FieldDefinition
from config import settings


def get_faker(locale: str = "en_US") -> Faker:
    """Return a Faker instance for the given locale, falling back to en_US."""
    if locale not in AVAILABLE_LOCALES:
        locale = "en_US"
    return Faker(locale)

# ── Field type registry ───────────────────────────────────────────────────────
# advanced=True means hidden in "Advanced" section of the picker

FIELD_TYPES = {
    # Core
    "row_number":        {"label": "Row Number",           "category": "Core",     "description": "Sequential integer starting at 1", "examples": ["1", "2", "3"]},
    "guid":              {"label": "GUID",                  "category": "Core",     "description": "Random UUID v4", "examples": ["a3f1c2d4-...", "9b8e7f6a-..."]},
    "boolean":           {"label": "Boolean",               "category": "Core",     "description": "true or false", "examples": ["true", "false", "true"]},
    "null_boolean":      {"label": "Nullable Boolean",      "category": "Core",     "description": "true, false, or null", "examples": ["true", "null", "false"], "advanced": True},
    "fixed_value":       {"label": "Fixed Value",           "category": "Core",     "description": "Same value for every row", "examples": ["your value", "your value", "your value"]},
    "custom_list":       {"label": "Custom List",           "category": "Core",     "description": "Pick randomly from your values", "examples": ["apple", "banana", "cherry"]},
    "weighted_list":     {"label": "Weighted List",         "category": "Core",     "description": "Pick randomly with assigned probabilities", "examples": ["red", "red", "blue"]},
    "number":            {"label": "Number",                "category": "Core",     "description": "Random number with min/max/decimals", "examples": ["42", "7.5", "1337"]},
    "sequence":          {"label": "Sequence",              "category": "Core",     "description": "Incrementing number from a start value", "examples": ["1", "2", "3"]},
    "regex":             {"label": "Regex Pattern",         "category": "Core",     "description": "String matching a regex pattern", "examples": ["ABC123", "XY9042", "ZZ0001"]},
    "md5":               {"label": "MD5 Hash",              "category": "Core",     "description": "MD5 hash string", "examples": ["5d41402abc4b2a76b9719d911017c592"]},
    "sha256":            {"label": "SHA-256 Hash",          "category": "Core",     "description": "SHA-256 hash string", "examples": ["2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"]},
    "sha1":              {"label": "SHA-1 Hash",            "category": "Core",     "description": "SHA-1 hash string", "examples": ["aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d"], "advanced": True},

    # Personal
    "first_name":        {"label": "First Name",            "category": "Personal", "description": "Given name", "examples": ["James", "Maria", "Priya"]},
    "last_name":         {"label": "Last Name",             "category": "Personal", "description": "Family name", "examples": ["Thornton", "Nakamura", "Okafor"]},
    "full_name":         {"label": "Full Name",             "category": "Personal", "description": "First and last name", "examples": ["James Thornton", "Maria Chen", "Priya Okafor"]},
    "name_male":         {"label": "Male Full Name",        "category": "Personal", "description": "Male-presenting full name", "examples": ["Robert Banks", "David Kim", "Ahmed Hassan"]},
    "name_female":       {"label": "Female Full Name",      "category": "Personal", "description": "Female-presenting full name", "examples": ["Sandra Wells", "Yuki Tanaka", "Fatima Al-Rashid"]},
    "prefix":            {"label": "Name Prefix",           "category": "Personal", "description": "Title prefix", "examples": ["Mr.", "Dr.", "Prof."]},
    "suffix":            {"label": "Name Suffix",           "category": "Personal", "description": "Name suffix", "examples": ["Jr.", "PhD", "III"]},
    "email":             {"label": "Email",                 "category": "Personal", "description": "Email address (derives from name fields if present)", "examples": ["james.thornton@gmail.com", "m.chen42@yahoo.com"]},
    "username":          {"label": "Username",              "category": "Personal", "description": "Derives from name if present", "examples": ["jthornton", "mchen4", "p_okafor"]},
    "password":          {"label": "Password",              "category": "Personal", "description": "Random password string", "examples": ["xK#9mP@q2r", "zT!7vL$w4n"]},
    "gender":            {"label": "Gender",                "category": "Personal", "description": "Configurable gender values", "examples": ["Male", "Female", "Non-binary"]},
    "date_of_birth":     {"label": "Date of Birth",        "category": "Personal", "description": "Random DOB, age 18–90", "examples": ["1987-04-22", "2001-11-09", "1965-07-31"]},
    "age":               {"label": "Age",                   "category": "Personal", "description": "Integer age 18–90", "examples": ["34", "67", "22"]},
    "phone":             {"label": "Phone Number",          "category": "Personal", "description": "Locale-aware phone number", "examples": ["(555) 012-3456", "+44 20 7946 0958"]},
    "ssn":               {"label": "SSN",                   "category": "Personal", "description": "US Social Security Number format", "examples": ["078-05-1120", "219-09-9999"]},
    "language_name":     {"label": "Language",              "category": "Personal", "description": "Human language name", "examples": ["Spanish", "Mandarin", "Swahili"]},
    "prefix":            {"label": "Name Prefix",           "category": "Personal", "description": "Mr., Dr., Prof., etc.", "examples": ["Mr.", "Dr.", "Prof."]},
    "avatar_url":        {"label": "Avatar URL",            "category": "Personal", "description": "Placeholder avatar image URL", "examples": ["https://www.gravatar.com/avatar/abc123?d=identicon"]},
    "job_title":         {"label": "Job Title",             "category": "Personal", "description": "Random job title", "examples": ["Senior Data Engineer", "UX Researcher", "Logistics Coordinator"]},
    "locale_code":       {"label": "Locale Code",           "category": "Personal", "description": "Locale identifier", "examples": ["en_US", "fr_FR", "ja_JP"], "advanced": True},

    # Location
    "street_address":    {"label": "Street Address",        "category": "Location", "description": "Full street address line", "examples": ["742 Evergreen Terrace", "1600 Pennsylvania Ave"]},
    "street_name":       {"label": "Street Name",           "category": "Location", "description": "Street name only, no number", "examples": ["Maple Avenue", "Oak Street", "River Road"]},
    "building_number":   {"label": "Building Number",       "category": "Location", "description": "House or building number", "examples": ["742", "1600", "42"], "advanced": True},
    "address_line_2":    {"label": "Address Line 2",        "category": "Location", "description": "Apt/Suite/PO Box", "examples": ["Apt 4B", "Suite 200", "PO Box 12345"]},
    "city":              {"label": "City",                  "category": "Location", "description": "City name (consistent with state if present)", "examples": ["Austin", "Portland", "Cleveland"]},
    "state":             {"label": "State",                 "category": "Location", "description": "US state (consistent with city if present)", "examples": ["Texas", "Oregon", "Ohio"]},
    "postal_code":       {"label": "Postal Code",           "category": "Location", "description": "ZIP or postal code", "examples": ["78701", "97201", "44101"]},
    "country":           {"label": "Country",               "category": "Location", "description": "Country name", "examples": ["United States", "Germany", "Japan"]},
    "latitude":          {"label": "Latitude",              "category": "Location", "description": "Decimal latitude", "examples": ["40.712776", "-33.868820", "51.507351"]},
    "longitude":         {"label": "Longitude",             "category": "Location", "description": "Decimal longitude", "examples": ["-74.005974", "151.209290", "-0.127758"]},
    "timezone":          {"label": "Timezone",              "category": "Location", "description": "Timezone name", "examples": ["America/New_York", "Europe/London", "Asia/Tokyo"]},
    "military_apo":      {"label": "Military APO",          "category": "Location", "description": "Military APO/FPO address", "examples": ["PSC 3, Box 4579", "APO AE 09021"], "advanced": True},
    "local_latlng":      {"label": "City Lat/Lng",          "category": "Location", "description": "Coordinates of a real city", "examples": ["(40.7128, -74.0060)", "(48.8566, 2.3522)"], "advanced": True},

    # Internet
    "url":               {"label": "URL",                   "category": "Internet", "description": "Full URL with protocol", "examples": ["https://example.com/path", "http://shop.io/products"]},
    "uri":               {"label": "URI",                   "category": "Internet", "description": "Full URI with path", "examples": ["https://api.example.com/v2/users/42"]},
    "uri_path":          {"label": "URI Path",              "category": "Internet", "description": "Path component only", "examples": ["/users/42", "/api/v1/items"], "advanced": True},
    "slug":              {"label": "Slug",                  "category": "Internet", "description": "URL-friendly slug", "examples": ["my-blog-post", "product-name-2024", "how-to-guide"]},
    "domain":            {"label": "Domain Name",           "category": "Internet", "description": "Domain without protocol", "examples": ["example.com", "myshop.io", "data.org"]},
    "tld":               {"label": "TLD",                   "category": "Internet", "description": "Top-level domain", "examples": [".com", ".org", ".io"]},
    "ip_address_v4":     {"label": "IP Address (v4)",       "category": "Internet", "description": "IPv4 address", "examples": ["192.168.1.1", "10.0.0.42", "172.16.254.1"]},
    "ip_address_v6":     {"label": "IP Address (v6)",       "category": "Internet", "description": "IPv6 address", "examples": ["2001:0db8:85a3::8a2e:0370:7334"]},
    "mac_address":       {"label": "MAC Address",           "category": "Internet", "description": "Network MAC address", "examples": ["00:1A:2B:3C:4D:5E", "AA:BB:CC:DD:EE:FF"]},
    "port_number":       {"label": "Port Number",           "category": "Internet", "description": "Network port 0–65535", "examples": ["8080", "443", "3306"]},
    "http_method":       {"label": "HTTP Method",           "category": "Internet", "description": "HTTP verb", "examples": ["GET", "POST", "PUT", "DELETE"]},
    "http_status_code":  {"label": "HTTP Status Code",      "category": "Internet", "description": "HTTP response status code", "examples": ["200", "404", "500", "201"]},
    "user_agent":        {"label": "User Agent",            "category": "Internet", "description": "Browser user agent string", "examples": ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."]},
    "mime_type":         {"label": "MIME Type",             "category": "Internet", "description": "MIME type string", "examples": ["application/json", "image/png", "text/html"]},
    "android_platform_token": {"label": "Android UA Token", "category": "Internet", "description": "Android user-agent token", "examples": ["Android 11; Pixel 5"], "advanced": True},
    "ios_platform_token":    {"label": "iOS UA Token",      "category": "Internet", "description": "iOS user-agent token", "examples": ["iPhone; CPU iPhone OS 15_0"], "advanced": True},

    # Finance
    "currency_code":     {"label": "Currency Code",         "category": "Finance",  "description": "ISO 4217 code", "examples": ["USD", "EUR", "JPY", "GBP"]},
    "price":             {"label": "Price",                 "category": "Finance",  "description": "Decimal amount (configurable range)", "examples": ["19.99", "4.50", "1299.00"]},
    "pricetag":          {"label": "Price Tag",             "category": "Finance",  "description": "Formatted price with symbol", "examples": ["$19.99", "€4.50", "£1,299.00"]},
    "credit_card":       {"label": "Credit Card Number",    "category": "Finance",  "description": "Valid-format card number", "examples": ["4532015112830366", "5425233430109903"]},
    "iban":              {"label": "IBAN",                  "category": "Finance",  "description": "International bank account number", "examples": ["GB29NWBK60161331926819"]},
    "swift":             {"label": "SWIFT / BIC",           "category": "Finance",  "description": "Bank SWIFT/BIC code", "examples": ["DEUTDEDB", "CHASUS33", "BOFAUS3N"]},
    "bban":              {"label": "BBAN",                  "category": "Finance",  "description": "Basic bank account number", "examples": ["20041010050500013M02606"], "advanced": True},
    "cryptocurrency_name":{"label": "Cryptocurrency Name",  "category": "Finance",  "description": "Cryptocurrency name", "examples": ["Bitcoin", "Ethereum", "Dogecoin"]},
    "cryptocurrency_code":{"label": "Cryptocurrency Code",  "category": "Finance",  "description": "Cryptocurrency ticker", "examples": ["BTC", "ETH", "DOGE"]},
    "company_name":      {"label": "Company Name",          "category": "Finance",  "description": "Random company name", "examples": ["Acme Corp", "Initech LLC", "Globodyne Inc"]},
    "catch_phrase":      {"label": "Catch Phrase",          "category": "Finance",  "description": "Company catch phrase", "examples": ["Synergize real-time deliverables", "Innovate frictionless paradigms"]},
    "bs":                {"label": "Business Buzzwords",    "category": "Finance",  "description": "Corporate buzzword phrase", "examples": ["leverage agile frameworks", "disrupt scalable synergies"]},
    "industry":          {"label": "Industry",              "category": "Finance",  "description": "Business industry name", "examples": ["Technology", "Healthcare", "Finance"]},
    "department":        {"label": "Department",            "category": "Finance",  "description": "Company department", "examples": ["Engineering", "Marketing", "HR"]},

    # Vehicle
    "car_make":          {"label": "Car Make",              "category": "Vehicle",  "description": "Car manufacturer", "examples": ["Toyota", "Ford", "BMW"]},
    "car_model":         {"label": "Car Model",             "category": "Vehicle",  "description": "Consistent with Make if present", "examples": ["Camry", "F-150", "3 Series"]},
    "car_year":          {"label": "Car Year",              "category": "Vehicle",  "description": "Production year consistent with Make", "examples": ["2018", "2004", "2022"]},
    "car_vin":           {"label": "Car VIN",               "category": "Vehicle",  "description": "Vehicle identification number", "examples": ["1HGCM82633A004352"]},

    # DateTime
    "date":              {"label": "Date",                  "category": "DateTime", "description": "Configurable date range and format", "examples": ["2022-04-15", "2019-11-03", "2024-07-22"]},
    "time":              {"label": "Time",                  "category": "DateTime", "description": "Random time HH:MM:SS", "examples": ["14:32:07", "09:15:44", "23:01:59"]},
    "datetime":          {"label": "DateTime",              "category": "DateTime", "description": "ISO 8601 datetime string", "examples": ["2022-04-15T14:32:07", "2019-11-03T09:15:44"]},
    "unix_timestamp":    {"label": "Unix Timestamp",        "category": "DateTime", "description": "Seconds since epoch", "examples": ["1713189127", "1572774944"]},

    # Text
    "word":              {"label": "Word",                  "category": "Text",     "description": "Single random word", "examples": ["algorithm", "systemic", "projection"]},
    "words":             {"label": "Words",                 "category": "Text",     "description": "2–5 random words", "examples": ["fast red truck", "open source code"]},
    "sentence":          {"label": "Sentence",              "category": "Text",     "description": "Random sentence", "examples": ["The quick brown fox jumps over the lazy dog."]},
    "paragraph":         {"label": "Paragraph",             "category": "Text",     "description": "Random paragraph", "examples": ["Lorem ipsum dolor sit amet..."]},
    "text":              {"label": "Text Block",            "category": "Text",     "description": "Multi-sentence block", "examples": ["Multiple sentences of generated text..."]},
    "lorem_ipsum":       {"label": "Lorem Ipsum",           "category": "Text",     "description": "Classic placeholder text", "examples": ["Lorem ipsum dolor sit amet, consectetur adipiscing elit."]},
    "slug":              {"label": "Slug",                  "category": "Text",     "description": "URL-friendly slug", "examples": ["my-blog-post", "product-name-2024"]},
    "version":           {"label": "Version Number",        "category": "Text",     "description": "Semver string", "examples": ["3.4.1", "0.12.9", "2.0.0"]},
    "hex_color":         {"label": "Hex Color",             "category": "Text",     "description": "#RRGGBB color", "examples": ["#3a7bd5", "#e8f5e9", "#ff6b6b"]},
    "rgb_color":         {"label": "RGB Color",             "category": "Text",     "description": "RGB tuple string", "examples": ["(58, 123, 213)", "(255, 107, 107)"]},
    "rgb_css_color":     {"label": "CSS RGB Color",         "category": "Text",     "description": "CSS rgb() string", "examples": ["rgb(58, 123, 213)"], "advanced": True},
    "color_name":        {"label": "Color Name",            "category": "Text",     "description": "Human color name", "examples": ["Crimson", "SlateGray", "MediumAquaMarine"]},
    "safe_color_name":   {"label": "Safe Color Name",       "category": "Text",     "description": "Web-safe color name", "examples": ["red", "blue", "green"], "advanced": True},
    "safe_hex_color":    {"label": "Safe Hex Color",        "category": "Text",     "description": "Web-safe hex color", "examples": ["#ff0000", "#00ff00", "#0000ff"], "advanced": True},
    "json_blob":         {"label": "JSON Blob",             "category": "Text",     "description": "Small random JSON object", "examples": ['{"id":"a1b2","value":"word","active":true}']},
    "file_name":         {"label": "File Name",             "category": "Text",     "description": "Random filename with extension", "examples": ["report_2024.pdf", "photo.jpg", "data.csv"]},
    "file_extension":    {"label": "File Extension",        "category": "Text",     "description": "File extension only", "examples": [".pdf", ".jpg", ".xlsx"]},
    "file_path":         {"label": "File Path",             "category": "Text",     "description": "Random file system path", "examples": ["/home/user/docs/report.pdf"], "advanced": True},
    "mime_type":         {"label": "MIME Type",             "category": "Text",     "description": "MIME type string", "examples": ["image/png", "application/pdf", "text/csv"]},
    "isbn13":            {"label": "ISBN-13",               "category": "Text",     "description": "Book ISBN-13 number", "examples": ["978-0-306-40615-7"]},
    "isbn10":            {"label": "ISBN-10",               "category": "Text",     "description": "Book ISBN-10 number", "examples": ["0-306-40615-2"], "advanced": True},
    "ean13":             {"label": "EAN-13 Barcode",        "category": "Text",     "description": "EAN-13 barcode number", "examples": ["5901234123457"]},
    "ean8":              {"label": "EAN-8 Barcode",         "category": "Text",     "description": "EAN-8 barcode number", "examples": ["96385074"], "advanced": True},
    "language_name":     {"label": "Language Name",         "category": "Text",     "description": "Human language name", "examples": ["Spanish", "Mandarin", "Swahili"]},

    # Wacky
    "animal":            {"label": "Animal",                "category": "Wacky",    "description": "Random animal species", "examples": ["Axolotl", "Pangolin", "Quokka"]},
    "spirit_animal":     {"label": "Spirit Animal",         "category": "Wacky",    "description": "Adjective + animal", "examples": ["Anxious Axolotl", "Vengeful Pangolin"]},
    "sworn_enemy":       {"label": "Sworn Enemy",           "category": "Wacky",    "description": "A job title to fear", "examples": ["Senior Tax Accountant", "VP of Compliance"]},
    "favorite_drug":     {"label": "Favorite Drug",         "category": "Wacky",    "description": "Prescription medication name", "examples": ["Pioglitazone Hydrochloride", "Imiquimod"]},
    "last_meal":         {"label": "Last Meal",             "category": "Wacky",    "description": "Random food item", "examples": ["Bagels - Cinn / Brown", "Octopus - Baby, Whole"]},
    "favorite_word":     {"label": "Favorite Word",         "category": "Wacky",    "description": "A single random word", "examples": ["algorithm", "ephemeral", "defenestrate"]},
    "takes_naps":        {"label": "Nap Frequency",         "category": "Wacky",    "description": "Napping habits", "examples": ["Never", "Always", "Only on Tuesdays"]},
    "enemy_of_state":    {"label": "Enemy of the State",    "category": "Wacky",    "description": "Boolean wanted status", "examples": ["true", "false"]},
    "rival_city":        {"label": "Rival City",            "category": "Wacky",    "description": "Nearby city to resent", "examples": ["Huntsville", "Sacramento", "Fort Worth"]},
}

# ── Wacky data pools ──────────────────────────────────────────────────────────
ANIMALS = [
    "African Elephant","Arctic Fox","Axolotl","Bald Eagle","Blue Jay","Capybara",
    "Chameleon","Clouded Leopard","Dingo","Fennec Fox","Giant Panda","Gila Monster",
    "Glasswinged Butterfly","Grizzly Bear","Hagfish","Harpy Eagle","Honey Badger",
    "Hyena (striped)","Ibis","Jaguar","Komodo Dragon","Leafy Sea Dragon","Mantis Shrimp",
    "Moon Bear","Naked Mole Rat","Narwhal","Ocelot","Okapi","Pangolin","Platypus",
    "Quokka","Red Panda","Sand Cat","Shoebill Stork","Slow Loris","Snow Leopard",
    "Tapir","Tardigrade","Tarsier","Tasmanian Devil","Wombat","Wolverine","Yak","Zebu",
    "Desert Kangaroo Rat","Star-nosed Mole","Blobfish","Saiga Antelope","Fossa",
    "Binturong","Patagonian Mara",
]
ADJECTIVES = [
    "Anxious","Bewildered","Chaotic","Dignified","Elusive","Ferocious","Grumpy",
    "Haunted","Irascible","Jubilant","Knowledgeable","Lurking","Mysterious","Nocturnal",
    "Ominous","Paranoid","Quizzical","Reckless","Stoic","Tenacious","Unstoppable",
    "Vengeful","Wistful","Xenophobic","Yearning","Zealous",
]
NAP_FREQUENCY = ["Never","Rarely","Sometimes","Often","Always","Only on Tuesdays","Exclusively"]
MEDICATIONS = [
    "Pioglitazone Hydrochloride","Imiquimod","Docusate Sodium","Brompheniramine Maleate",
    "Metformin","Atorvastatin","Lisinopril","Omeprazole","Sertraline","Gabapentin",
    "Amoxicillin","Levothyroxine","Amlodipine","Metoprolol","Albuterol",
    "Hydrochlorothiazide","Losartan","Simvastatin","Montelukast","Fluoxetine",
]
FOODS = [
    "Bagels - Cinn / Brown","Clams - Bay","Molasses - Fancy","Bagel - Plain",
    "Octopus - Baby, Whole","Bread - White, Sliced","Soup - Cream Of Broccoli",
    "Beef - Short Ribs","Pears - Canned","Pasta - Penne, Dry","Cheese - Mozzarella",
    "Lobster - Tail, 6 Oz","Veal - Kidneys","Bread - Pita, Pocket-less","Duck - Whole",
    "Mushroom - Shitake, Dry","Oil - Sesame","Flour - Semolina","Sauce - Hollandaise",
    "Tea - Decaf Orange Pekoe","Chips Potato All Dressed","Cookies - Amaretto",
    "Muffin Mix - Blueberry","Pork - Tenderloin",
]
CAR_DATA = {
    "Toyota":     {"models": ["Camry","Corolla","RAV4","Highlander","Tacoma","Prius","4Runner"],       "years": range(1990, 2025)},
    "Honda":      {"models": ["Civic","Accord","CR-V","Pilot","HR-V","Odyssey","Fit"],                 "years": range(1990, 2025)},
    "Ford":       {"models": ["F-150","Mustang","Explorer","Escape","Edge","Ranger","Bronco"],         "years": range(1990, 2025)},
    "Chevrolet":  {"models": ["Silverado","Equinox","Malibu","Traverse","Colorado","Camaro"],          "years": range(1990, 2025)},
    "BMW":        {"models": ["3 Series","5 Series","X3","X5","M3","7 Series","X1"],                  "years": range(1995, 2025)},
    "Mercedes":   {"models": ["C-Class","E-Class","GLE","GLC","S-Class","A-Class"],                   "years": range(1995, 2025)},
    "Audi":       {"models": ["A4","A6","Q5","Q7","A3","Q3","TT"],                                    "years": range(1995, 2025)},
    "Volkswagen": {"models": ["Jetta","Golf","Passat","Tiguan","Atlas","Beetle"],                      "years": range(1990, 2025)},
    "Nissan":     {"models": ["Altima","Sentra","Rogue","Murano","Frontier","Maxima"],                 "years": range(1990, 2025)},
    "Hyundai":    {"models": ["Elantra","Sonata","Tucson","Santa Fe","Kona","Palisade"],              "years": range(2000, 2025)},
    "Subaru":     {"models": ["Outback","Forester","Impreza","Legacy","Crosstrek","WRX"],              "years": range(1995, 2025)},
    "Jeep":       {"models": ["Wrangler","Cherokee","Grand Cherokee","Compass","Gladiator"],           "years": range(1990, 2025)},
    "Cadillac":   {"models": ["Escalade","CT5","XT5","CT4","XT4","Eldorado","Seville"],               "years": range(1990, 2025)},
    "Oldsmobile": {"models": ["98","Cutlass","Aurora","Alero","Bravada"],                              "years": range(1990, 2005)},
    "Mitsubishi": {"models": ["Galant","Eclipse","Outlander","Lancer","Mirage"],                       "years": range(1990, 2025)},
    "Dodge":      {"models": ["Ram 1500","Charger","Challenger","Durango","Journey"],                  "years": range(1990, 2025)},
    "Kia":        {"models": ["Sorento","Sportage","Optima","Soul","Telluride","Forte"],               "years": range(2000, 2025)},
}
US_CITIES_BY_STATE = {
    "Alabama":       ["Birmingham","Montgomery","Huntsville","Mobile"],
    "Alaska":        ["Anchorage","Fairbanks","Juneau"],
    "Arizona":       ["Phoenix","Tucson","Mesa","Scottsdale"],
    "Arkansas":      ["Little Rock","Fort Smith","Fayetteville"],
    "California":    ["Los Angeles","San Francisco","San Diego","Sacramento","San Jose"],
    "Colorado":      ["Denver","Colorado Springs","Aurora","Boulder"],
    "Connecticut":   ["Bridgeport","New Haven","Hartford","Stamford"],
    "Florida":       ["Miami","Orlando","Tampa","Jacksonville","Fort Lauderdale"],
    "Georgia":       ["Atlanta","Augusta","Savannah","Columbus"],
    "Hawaii":        ["Honolulu","Hilo","Kailua"],
    "Idaho":         ["Boise","Nampa","Meridian"],
    "Illinois":      ["Chicago","Aurora","Naperville","Peoria"],
    "Indiana":       ["Indianapolis","Fort Wayne","Evansville"],
    "Iowa":          ["Des Moines","Cedar Rapids","Davenport"],
    "Kansas":        ["Wichita","Overland Park","Kansas City"],
    "Kentucky":      ["Louisville","Lexington","Bowling Green"],
    "Louisiana":     ["New Orleans","Baton Rouge","Shreveport"],
    "Maine":         ["Portland","Lewiston","Bangor"],
    "Maryland":      ["Baltimore","Annapolis","Rockville"],
    "Massachusetts": ["Boston","Worcester","Springfield","Cambridge"],
    "Michigan":      ["Detroit","Grand Rapids","Lansing","Ann Arbor"],
    "Minnesota":     ["Minneapolis","Saint Paul","Rochester"],
    "Mississippi":   ["Jackson","Gulfport","Biloxi"],
    "Missouri":      ["Kansas City","Saint Louis","Springfield"],
    "Montana":       ["Billings","Missoula","Great Falls"],
    "Nebraska":      ["Omaha","Lincoln","Bellevue"],
    "Nevada":        ["Las Vegas","Reno","Henderson"],
    "New Hampshire": ["Manchester","Nashua","Concord"],
    "New Jersey":    ["Newark","Jersey City","Trenton","Camden"],
    "New Mexico":    ["Albuquerque","Santa Fe","Las Cruces"],
    "New York":      ["New York City","Buffalo","Rochester","Syracuse","Albany"],
    "North Carolina":["Charlotte","Raleigh","Greensboro","Durham"],
    "North Dakota":  ["Fargo","Bismarck","Grand Forks"],
    "Ohio":          ["Columbus","Cleveland","Cincinnati","Toledo"],
    "Oklahoma":      ["Oklahoma City","Tulsa","Norman"],
    "Oregon":        ["Portland","Salem","Eugene"],
    "Pennsylvania":  ["Philadelphia","Pittsburgh","Allentown","Erie"],
    "Rhode Island":  ["Providence","Cranston","Warwick"],
    "South Carolina":["Columbia","Charleston","Greenville"],
    "South Dakota":  ["Sioux Falls","Rapid City","Aberdeen"],
    "Tennessee":     ["Memphis","Nashville","Knoxville","Chattanooga"],
    "Texas":         ["Houston","San Antonio","Dallas","Austin","Fort Worth"],
    "Utah":          ["Salt Lake City","West Valley City","Provo"],
    "Vermont":       ["Burlington","South Burlington","Rutland"],
    "Virginia":      ["Virginia Beach","Norfolk","Chesapeake","Richmond"],
    "Washington":    ["Seattle","Spokane","Tacoma","Vancouver"],
    "West Virginia": ["Charleston","Huntington","Morgantown"],
    "Wisconsin":     ["Milwaukee","Madison","Green Bay"],
    "Wyoming":       ["Cheyenne","Casper","Laramie"],
}

def _generate_value(field: FieldDefinition, fake: Faker, row_index: int, row_context: dict):
    """
    Generate a single value for one field.

    Args:
        field:       The field definition (name, type, options).
        fake:        A Faker instance for the current locale.
        row_index:   0-based row index, used by row_number and sequence.
        row_context: Dict of values already generated for this row, keyed by
                     both field name and field type. Relational fields (city,
                     email, car_model, etc.) read from this to stay consistent
                     with other fields in the same row.

    Returns:
        A Python value (str, int, float, bool, None, or dict for json_blob).
    """
    t = field.type
    opts = field.options or {}

    if t == "row_number":    return row_index + 1
    if t == "guid":          return str(fake.uuid4())
    if t == "boolean":       return fake.boolean()
    if t == "null_boolean":  return fake.null_boolean()
    if t == "fixed_value":   return opts.get("value", "")
    if t == "custom_list":
        values = opts.get("values", [])
        return random.choice(values) if values else None
    if t == "weighted_list":
        items = opts.get("items", [])
        if not items: return None
        return random.choices([i["value"] for i in items], weights=[i.get("weight",1) for i in items], k=1)[0]
    if t == "number":
        mn, mx, dec = opts.get("min",0), opts.get("max",1000), opts.get("decimals",0)
        val = random.uniform(mn, mx)
        return round(val, dec) if dec > 0 else int(val)
    if t == "sequence":
        return opts.get("start", 1) + row_index * opts.get("step", 1)
    if t == "regex":
        try: return fake.bothify(opts.get("pattern","???###"))
        except: return fake.bothify("???###")
    if t == "md5":    return fake.md5()
    if t == "sha1":   return fake.sha1()
    if t == "sha256": return fake.sha256()

    # Personal
    if t == "first_name":    return fake.first_name()
    if t == "last_name":     return fake.last_name()
    if t == "full_name":     return fake.name()
    if t == "name_male":     return fake.name_male()
    if t == "name_female":   return fake.name_female()
    if t == "prefix":        return fake.prefix()
    if t == "suffix":        return fake.suffix()
    if t == "language_name": return fake.language_name()
    if t == "locale_code":   return fake.locale()
    if t == "email":
        first = re.sub(r"[^a-z0-9]","", (row_context.get("first_name","") or fake.first_name()).lower())
        last  = re.sub(r"[^a-z0-9]","", (row_context.get("last_name","")  or fake.last_name()).lower())
        sep    = random.choice([".",  "_", ""])
        suffix = str(random.randint(0,999)) if random.random() < 0.3 else ""
        domain = opts.get("domain") or fake.free_email_domain()
        return f"{first}{sep}{last}{suffix}@{domain}"
    if t == "username":
        first = re.sub(r"[^a-z0-9]","", (row_context.get("first_name","") or fake.first_name()).lower())
        last  = re.sub(r"[^a-z0-9]","", (row_context.get("last_name","")  or fake.last_name()).lower())
        suffix = str(random.randint(0,9)) if random.random() < 0.4 else ""
        return f"{first}{last[:1]}{suffix}"
    if t == "password":      return fake.password(length=random.randint(10,16), special_chars=True)
    if t == "gender":
        choices = opts.get("values", ["Male","Female","Non-binary","Agender","Genderfluid"])
        return random.choice(choices)
    if t == "date_of_birth": return fake.date_of_birth(minimum_age=18, maximum_age=90).isoformat()
    if t == "age":           return random.randint(18, 90)
    if t == "phone":         return fake.phone_number()
    if t == "ssn":           return fake.ssn()
    if t == "avatar_url":
        style = opts.get("style","identicon")
        return f"https://www.gravatar.com/avatar/{fake.md5()}?d={style}&s=200"
    if t == "job_title":     return fake.job()

    # Location
    if t == "state":
        state = random.choice(list(US_CITIES_BY_STATE.keys()))
        row_context["_state"] = state
        return state
    if t == "city":
        state = row_context.get("state") or row_context.get("_state")
        if state and state in US_CITIES_BY_STATE:
            return random.choice(US_CITIES_BY_STATE[state])
        return fake.city()
    if t == "postal_code":      return fake.postcode()
    if t == "country":          return fake.country()
    if t == "street_address":   return fake.street_address()
    if t == "street_name":      return fake.street_name()
    if t == "building_number":  return fake.building_number()
    if t == "address_line_2":
        return random.choice([f"Apt {random.randint(1,9999)}", f"Suite {random.randint(100,999)}", f"PO Box {random.randint(1000,99999)}", f"Unit {random.randint(1,50)}", ""])
    if t == "latitude":         return round(float(str(fake.latitude())), 6)
    if t == "longitude":        return round(float(str(fake.longitude())), 6)
    if t == "timezone":         return fake.timezone()
    if t == "military_apo":     return fake.military_apo()
    if t == "local_latlng":
        result = fake.local_latlng()
        return f"{result[0]}, {result[1]}" if result else f"{fake.latitude()}, {fake.longitude()}"

    # Internet
    if t == "url":               return fake.url()
    if t == "uri":               return fake.uri()
    if t == "uri_path":          return fake.uri_path()
    if t == "slug":              return fake.slug()
    if t == "domain":            return fake.domain_name()
    if t == "tld":               return fake.tld()
    if t == "ip_address_v4":     return fake.ipv4()
    if t == "ip_address_v6":     return fake.ipv6()
    if t == "mac_address":       return fake.mac_address()
    if t == "port_number":       return fake.port_number()
    if t == "http_method":       return random.choice(["GET","POST","PUT","DELETE","PATCH","HEAD"])
    if t == "http_status_code":  return fake.http_status_code()
    if t == "user_agent":        return fake.user_agent()
    if t == "mime_type":         return fake.mime_type()
    if t == "android_platform_token": return fake.android_platform_token()
    if t == "ios_platform_token":     return fake.ios_platform_token()

    # Finance
    if t == "currency_code":
        return random.choice(["USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY","INR","MXN","BRL","KRW"])
    if t == "price":
        return round(random.uniform(opts.get("min",0.99), opts.get("max",999.99)), 2)
    if t == "pricetag":          return fake.pricetag()
    if t == "credit_card":       return fake.credit_card_number()
    if t == "iban":              return fake.iban()
    if t == "swift":             return fake.swift()
    if t == "bban":              return fake.bban()
    if t == "cryptocurrency_name": return fake.cryptocurrency_name()
    if t == "cryptocurrency_code": return fake.cryptocurrency_code()
    if t == "company_name":      return fake.company()
    if t == "catch_phrase":      return fake.catch_phrase()
    if t == "bs":                return fake.bs()
    if t == "industry":
        return random.choice(["Technology","Healthcare","Finance","Retail","Manufacturing","Education","Real Estate","Transportation","Energy","Entertainment","Agriculture","Construction","Hospitality","Legal","Media"])
    if t == "department":
        return random.choice(["Engineering","Marketing","Sales","Finance","Human Resources","Legal","Operations","Product","Design","Customer Success","IT","Research & Development","Procurement","Logistics"])

    # Vehicle
    if t == "car_make":
        make = random.choice(list(CAR_DATA.keys()))
        row_context["_car_make"] = make
        return make
    if t == "car_model":
        make = row_context.get("car_make") or row_context.get("_car_make") or random.choice(list(CAR_DATA.keys()))
        if make not in CAR_DATA: make = random.choice(list(CAR_DATA.keys()))
        model = random.choice(CAR_DATA[make]["models"])
        return model
    if t == "car_year":
        make = row_context.get("car_make") or row_context.get("_car_make")
        if make and make in CAR_DATA: return random.choice(list(CAR_DATA[make]["years"]))
        return random.randint(1990, 2024)
    if t == "car_vin":
        chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"
        return "".join(random.choices(chars, k=17))

    # DateTime
    if t == "date":
        fmt = opts.get("format", "%Y-%m-%d")
        return fake.date_between(start_date=opts.get("start_date","-30y"), end_date=opts.get("end_date","today")).strftime(fmt)
    if t == "time":          return fake.time()
    if t == "datetime":      return fake.date_time_this_decade().isoformat()
    if t == "unix_timestamp":return int(fake.date_time_this_decade().timestamp())

    # Text
    if t == "word":          return fake.word()
    if t == "words":         return " ".join(fake.words(nb=opts.get("count", random.randint(2,5))))
    if t == "sentence":      return fake.sentence()
    if t == "paragraph":     return fake.paragraph()
    if t == "text":          return fake.text(max_nb_chars=opts.get("max_chars", 300))
    if t == "lorem_ipsum":   return fake.paragraph(nb_sentences=opts.get("sentences", 3))
    if t == "version":       return f"{random.randint(0,12)}.{random.randint(0,99)}.{random.randint(0,99)}"
    if t == "hex_color":     return fake.color()
    if t == "rgb_color":     return fake.rgb_color()
    if t == "rgb_css_color": return fake.rgb_css_color()
    if t == "color_name":    return fake.color_name()
    if t == "safe_color_name": return fake.safe_color_name()
    if t == "safe_hex_color":  return fake.safe_hex_color()
    if t == "json_blob":     return {"id": str(fake.uuid4())[:8], "value": fake.word(), "active": fake.boolean(), "score": round(random.uniform(0,100),2)}
    if t == "file_name":     return fake.file_name()
    if t == "file_extension":return fake.file_extension()
    if t == "file_path":     return fake.file_path()
    if t == "mime_type":     return fake.mime_type()
    if t == "isbn13":        return fake.isbn13()
    if t == "isbn10":        return fake.isbn10()
    if t == "ean13":         return fake.ean13()
    if t == "ean8":          return fake.ean8()
    if t == "slug":          return fake.slug()
    if t == "language_name": return fake.language_name()

    # Wacky
    if t == "animal":        return random.choice(ANIMALS)
    if t == "spirit_animal": return f"{random.choice(ADJECTIVES)} {random.choice(ANIMALS)}"
    if t == "sworn_enemy":   return fake.job()
    if t == "favorite_drug": return random.choice(MEDICATIONS)
    if t == "last_meal":     return random.choice(FOODS)
    if t == "favorite_word": return fake.word()
    if t == "takes_naps":    return random.choice(NAP_FREQUENCY)
    if t == "enemy_of_state":return fake.boolean()
    if t == "rival_city":
        state = row_context.get("state") or row_context.get("_state")
        if state and state in US_CITIES_BY_STATE:
            cities = US_CITIES_BY_STATE[state]
            current = row_context.get("city")
            rivals = [c for c in cities if c != current]
            return random.choice(rivals if rivals else cities)
        return fake.city()

    return None


def generate_row(fields, fake, row_index):
    """
    Generate one complete row as a dict.

    Iterates over fields in order, generating each value and storing it in
    row_context by both field type and field name. This means a field defined
    later in the list can see what was produced by earlier fields — which is how
    city stays consistent with state, email derives from first_name/last_name, etc.
    """
    row, context = {}, {}
    for field in fields:
        val = _generate_value(field, fake, row_index, context)
        row[field.name] = val
        context[field.type] = val
        context[field.name] = val
    return row


def generate_dataset(fields, rows, locale="en_US", seed=None, output_format="json"):
    """
    Generate a complete dataset.

    Args:
        fields:        List of FieldDefinition objects describing the schema.
        rows:          Number of rows to generate (capped at config.max_rows).
        locale:        Faker locale string (e.g. "en_US", "fr_FR").
        seed:          Optional integer seed for reproducible output.
        output_format: "json" returns a list of dicts; "csv" returns a CSV string.

    Returns:
        (data, content_type) tuple. data is a list for JSON or a string for CSV.
    """
    from config import settings as cfg
    rows = min(rows, cfg.max_rows)
    fake = get_faker(locale)
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)
    records = [generate_row(fields, fake, i) for i in range(rows)]
    if output_format == "csv":
        if not records: return "", "text/csv"
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=[f.name for f in fields])
        writer.writeheader()
        writer.writerows(records)
        return buf.getvalue(), "text/csv"
    return records, "application/json"


def get_field_types_grouped():
    grouped = {}
    for type_key, meta in FIELD_TYPES.items():
        cat = meta["category"]
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append({
            "type": type_key,
            "label": meta["label"],
            "description": meta.get("description",""),
            "examples": meta.get("examples", []),
            "advanced": meta.get("advanced", False),
        })
    return grouped
