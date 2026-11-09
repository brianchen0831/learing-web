"""The paper doll catalog: genders, skin colors, layers and parts, plus the shop prices.

A saved avatar looks like:
    {"version": 2, "gender": "male", "skin": "warm", "hair_color": "black",
     "parts": {"eyes": "eyes-simple", "hair": "hair-short-black", ...}}

`parts` maps a layer to one part. A part fits a gender when it has a file for it.
`hair_color` is one of the catalog's free hair colors; an avatar saved without one uses the first.

Prices are not in parts.json. They are in shop lists, one per art folder:
    account/avatar-art/<folder>/shop.json   {"items": [{"id": "<part id>", "price": 60}, ...]}
A part with a price above 0 is sold in the shops and must be owned to wear; a part in no
list is free. The lists are read again whenever one of them changes, so prices can be
changed without restarting the server.
"""
import json
import os
import sys

AVATAR_VERSION = 2
SHOP_LIST = "shop.json"


class Catalog:
    def __init__(self, path, shop_folder=None):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        self.data = data
        self.genders = [g["id"] for g in data["genders"]]
        self.skins = [s["id"] for s in data["skins"]]
        self.default_skin = next((s["id"] for s in data["skins"] if s.get("default")), self.skins[0])
        self.layers = [layer["id"] for layer in data["layers"]]
        self.required = [layer["id"] for layer in data["layers"] if layer.get("required")]
        self.parts = {part["id"]: part for part in data["parts"]}
        self.hair_colors = [c["id"] for c in data.get("hairColors", [])] or ["black"]
        self.shop_folder = shop_folder
        self._prices = {}
        self._stamp = None
        self._reload_prices(strict=True)

    # ------------------------------------------------------------ prices

    def _shop_files(self):
        if not self.shop_folder or not os.path.isdir(self.shop_folder):
            return []
        files = []
        for name in sorted(os.listdir(self.shop_folder)):
            path = os.path.join(self.shop_folder, name, SHOP_LIST)
            if os.path.isfile(path) and not os.path.islink(path):
                files.append(path)
        return files

    def _read_prices(self):
        """All shop lists as {part id: price}. Raises ValueError on a mistake, naming the file."""
        prices = {}
        for path in self._shop_files():
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            items = data.get("items") if isinstance(data, dict) else None
            if not isinstance(items, list):
                raise ValueError(f"{path}: needs {{\"items\": [...]}}")
            for item in items:
                part_id = item.get("id") if isinstance(item, dict) else None
                price = item.get("price") if isinstance(item, dict) else None
                if part_id not in self.parts:
                    raise ValueError(f"{path}: unknown part {part_id!r} (not in parts.json)")
                if isinstance(price, bool) or not isinstance(price, int) or price < 0:
                    raise ValueError(f"{path}: price of {part_id!r} must be a whole number, 0 or more")
                if part_id in prices:
                    raise ValueError(f"{path}: {part_id!r} is priced in more than one shop list")
                prices[part_id] = price
        return prices

    def _reload_prices(self, strict=False):
        files = self._shop_files()
        stamp = tuple((p, os.stat(p).st_mtime_ns) for p in files)
        if stamp == self._stamp:
            return
        try:
            self._prices = self._read_prices()
        except (OSError, ValueError) as error:
            if strict:
                raise
            # Keep the last good prices; say why the new ones were not used
            print(f"shop lists not reloaded: {error}", file=sys.stderr)
        self._stamp = stamp

    def price(self, part_id):
        self._reload_prices()
        return self._prices.get(part_id, 0)

    def public(self):
        """The catalog as the site gets it: parts.json with each part's price filled in."""
        self._reload_prices()
        data = dict(self.data)
        data["parts"] = [dict(part, price=self._prices.get(part["id"], 0)) for part in self.data["parts"]]
        return data

    # ------------------------------------------------------------ avatars

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
        skin = skin if skin in self.skins else self.default_skin
        return {"version": AVATAR_VERSION, "gender": gender, "skin": skin,
                "hair_color": self.hair_colors[0], "parts": self.default_parts(gender)}

    def is_for_sale(self, part_id):
        return part_id in self.parts and self.price(part_id) > 0
