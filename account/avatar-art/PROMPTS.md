# Avatar art prompts 角色素材生成指令

Prompts for making dressing room items with an AI image tool. Prompts are in English because image tools follow English best.

這裡是用 AI 繪圖工具製作試衣間商品的指令。指令使用英文，因為繪圖工具對英文的理解通常比較好。

| File | Purpose |
| ---- | ------- |
| `template-male.png` | Male body template, 720 × 1272 |
| `template-female.png` | Female body template, 720 × 1272 |
| `template-chibi.png` | The chibi body the site uses today, 720 × 1272 |
| `examples/clothes-sailor.png` | Example of the target quality and style, made on the chibi body |
| `fit-item.ps1` | Fits a finished image onto the doll canvas |

Source images are sorted into one folder per type 素材依類型分資料夾:

| Folder | Type |
| ------ | ---- |
| `body/` | Base bodies 身體 |
| `hair-style/` | Hair styles 髮型 |
| `eyes/` | Eyes 眼睛 |
| `nose/` | Noses 鼻子 |
| `ears/` | Ears 耳朵, colored with the skin color |
| `mouth/` | Mouths 嘴巴 |
| `makeup/` | Makeup, such as blush 妝容 |
| `upper-body/` | Tops 上身 |
| `lower-body/` | Skirts, shorts and trousers 下身 |
| `socks/` | Socks 襪子 |
| `shoes/` | Shoes 鞋子 |
| `accessories/` | Hats, glasses, bags and held items 配件 |
| `background/` | Behind the doll 背景 |
| `foreground/` | In front of the doll 前景 |
| `pets/` | Pets 寵物 |

Name each file after its item id, such as `upper-body/top-sailor.png`. Empty folders hold a `.gitkeep` file so git keeps them.

The source images here are not served by the website. Parts used on the site go in `public/assets/avatars/doll/<gender>/`, listed in `doll/parts.json`. See [../DESIGN.md](../DESIGN.md).

## Templates 模板

The male and female templates are the new paper-doll bodies, with realistic proportions of about 7–8 heads. Both share one canvas and scale, with the feet ending at canvas y 1236. The male head starts at y 84 and the female head at y 107. The shoulders, waist and knees differ, so an item made for one body does not fit the other.

男生與女生模板是新的紙娃娃身體，比例接近真人（約 7–8 頭身）。兩者使用相同的畫布與比例，但肩膀、腰和膝蓋的位置不同，所以為一個身體做的商品不能直接用在另一個身體上。

The site still draws the chibi doll, about 2.7 heads tall. Items made on the new templates will not fit it until the site's doll is redrawn on the new bodies. Until then, use `template-chibi.png` for items meant for the site today.

The templates come from a generated image. Their small white paper tabs are part of the image, so the prompt asks for no tabs.

## Default avatar 預設角色

A new account chooses male or female and a skin color. Everything else starts as:

| Part | Default |
| ---- | ------- |
| Eyes | Simple eyes |
| Nose | Simple nose |
| Mouth | Simple small smile |
| Hair | Very short black hair |
| Upper body | White vest |
| Lower body | White shorts |
| Socks and shoes | None, barefoot |

Skin color is applied by the site, which multiplies a color over the body image. So the body must be drawn in light gray, and every other part keeps its own fixed colors.

The underwear in the body image would be colored as skin too. That is why the upper-body and lower-body slots are never empty: an item there can be swapped, never removed.

Each default is made once per body, 14 images in all. Use the matching template for each.

| Save as | Prompt |
| ------- | ------ |
| `body/body-male.png` | Body prompt below, with `template-male.png` |
| `body/body-female.png` | Body prompt below, with `template-female.png` |
| `eyes/eyes-simple-<body>.png` | Common prompt, `[ITEM]` = `simple friendly eyes with thin eyebrows, on the face area only` |
| `nose/nose-simple-<body>.png` | Common prompt, `[ITEM]` = `a small simple nose drawn with one short line, on the face area only` |
| `mouth/mouth-smile-<body>.png` | Common prompt, `[ITEM]` = `a small simple closed smile, on the face area only` |
| `hair-style/hair-short-black-<body>.png` | Common prompt, `[ITEM]` = `very short black hair, close to the head like a buzz cut, covering only the top and sides of the head` |
| `upper-body/vest-white-<body>.png` | Common prompt, `[ITEM]` = `a plain white sleeveless vest (tank top)` |
| `lower-body/shorts-white-<body>.png` | Common prompt, `[ITEM]` = `plain white shorts reaching the middle of the thighs` |

`<body>` is `male` or `female`.

Body prompt:

```
Redraw the uploaded paper doll body exactly: same pose, same proportions,
same position and size on the canvas, same outline style.
Remove every white paper tab. Keep the plain underwear.
Fill the skin with flat light gray (#e6e6e6) and keep the dark brown outlines
and soft gray shading. No face, no hair.
No text, no logos, no watermark. Pure flat white background. Portrait 9:16.
```

## Steps 步驟

1. Upload the template for the body you are dressing, `template-male.png` or `template-female.png`, as the reference image. If the tool has image-to-image or structure control, turn it on.
2. Upload `examples/clothes-sailor.png` as a style reference, if the tool allows a second image.
3. Paste the common prompt and replace `[ITEM]` with an item below.
4. Choose a 9:16 portrait ratio.
5. Name the file after the item id, such as `clothes-suit.png`.

## Common prompt 共用指令

For clothes, shoes, hats, face items, held items and back items.

```
Use the uploaded gray mannequin as an exact size and position guide.
Draw ONLY this item, fitted onto the mannequin's body: [ITEM].

The item must match the mannequin's size. It must not be larger than the
mannequin's body parts, and most of the image stays empty background.

Style: cute chibi paper doll clothing, soft hand-drawn anime illustration,
clean dark brown outlines, gentle cel shading, soft pastel colors,
fine fabric details such as stitching, folds and small patterns.

Rules:
- Keep the item in exactly the same position, scale and pose as the mannequin.
- Front view, symmetrical, facing the viewer.
- Do NOT draw the mannequin, body, head, face, hands or skin.
- No text, no logos, no watermark, no paper tabs, no shadow on the ground.
- No white sticker border around the item.
- Pure flat white background. Portrait 9:16.
```

Negative prompt, if the tool has one:

```
person, body, face, skin, hands, mannequin, text, logo, watermark, paper tabs,
sticker border, ground shadow, background scenery, realistic photo, 3D render
```

## Items 商品

| File name | `[ITEM]` |
| --------- | -------- |
| `clothes-sailor` | a white sailor top with a navy collar, red neckerchief and a pleated navy skirt, short sleeves |
| `clothes-suit` | a black formal suit with white shirt, red tie, long sleeves and long trousers |
| `clothes-robe` | a long red robe with wide sleeves, gold sash and gold hem, reaching the ankles |
| `clothes-hero` | an original blue superhero suit with long sleeves, gold belt, red shorts and a gold star on the chest |
| `shoes-boots` | a pair of brown lace-up boots reaching the middle of the shins |
| `shoes-sneakers` | a pair of red and white sneakers with short white socks |
| `hat-crown` | a small gold crown with red and blue jewels, sitting on top of the head |
| `hat-wizard` | a purple pointed wizard hat with a wide brim and a gold star |
| `hat-grad` | a black graduation cap with a gold tassel |
| `face-sunglasses` | a pair of black sunglasses at eye level |
| `face-cat` | cat whiskers and a small pink cat nose on the face area |
| `hand-wand` | a wooden magic wand with a gold star on top, held at the position of the viewer's right hand |
| `hand-book` | a small blue book with a gold star on the cover, at the position of the viewer's right hand |
| `back-wings` | a pair of white feathered angel wings spreading out behind the shoulders |
| `back-cape` | a long red cape with a gold hem, hanging from the shoulders behind the body |

## Princess face parts 公主風五官

Five sets of eyes, nose, mouth and ears in the style of classic hand-drawn fairy-tale princess animation, for the female body only. Upload `template-female.png` as the reference for every one.

五組公主風格的眼睛、鼻子、嘴巴和耳朵，只做女生身體。每一張都上傳 `template-female.png` 當參考。

The prompts describe the look instead of naming the studio or any princess. Image tools often refuse or copy a character when one is named, and the site should not use a real company's characters. Each set is an original design.

指令只描述畫風，不寫出公司或公主的名字：寫出名字時，繪圖工具常會拒絕或直接畫出那個角色，網站也不應使用真實公司的角色。每一組都是原創設計。

### Face prompt 五官指令

For eyes, noses and mouths:

```
Use the uploaded gray mannequin as an exact size and position guide.
Draw ONLY this face part, placed on the mannequin's face: [ITEM].

The part must match the mannequin's head size and sit exactly where it belongs
on the face. Most of the image stays empty background.

Style: classic hand-drawn fairy-tale princess animation, elegant and expressive,
clean dark brown outlines, soft cel shading, gentle warm colors.
An original design, not any existing character.

Rules:
- Front view, symmetrical, facing the viewer.
- Do NOT draw the head outline, face shape, skin, hair, ears, neck or body.
- No skin color around the part.
- No text, no logos, no watermark, no paper tabs.
- Pure flat white background. Portrait 9:16.
```

### Ears prompt 耳朵指令

Ears take the skin color on the site, like the body, so they are drawn in light gray:

耳朵在網站上會和身體一樣套上膚色，所以要畫成淺灰色：

```
Use the uploaded gray mannequin as an exact size and position guide.
Draw ONLY a pair of ears at the sides of the mannequin's head: [ITEM].

The ears must match the mannequin's head size and sit exactly where its ears are.
Most of the image stays empty background.

Fill the ears with flat light gray (#e6e6e6), with dark brown outlines and soft
gray shading, exactly like the mannequin's skin. Draw a closed outline all the
way around each ear.
Style: classic hand-drawn fairy-tale princess animation, an original design.

Rules:
- Front view, symmetrical.
- Do NOT draw the head, face, hair or body. No earrings or jewelry.
- No skin color, no text, no logos, no watermark, no paper tabs.
- Pure flat white background. Portrait 9:16.
```

Earrings belong in `accessories/`, because anything on the ears layer is colored as skin.

耳環請放在 `accessories/`，因為耳朵圖層上的所有東西都會被套上膚色。

### The five sets 五組

| Set | Look |
| --- | ---- |
| `sweet` 甜美 | Round, cheerful, youngest-looking |
| `gentle` 溫柔 | Calm and graceful |
| `bright` 明亮 | Lively and joyful |
| `bold` 自信 | Strong and confident |
| `fairy` 精靈 | Magical, with pointed ears |

Save each image as `<folder>/<id>-female.png`, such as `eyes/eyes-princess-sweet-female.png`.

| Save as | `[ITEM]` | Price |
| ------- | -------- | ----- |
| `eyes/eyes-princess-sweet-female.png` | large round sky-blue eyes with big sparkling highlights, long curled upper lashes, soft rounded eyebrows, with the eyebrows | 80 |
| `eyes/eyes-princess-gentle-female.png` | large almond-shaped hazel-brown eyes, slightly lowered lids for a calm look, long fine lashes, thin gently arched eyebrows, with the eyebrows | 80 |
| `eyes/eyes-princess-bright-female.png` | very large emerald-green eyes wide open with star-like highlights, thick upper lashes, lifted happy eyebrows, with the eyebrows | 80 |
| `eyes/eyes-princess-bold-female.png` | large amber-brown eyes with a winged upper lash line, a confident look, thicker straight eyebrows with a sharp arch, with the eyebrows | 80 |
| `eyes/eyes-princess-fairy-female.png` | large violet eyes with tiny sparkles in the irises, long sweeping lashes, very thin high-arched eyebrows, with the eyebrows | 100 |
| `nose/nose-princess-sweet-female.png` | a tiny upturned button nose, drawn with one short curved line and two dots for nostrils | 40 |
| `nose/nose-princess-gentle-female.png` | a small slender straight nose, drawn with one soft line down one side and a small curved tip | 40 |
| `nose/nose-princess-bright-female.png` | a small rounded nose, drawn with one short curved line under the tip | 40 |
| `nose/nose-princess-bold-female.png` | a small well-defined nose with a short bridge line and two small nostril curves | 40 |
| `nose/nose-princess-fairy-female.png` | a very small pointed nose, drawn with one tiny line | 40 |
| `mouth/mouth-princess-sweet-female.png` | small rosy lips in a closed sweet smile, with a soft pink shine | 50 |
| `mouth/mouth-princess-gentle-female.png` | soft pink lips in a calm closed smile, with the corners slightly raised | 50 |
| `mouth/mouth-princess-bright-female.png` | an open joyful smile showing a little of the upper teeth, coral pink lips | 50 |
| `mouth/mouth-princess-bold-female.png` | full berry-rose lips in a confident closed smile, a little wider | 50 |
| `mouth/mouth-princess-fairy-female.png` | small heart-shaped lips in light pink, a soft playful smile | 50 |
| `ears/ears-princess-sweet-female.png` | small round ears | 40 |
| `ears/ears-princess-gentle-female.png` | classic oval ears, slightly narrow | 40 |
| `ears/ears-princess-bright-female.png` | slightly larger round ears that stick out a little | 40 |
| `ears/ears-princess-bold-female.png` | neat oval ears with a defined inner curve | 40 |
| `ears/ears-princess-fairy-female.png` | long pointed elf ears that rise past the top of the ear line | 80 |

Hand the finished images over in these folders. They are then cut out, lined up with the face on the 720 × 1272 canvas, and added to the beauty salon with the prices above (the `shop.json` in each folder). The nose and lips keep only how much darker they are than the drawn skin, so they suit every skin color.

完成的圖片放在上述資料夾後，會再去背、對齊到 720 × 1272 畫布上的臉部位置，依上表價格加進美容院（各資料夾的 `shop.json`）。鼻子和嘴唇只保留比膚色深的部分，所以任何膚色都合適。

The body image already has ears, so the new ears are drawn over them. Where a new ear is smaller than the body's ear, the body's ear still shows around it, so smaller ears may need the body's ears trimmed. Pointed ears cover them fully.

身體圖本身已經有耳朵，新的耳朵會畫在上面。新耳朵若比原本的小，原本的耳朵會從旁邊露出來，可能需要修掉身體圖上的耳朵。尖耳朵則能完全蓋住。

## Background prompt 背景指令

Backgrounds do not need the template.

```
Cute hand-drawn anime background for a chibi paper doll, soft pastel colors,
gentle cel shading, simple composition with an open center area.
No people, no characters, no text, no logo, no watermark. Portrait 9:16.
Scene: [SCENE]
```

| File name | `[SCENE]` |
| --------- | --------- |
| `background-night` | a peaceful night sky with a crescent moon and stars above a dark hill |
| `background-garden` | a sunny garden with blue sky, soft clouds, green grass and pink flowers |

## Tips 注意事項

- Make several versions and keep the one closest to the example, so the set stays consistent.
- Most tools cannot make true transparency, so ask for a plain background and remove it afterwards.
- White items are harder to cut out of a white background. For those, change `Pure flat white background` to `Pure flat bright green background`.
- Do not name real brands or existing characters in a prompt.
- Check that the tool's terms allow your use, especially on a public site.

## Fit an image to the doll 對齊到娃娃

`fit-item.ps1` removes the background and places an image on the 720 × 1272 doll canvas, as a transparent PNG:

```
powershell -ExecutionPolicy Bypass -File account\avatar-art\fit-item.ps1 `
  -Source account\avatar-art\examples\clothes-sailor.png `
  -Output public\assets\avatars\items\clothes-sailor.png `
  -Scale 0.474 -CenterX 473 -TopY 510
```

| Setting | Meaning |
| ------- | ------- |
| `-Scale` | Canvas pixels per source pixel |
| `-CenterX` | The source x position that lands on the doll's center line |
| `-TopY` | Canvas y for the top of the item. On the chibi body, canvas pixels are 6 per doll unit, so the shoulders at y 85 are 510. The new templates need their own values. |
| `-Threshold` | Pixels brighter than this and joined to the image edge count as background |

Then save it as `public/assets/avatars/doll/<gender>/<id>.png` and add the part to `public/assets/avatars/doll/parts.json`.

The background is removed from the outside in, so a white area inside the outline is kept. A white item needs a dark outline all the way around.

## Notes on the example 範例說明

`examples/clothes-sailor.png` is the first item made this way, and shows the target quality. It is 944 × 1680, with no transparency and a near-white background.

It was drawn at full-garment size rather than on the mannequin, so it was scaled to 47% of its pixels on the 720-wide canvas and moved down. Its white sticker border came off with the background. The size rule and the sticker rule in the common prompt were added because of this.
