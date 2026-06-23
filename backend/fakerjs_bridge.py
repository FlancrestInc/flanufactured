import json
import subprocess
from pathlib import Path

from fakerjs_catalog import FAKERJS_FIELD_TYPES


HELPER_PATH = Path(__file__).with_name("fakerjs_generate.mjs")


def _helper_catalog():
    return {
        key: {
            "path": meta["path"],
            "args": meta.get("args", []),
        }
        for key, meta in FAKERJS_FIELD_TYPES.items()
    }


def generate_fakerjs_values(requests, seed=None):
    payload = {
        "seed": seed,
        "catalog": _helper_catalog(),
        "requests": requests,
    }
    completed = subprocess.run(
        ["node", str(HELPER_PATH)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or "FakerJS generation failed")
    return json.loads(completed.stdout)["values"]
