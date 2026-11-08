"""The paper doll catalog: genders, skin colors, layers and parts.

A saved avatar looks like:
    {"version": 2, "gender": "male", "skin": "warm", "hair_color": "black",
     "parts": {"eyes": "eyes-simple", "hair": "hair-short-black", ...}}

`parts` maps a layer to one part. A part fits a gender when it has a file for it.
`hair_color` is one of the catalog's free hair colors; an avatar saved without one uses the first.
Parts with a price above 0 are sold in the dressing room and must be owned to wear.
"""
import json

AVATAR_VERSION = 2


class Catalog:
    def __init__(self, path):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        self.genders = [g["id"] for g in data["genders"]]
        self.skins = [s["id"] for s in data["skins"]]
        self.layers = [layer["id"] for layer in data["layers"]]
        self.required = [layer["id"] for layer in data["layers"] if layer.get("required")]
        self.parts = {part["id"]: part for part in data["parts"]}
        self.hair_colors = [c["id"] for c in data.get("hairColors", [])] or ["black"]

    def fits(self, part, gender):
        return gender in part.get("files", {})

    def default_parts(self, gender):
        return {
            part["layer"]: part["id"]
            for part in self.parts.values()
            if part.get("default") and self.fits(part, gender)
        }

    def default_avatar(self, gender=None, skin=None):
        gender = gender if gender in self.genders else self.genders[0]
        skin = skin if skin in self.skins else self.skins[0]
        return {"version": AVATAR_VERSION, "gender": gender, "skin": skin,
                "hair_color": self.hair_colors[0], "parts": self.default_parts(gender)}

    def is_for_sale(self, part_id):
        part = self.parts.get(part_id)
        return bool(part) and part.get("price", 0) > 0
