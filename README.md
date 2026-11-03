# Inspiratiearchief

Een eenvoudige, zelf-gehoste galerij. Jij bezit alle bestanden; er draait geen
server en je hebt geen domein nodig.

## Eenmalig instellen (GitHub Pages)

1. Maak een gratis account op https://github.com (als je er nog geen hebt).
2. Maak een nieuwe **repository** aan, bijv. `inspiratiearchief`. Zet hem op
   "Public" (nodig voor gratis Pages-hosting; de inhoud is verder gewoon van jou).
3. Upload deze hele map (via "Add file" → "Upload files" op de repo-pagina, of
   met git als je dat kent).
4. Ga naar **Settings → Pages** in de repository. Zet bij "Source" de branch
   op `main` en de map op `/ (root)`. Sla op.
5. Na ~1 minuut staat je site live op:
   `https://<jouw-gebruikersnaam>.github.io/inspiratiearchief/`

Geen domein, geen hostingkosten, geen server om te onderhouden.

## Structuur

- `index.html` — de indexpagina (nog leeg).
- `archief.html` — alles op één pagina: verdeeldeaandacht, meerisminder en
  connectors, elk met titel, tekst, links en beelden.
- Rechtsonder staat een vierkante werkbalk met **Shuffle**, Edit, Reset en Save. Shuffle: alles gaat zweven. Je kunt beelden nog steeds
  slepen en gooien. Klik op **Order** om alles terug te zetten.

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
3. Upload de wijziging naar GitHub — binnen een minuut staat hij live.

## Zonder GitHub, lokaal testen

Je kunt de site ook meteen bekijken op je eigen computer: open een terminal
in deze map en run `python3 -m http.server`, open dan
`http://localhost:8000` in je browser.
