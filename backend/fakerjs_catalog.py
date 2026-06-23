MODULE_METHODS = {
    "Airline": ["aircraftType", "airline", "airplane", "airport", "flightNumber", "recordLocator", "seat"],
    "Animal": ["bear", "bird", "cat", "cetacean", "cow", "crocodilia", "dog", "fish", "horse", "insect", "lion", "petName", "rabbit", "rodent", "snake", "type"],
    "Book": ["author", "format", "genre", "publisher", "series", "title"],
    "Color": ["cmyk", "colorByCSSColorSpace", "cssSupportedFunction", "cssSupportedSpace", "hsl", "human", "hwb", "lab", "lch", "rgb", "space"],
    "Commerce": ["department", "isbn", "price", "product", "productAdjective", "productDescription", "productMaterial", "productName", "upc"],
    "Company": ["buzzAdjective", "buzzNoun", "buzzPhrase", "buzzVerb", "catchPhrase", "catchPhraseAdjective", "catchPhraseDescriptor", "catchPhraseNoun", "name"],
    "Database": ["collation", "column", "engine", "mongodbObjectId", "type"],
    "Datatype": ["boolean"],
    "Date": ["anytime", "between", "betweens", "birthdate", "future", "month", "past", "recent", "soon", "timeZone", "weekday"],
    "Finance": ["accountName", "accountNumber", "amount", "bic", "bitcoinAddress", "creditCardCVV", "creditCardIssuer", "creditCardNumber", "currency", "currencyCode", "currencyName", "currencyNumericCode", "currencySymbol", "ethereumAddress", "iban", "litecoinAddress", "pin", "routingNumber", "transactionDescription", "transactionType"],
    "Food": ["adjective", "description", "dish", "ethnicCategory", "fruit", "ingredient", "meat", "spice", "vegetable"],
    "Git": ["branch", "commitDate", "commitEntry", "commitMessage", "commitSha"],
    "Hacker": ["abbreviation", "adjective", "ingverb", "noun", "phrase", "verb"],
    "Image": ["avatar", "avatarGitHub", "dataUri", "personPortrait", "url", "urlLoremFlickr", "urlPicsumPhotos"],
    "Internet": ["displayName", "domainName", "domainSuffix", "domainWord", "email", "emoji", "exampleEmail", "httpMethod", "httpStatusCode", "ip", "ipv4", "ipv6", "jwt", "jwtAlgorithm", "mac", "password", "port", "protocol", "url", "userAgent", "username"],
    "Location": ["buildingNumber", "cardinalDirection", "city", "continent", "country", "countryCode", "county", "direction", "language", "latitude", "longitude", "nearbyGPSCoordinate", "ordinalDirection", "postalAddress", "secondaryAddress", "state", "street", "streetAddress", "timeZone", "zipCode"],
    "Lorem": ["lines", "paragraph", "paragraphs", "sentence", "sentences", "slug", "text", "word", "words"],
    "Music": ["album", "artist", "genre", "songName"],
    "Number": ["bigInt", "binary", "float", "hex", "int", "octal", "romanNumeral"],
    "Person": ["bio", "firstName", "fullName", "gender", "jobArea", "jobDescriptor", "jobTitle", "jobType", "lastName", "middleName", "prefix", "sex", "sexType", "suffix", "zodiacSign"],
    "Phone": ["imei", "number"],
    "Science": ["chemicalElement", "unit"],
    "String": ["alpha", "alphanumeric", "binary", "fromCharacters", "hexadecimal", "nanoid", "numeric", "octal", "sample", "symbol", "ulid", "uuid"],
    "System": ["commonFileExt", "commonFileName", "commonFileType", "cron", "directoryPath", "fileExt", "fileName", "filePath", "fileType", "mimeType", "networkInterface", "semver"],
    "Vehicle": ["bicycle", "color", "fuel", "manufacturer", "model", "type", "vehicle", "vin", "vrm"],
    "Word": ["adjective", "adverb", "conjunction", "interjection", "noun", "preposition", "sample", "verb", "words"],
}

DEFAULT_ARGS = {
    "color.colorByCSSColorSpace": [{"space": "sRGB", "format": "css"}],
    "date.between": [{"from": "2020-01-01T00:00:00.000Z", "to": "2030-01-01T00:00:00.000Z"}],
    "date.betweens": [{"from": "2020-01-01T00:00:00.000Z", "to": "2030-01-01T00:00:00.000Z", "count": 2}],
    "string.fromCharacters": ["ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"],
}


def _module_key(category: str) -> str:
    return category[0].lower() + category[1:]


def _label(method: str) -> str:
    chars = []
    for ch in method:
        if ch.isupper():
            chars.append(" ")
        chars.append(ch)
    return "".join(chars).strip().title()


def _description(category: str, method: str) -> str:
    return f"FakerJS {category}.{method}() value"


FAKERJS_FIELD_TYPES = {
    f"{_module_key(category)}.{method}": {
        "label": _label(method),
        "category": category,
        "description": _description(category, method),
        "examples": [],
        "path": f"{_module_key(category)}.{method}",
        "args": DEFAULT_ARGS.get(f"{_module_key(category)}.{method}", []),
        "fakerjs": True,
    }
    for category, methods in MODULE_METHODS.items()
    for method in methods
}


def get_fakerjs_field_types_grouped():
    grouped = {}
    for type_key, meta in FAKERJS_FIELD_TYPES.items():
        category = meta["category"]
        grouped.setdefault(category, []).append({
            "type": type_key,
            "label": meta["label"],
            "description": meta["description"],
            "examples": meta.get("examples", []),
            "advanced": meta.get("advanced", False),
        })
    return grouped
