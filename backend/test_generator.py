import unittest

from generator import generate_dataset
from models import FieldDefinition


class BlankPercentTests(unittest.TestCase):
    def test_blank_percent_100_always_returns_null(self):
        fields = [
            FieldDefinition(
                name="email",
                type="email",
                options={"blank_percent": 100},
            )
        ]

        data, content_type = generate_dataset(fields, rows=5, seed=123)

        self.assertEqual(content_type, "application/json")
        self.assertEqual([row["email"] for row in data], [None, None, None, None, None])

    def test_blank_percent_0_does_not_blank_value(self):
        fields = [
            FieldDefinition(
                name="first_name",
                type="first_name",
                options={"blank_percent": 0},
            )
        ]

        data, _ = generate_dataset(fields, rows=5, seed=123)

        self.assertTrue(all(row["first_name"] for row in data))

    def test_blank_percent_is_clamped_to_100(self):
        fields = [
            FieldDefinition(
                name="name",
                type="full_name",
                options={"blank_percent": 250},
            )
        ]

        data, _ = generate_dataset(fields, rows=3, seed=123)

        self.assertEqual([row["name"] for row in data], [None, None, None])

    def test_negative_blank_percent_is_clamped_to_0(self):
        fields = [
            FieldDefinition(
                name="name",
                type="full_name",
                options={"blank_percent": -50},
            )
        ]

        data, _ = generate_dataset(fields, rows=3, seed=123)

        self.assertTrue(all(row["name"] for row in data))


class FakerJSGenerationTests(unittest.TestCase):
    def test_fakerjs_field_generates_value(self):
        fields = [
            FieldDefinition(name="first_name", type="person.firstName", options={})
        ]

        data, _ = generate_dataset(fields, rows=2, seed=123)

        self.assertEqual(len(data), 2)
        self.assertTrue(
            all(isinstance(row["first_name"], str) and row["first_name"] for row in data)
        )


class FakerJSBatchTests(unittest.TestCase):
    def test_multiple_fakerjs_fields_generate_for_multiple_rows(self):
        fields = [
            FieldDefinition(name="first_name", type="person.firstName", options={}),
            FieldDefinition(name="email", type="internet.email", options={}),
        ]

        data, _ = generate_dataset(fields, rows=3, seed=321)

        self.assertEqual(len(data), 3)
        self.assertTrue(all(row["first_name"] for row in data))
        self.assertTrue(all("@" in row["email"] for row in data))


if __name__ == "__main__":
    unittest.main()
