// @ts-check
/**
 * Whether a text reads as German (ADR 0002): the guard against UI texts
 * outside the locale files (eslint rule `shopbite/no-german-text`) and the
 * check that the English messages and the English build show none.
 *
 * A heuristic: umlauts and ß, or one of the words below, which German UI
 * texts use all the time and English ones never.
 */

const UMLAUT = /[äöüÄÖÜß]/;

/** Lower-case German words that are no English words. */
export const GERMAN_WORDS = new Set(
  `
  aber abbrechen abholung abholzeit abmelden absenden adresse adressen alle allergene ändern angaben anmelden anmeldung
  anpassen artikel auch ausgewählt auswählen bearbeiten bei beilagen bereits bestätigen bestellen bestellung
  bestellungen bezahlung bis bitte dein deine deinen deiner dem der des dich diese dieser dieses durch ein eine
  einen einem einer eingeben entfernen erneut etwas gesamt geschlossen geöffnet gerade gibt heute hier
  hinzufügen ihr ihre ihrem ihren ihrer ist jetzt kasse kein keine keinen konto kontakt lieferung lieferzeit leider
  löschen mehr menge merkliste möchten nach nicht noch nummer oder ohne passwort rechnungsadresse schließen schon
  sein seite sie sind speichern speisekarte straße suche telefon über uhr und unsere unser uns versand versuchen
  vielen vom von vor warenkorb weiter werden wird wir wählen zahlung zahlungsart zu zum zur zurück zwischensumme
  `
    .split(/\s+/)
    .filter(Boolean),
);

const WORD = /[\p{L}]+/gu;

/** The German words of a text (empty when it reads as anything else). */
export function germanWords(text) {
  const words = [];
  if (UMLAUT.test(text)) {
    for (const word of text.match(WORD) ?? []) {
      if (UMLAUT.test(word)) words.push(word);
    }
  }
  for (const word of text.match(WORD) ?? []) {
    if (GERMAN_WORDS.has(word.toLowerCase()) && !words.includes(word)) {
      words.push(word);
    }
  }
  return words;
}

export function isGerman(text) {
  return germanWords(text).length > 0;
}
