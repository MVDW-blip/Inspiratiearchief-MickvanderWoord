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

## Een nieuwe afbeelding toevoegen (update)

1. Zet de afbeelding in de juiste map, bijv. `images/fakegradation/`.
2. Open `data.js` en voeg de bestandsnaam toe aan de lijst `images` van die
   pagina. De volgorde in de lijst is de volgorde op de site.
3. Upload de wijziging naar GitHub — binnen een minuut staat hij live.

## Een nieuwe pagina toevoegen

1. Maak een map in `images/` en zet je beelden erin.
2. Voeg in `data.js` een nieuw blok toe (slug, page, title, subtitle, folder, images).
3. Kopieer `connectors.html` naar de nieuwe bestandsnaam en verander
   `data-page="connectors"` in je nieuwe slug.

De homepagina en het menu pakken de nieuwe pagina automatisch op.

## Zonder GitHub, lokaal testen

Je kunt de site ook meteen bekijken op je eigen computer: open een terminal
in deze map en run `python3 -m http.server`, open dan
`http://localhost:8000` in je browser.
