# Inspiratiearchief

Een eenvoudige, zelf-gehoste galerij. Jij bezit alle bestanden; er draait geen
server en je hebt geen domein nodig.

## Online

De site staat live op **https://mvdw-blip.github.io/Inspiratiearchief-MickvanderWoord/**
(GitHub Pages, repository `MVDW-blip/Inspiratiearchief-MickvanderWoord`, branch `main`, map `/ (root)`).
Wijzigingen pushen met GitHub Desktop → **Push origin**; na 1–3 minuten staat het online.

## Structuur

- `index.html` — de index: een vierkant met willekeurig opploppende beelden uit de thema's,
  zwevende 3D-objecten (metaal: overige connecties; glas: 24 days challenge en alle beelden)
  en een zwevend, wazig rood stoplicht naar presearch (wordt groen als je erover gaat).
- `alles.html` — alle beelden van de hele site op één pagina.
- `themas.html` — het thema Grey matter V1: titel, tekst, alle beelden uit `images/greymatterv1/` en onderaan de websites.
- `connectors.html` — overige connecties.
- `24days.html` — de 24 days challenge, per dag.
- `presearch.html` — presearch 2 en daaronder presearch 1, op datum genummerd. Pdf's en .ai-bestanden
  kun je pagina voor pagina doorbladeren.

Op elke pagina behalve de index staan rechtsonder zes knoppen. Slepen kan niet; een klik op een
beeld opent hem groot.
- **Glue** — alle beelden plakken aan de cursor (**Unglue** zet ze terug).
- **Replace** — de beelden wisselen van plek binnen het raster; elke klik een andere volgorde.
- **Fly** — alle beelden gaan zweven (**Land** zet ze terug).
- **Transparent** — alle beelden half doorzichtig (50%); nog een keer drukken zet het uit.
- **Invert** — alle beelden in negatief (kleuren omgedraaid); nog een keer drukken zet het uit.
- **Reset** — alles terug op de oorspronkelijke plek en volgorde, en Transparent en Invert uit.
Esc zet alles terug in het raster.

**Heatmap** (ook op de index): vanaf het moment dat je de site binnenkomt wordt op elke pagina
bijgehouden waar je muis is geweest — een spoor als je beweegt, warmer waar je stilstaat. Alleen in je
eigen browser; weg zodra je het tabblad sluit. De knop laat het zien als warmtebeeld en blijft aan op
de volgende pagina's; linksonder staat dan je route door de site.

## Teksten aanpassen

Pas titel, vraag en tekst van het thema aan in `data.js` en push de wijziging.

## Een afbeelding of link toevoegen

1. Zet de afbeelding in de juiste map, bijv. `images/greymatterv1/`, en voeg
   de bestandsnaam toe aan `images` in `data.js`.
2. Een link: voeg `{ "title": "...", "url": "...", "image": "images/links/....jpg" }`
   toe aan `links`. Het voorbeeldplaatje mag je weglaten.
3. Video: gebruik `.mp4` (H.264). Pdf: zet elke pagina als beeld in `pages/` (zie data.js).
4. Push de wijziging met GitHub Desktop — binnen een paar minuten staat hij live.

## Zonder GitHub, lokaal testen

Je kunt de site ook meteen bekijken op je eigen computer: open een terminal
in deze map en run `python3 -m http.server`, open dan
`http://localhost:8000` in je browser.
