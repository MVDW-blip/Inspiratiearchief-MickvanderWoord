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

## Een nieuw item toevoegen (update)

1. Zet de afbeelding in de map `images/` (bijv. `ring-goud-01.jpg`).
2. Open `data/items.json` en voeg een regel toe, bijvoorbeeld:

```json
{
  "title": "Gouden ring met textuur",
  "image": "ring-goud-01.jpg",
  "note": "De gehamerde afwerking, mooi voor de 2026-collectie.",
  "tags": ["goud", "textuur"],
  "added": "2026-11-10"
}
```

3. Sla het bestand op en upload de wijziging naar GitHub (sleep het bestand
   opnieuw naar de repo-pagina, of commit via git).

Zodra je de wijziging naar GitHub stuurt, bouwt GitHub Pages de site
automatisch opnieuw — meestal binnen een minuut staat je update live.
Je hoeft nergens anders iets te deployen; de bestanden in de repository
**zijn** de site.

## Filteren op tags

De filterknoppen boven de galerij worden automatisch gegenereerd op basis van
de `tags` die je aan elk item meegeeft — je hoeft niets in de code aan te
passen.

## Zonder GitHub, lokaal testen

Je kunt de site ook meteen bekijken op je eigen computer: open een terminal
in deze map en run `python3 -m http.server`, open dan
`http://localhost:8000` in je browser.
