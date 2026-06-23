import unittest

from fakerjs_catalog import FAKERJS_FIELD_TYPES, get_fakerjs_field_types_grouped


class FakerJSCatalogTests(unittest.TestCase):
    def test_catalog_contains_api_modules(self):
        grouped = get_fakerjs_field_types_grouped()

        for category in [
            "Airline",
            "Animal",
            "Book",
            "Color",
            "Commerce",
            "Company",
            "Database",
            "Datatype",
            "Date",
            "Finance",
            "Food",
            "Git",
            "Hacker",
            "Image",
            "Internet",
            "Location",
            "Lorem",
            "Music",
            "Number",
            "Person",
            "Phone",
            "Science",
            "String",
            "System",
            "Vehicle",
            "Word",
        ]:
            self.assertIn(category, grouped)

    def test_catalog_entries_have_required_metadata(self):
        for key, meta in FAKERJS_FIELD_TYPES.items():
            self.assertIn(".", key)
            self.assertIn("label", meta)
            self.assertIn("category", meta)
            self.assertIn("path", meta)
            self.assertIn("description", meta)
            self.assertIsInstance(meta.get("examples", []), list)


if __name__ == "__main__":
    unittest.main()
