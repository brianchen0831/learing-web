# Accounts and avatars 帳號與角色

Users can create an account, log in and log out, and customize an avatar.

## Code 程式碼

All account code is in two folders:

| File | Purpose |
| ---- | ------- |
| `account/store.py` | Encrypted accounts, password checks, sessions, avatar checks |
| `account/keys.py` | Loads or creates the secret key |
| `account/routes.py` | The `/api/account/` requests |
| `public/src/account/auth.js` | The logged-in user, shared by every page |
| `public/src/account/UserAvatar.js` | Draws the avatar |
| `public/src/account/AvatarPicker.js` | The customizer, used when registering and on the avatar page |
| `public/src/account/*View.js` | The login, register, account and avatar pages |

## Pages 頁面

| URL | Page |
| --- | ---- |
| `/register` | Name, password and avatar |
| `/login` | Name and password |
| `/account` | Full-body avatar, name and **Customize avatar**. Needs a login. |
| `/account/avatar` | The avatar customizer. Needs a login. |
| `/account/shop` | The dressing room and shop. Needs a login. |

The top right shows **Log in**, or the head icon, name and **Log out**. On wide screens, the home page sidebar shows the full-body avatar with the name, coins and a link to the dressing room, or a login hint when logged out. Names are 1–30 characters and do not depend on capital letters: `Amy` and `amy` are the same account. Passwords are 6–128 characters.

## Storage 資料儲存

Each account is one file in `<database>/accounts/`:

- **File name:** a keyed hash (HMAC-SHA256) of the name, so the name cannot be read from it.
- **Content:** one encrypted block (Fernet: AES-128 with an HMAC) holding the name, password hash, avatar, coins, owned items and creation time. A changed file is rejected.
- **Password:** never stored. Only a salted scrypt hash is kept, and that is inside the encrypted block.

To add account details later, add fields to the record in `AccountStore.create`, and to `AccountStore.public` if the browser needs them. Existing accounts will need a default for a new field.

## The secret key 金鑰

`secret.key` encrypts every account. It is created on first start, at the path set by `secret_key_path` in `config.json`, and git ignores it.

- **Keep a safe copy. Without it, accounts can never be read again.** 請妥善備份，金鑰遺失後帳號將永遠無法讀取。
- If accounts exist and the key is missing, the server stops instead of making a new one.
- Keep the key apart from any copy of the database. Anyone with both can read the accounts.
- Word lists are not encrypted.

## Login sessions 登入狀態

- A login creates a random token, sent as a cookie that page scripts cannot read (`HttpOnly`, `SameSite=Strict`), and lasts 7 days.
- Sessions are kept in memory, so restarting the server logs everyone out.
- Five wrong tries for a name lock that name for one minute. The lock is in memory too.
- Wrong passwords and unknown names give the same message.
- Writes are refused from other websites, the same way as word lists.

## Limits 限制

- There is no password reset, because no email is stored. A forgotten password cannot be recovered.
- The site uses plain HTTP, which is safe only because the server listens on this computer alone. Opening it to a network needs HTTPS and the `Secure` cookie flag first.
- Quiz scores are still saved in the browser, not in the account.
- Creating word lists does not need a login.

## API 介面

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/account/me` | `{ "user": { "name", "avatar" } }`, or `{ "user": null }` |
| `POST /api/account/register` | `{ "name", "password", "avatar" }` |
| `POST /api/account/login` | `{ "name", "password" }` |
| `POST /api/account/logout` | `{}` |
| `POST /api/account/avatar` | `{ "avatar" }`; needs a login |

Errors are `{ "error": "<code>" }`, shown through the `auth.error.<code>` text in `src/i18n.js`.

## Paper doll 紙娃娃

The avatar is a paper doll: realistic male and female bodies, drawn by stacking transparent PNG layers on a 720 × 1272 canvas. Main code: `account/doll.py` (server), `public/src/account/doll.js` and `UserAvatar.js` (site). The head icon is the same drawing, cropped to the head.

### Catalog 目錄

Everything about the doll is in `public/assets/avatars/doll/parts.json`, read by both the site and the server:

| Key | Meaning |
| --- | ------- |
| `genders` | `male` and `female`. Each has its own body and its own parts. |
| `skins` | Skin colors. |
| `layers` | Layer order, back to front. `required` layers can be swapped but never removed. |
| `head` | The head-icon crop for each gender. |
| `parts` | Every part: `id`, `layer`, `price`, `label`, `files` (one per gender it fits), and `default` or `view`. |

Layer order 圖層順序: background, back, body, socks, shoes, lower, upper, makeup, eyes, nose, mouth, hair, accessory, foreground, pet.

- **Skin color:** the body image is light gray, and the skin color is multiplied over it.
- **Required layers:** upper, lower, eyes, nose, mouth and hair. Upper and lower can never be empty, because the body's underwear would be colored as skin.
- **Defaults:** simple eyes, nose and mouth, very short black hair, a white vest and white shorts, and bare feet. These are the parts marked `default`.
- **Price 0** parts are free choices in the customizer. Parts **above 0** are sold in the dressing room.

An avatar is saved as:

```json
{ "version": 2, "gender": "female", "skin": "warm",
  "parts": { "eyes": "eyes-simple", "nose": "nose-simple", "mouth": "mouth-smile",
             "hair": "hair-short-black", "upper": "vest-white", "lower": "shorts-white" } }
```

### Pages 頁面

- **Register and customize** (`AvatarPicker.js`): boy or girl, skin color, and any layer with more than one free or owned part. Changing gender starts again from that body's defaults.
- **Dressing room** (`/account/shop`): one tab per layer that has something for sale for the user's body. Trying on is free. Taking a part off a required layer puts back the default. **Take off all** returns to the defaults.

### Rules on the server 伺服器規則

- The gender and skin must be in the catalog, and each part must exist, be on its own layer and fit the gender.
- A paid part must be owned to wear. Required layers missing from a request get their default.
- A purchase is refused for a part that is free, unknown, owned, does not fit the body, or costs more than the user's coins. The price always comes from the server's catalog.
- Coins and owned parts are kept in the encrypted account record. Changes to an account happen one at a time.
- `POST /api/account/buy` takes `{ "item": "<part id>" }` and needs a login.

Coins are a pretend currency inside the site, not real money. Every account starts with 300. There is no way to earn more yet.

### Test mode reset 測試模式重設

An account saved before the paper doll (no `"version": 2`) starts over when it is next read: the default avatar, 300 coins and nothing owned. Its gender (boy or girl becomes male or female) and skin color are kept. This is written to the file at the account's next change.

### Add a part 新增部件

1. Make the image on the matching template, then fit it to the 720 × 1272 canvas as a transparent PNG. See [avatar-art/PROMPTS.md](avatar-art/PROMPTS.md).
2. Save it as `public/assets/avatars/doll/<gender>/<id>.png`, once per gender it fits.
3. Add it to `parts` in `parts.json`. A `view` (x y width height) sets the crop on its shop card.
4. Restart the server, which reads the catalog at startup.

Do not delete a part once people own it. A worn part missing from the catalog makes saving that avatar fail.

### Where the default art came from 預設素材來源

The defaults were cut from the generated images in `account/avatar-art/`. The paper tabs were removed from the template bodies. The female vest was fitted from a differently sized image. The white shorts are cut from the green trousers in the vest images.

The female eyes, nose, mouth and hair come from `hair-style/hair-simpe-female-01.jpg`, and the brown pixie cut from `hair-simple-female-02.jpg`. Their heads are smaller than the template's, so the head was placed on its own: the ears were lined up and the image scaled to 110%. The nose and lips keep only how much darker they are than the drawn skin, so they suit every skin color.

Known flaws: faint brown pocket stitching on the shorts, a tiny skin-colored mark at the female body's left waist, and a faint light line under the female brows on the darkest skin.