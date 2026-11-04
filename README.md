# Inspiratiearchief

Een eenvoudige, zelf-gehoste galerij. Jij bezit alle bestanden; er draait geen
server en je hebt geen domein nodig.

## Online

De site staat live op **https://mvdw-blip.github.io/Inspiratiearchief-MickvanderWoord/**
(GitHub Pages, repository `MVDW-blip/Inspiratiearchief-MickvanderWoord`, branch `main`, map `/ (root)`).
Wijzigingen pushen met GitHub Desktop → **Push origin**; na 1–3 minuten staat het online.

## Structuur

- `index.html` — de index: een vierkant met willekeurig opploppende beelden uit de thema's,
  een zwevend 3D-object (naar overige connecties) en een zwevende link naar presearch 1.
- `archief.html` — de thema's op één pagina, elk met titel, vraag, tekst, beelden en
  onderaan de websites. Werkbalk rechtsonder: **Shuffle** (alles gaat zweven), Edit, Reset, Save.
- `connectors.html` — overige connecties, met **Glue** in plaats van Shuffle.
- `presearch1.html` — presearch 1, op datum genummerd, zonder Shuffle. Pdf's en .ai-bestanden
  kun je pagina voor pagina doorbladeren.

## Teksten aanpassen

- Klik op **Edit** in de werkbalk rechtsonder, klik op een titel, tekst of linknaam en typ.
  Dit wordt alleen in jouw browser bewaard.
- Klik daarna op **Save** (downloadt data.js) en vervang het bestand in deze map
  (en op GitHub) zodat iedereen de nieuwe teksten ziet.
- Of pas `data.js` direct aan.

## Een afbeelding of link toevoegen

1. Zet de afbeelding in de juiste map, bijv. `images/dividingattention/`, en voeg
   de bestandsnaam toe aan `images` in `data.js`.
2. Een link: voeg `{ "title": "...", "url": "...", "image": "images/links/....jpg" }`
   toe aan `links`. Het voorbeeldplaatje mag je weglaten.
3. Video: gebruik `.mp4` (H.264). Pdf: zet elke pagina als beeld in `pages/` (zie data.js).
4. Push de wijziging met GitHub Desktop — binnen een paar minuten staat hij live.

## Zonder GitHub, lokaal testen

Je kunt de site ook meteen bekijken op je eigen computer: open een terminal
in deze map en run `python3 -m http.server`, open dan
`http://localhost:8000` in je browser.
