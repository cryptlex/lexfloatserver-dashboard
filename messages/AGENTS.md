# Writing message content

What the text in `messages/en.json` says and how it reads. Paraglide's Vite plugin compiles it into `src/paraglide` (generated, not committed). Use it as `m['productsPage.action.activate']()` from `@/paraglide/messages.js`.

## Audience

The reader is the customer's IT admin or ops engineer running LexFloatServer on their own network. They know servers, ports, IPs and TLS, but not Cryptlex's internal licensing vocabulary.

- Every user-facing string comes from `messages/en.json`. Don't hardcode labels, titles, toasts or headers in components.
- Use technical terms the admin already knows ("Hostname", "IP Address", "Port", "TLS"). Explain licensing terms ("Lease", "Floating Client", "Meter Attribute") in the hint.
- Don't show raw field names (`expiresAt`, `allowedFloatingClients`) or enum values (`hostedFloating`); show them in Title Case ("Allowed Floating Clients").

## Key structure

- **Properties** shown on more than one page live at the top level, named after the API property, with `label` and `hint`: `allowedFloatingClients.label`, `allowedFloatingClients.hint`. One label per property, reused everywhere.
- **Page text** lives under `<name>Page` (`productsPage`, `devicesPage`, `settingsPage`, `authPage`): `pageTitle`, `sections.<section>.title`, `columns.<column>`, `action.<verb>`, `<dialog>Dialog.title`, `<dialog>Dialog.toast.success`, `<dialog>Dialog.error.<code>`.
- **Shared text** lives under `common` (`state`, `unit`, `action`, `error`), `time` (relative and duration strings) and `nav`.
- Every key must exist before it's referenced, or type-checking fails. Nothing catches unused keys, so delete keys you stop using.

## Capitalization

- **Title Case** for labels, column headers, headings, section titles, dialog titles, browser tab titles (`pageTitle`), nav items, button text and status values: "Lease Duration", "Activate License", "Not Activated", "Log Out". Not "Lease duration", "Not activated".
- In Title Case, lowercase articles, conjunctions and short prepositions (a, an, the, and, or, to, by, for, in, of, on, with) unless they are the first or last word: "Log In with SSO", "Max Offline Lease Duration".
- **Exception: input placeholders** (shown inside a search field) use sentence case and no period: "Find by hostname".
- **"ID" is always uppercase**, alone or in a compound: "ID", "Product ID". Never "Id".
- Keep other abbreviations in their standard casing: "API", "URL", "IP", "TLS", "IPv6", "MB".

## Punctuation

- **Every hint and description ends with a period**, including short page and dialog subtitles.
- **Inline errors** (`error.*`) are full sentences and end with a period: "This product still has devices with offline leases. Wait for them to expire, then try again."
- Short one-phrase toasts and validation errors have no period ("License activated", "This field is required"); once a message has two sentences, every sentence ends with one ("The license couldn't be activated. Try again.").
- Labels, titles and button text never end with a period.
- No exclamation marks, except a single warm greeting on the login screen.

## Wording

- **Date and time labels never end in "At".** Use "Date" or a past-tense label: "Expiration Date", "Activated", "Lease Renewed", "Lease Expires", not "Expires At" or "Activated At".
- **Be short and plain.** One idea per sentence, everyday words, no marketing copy ("powerful", "seamless", "easily").
- **Take property definitions from the Cryptlex docs** (site repo `content/docs`, the LexFloatServer and License Templates pages) instead of writing new ones. A hint is one short sentence that restates the docs definition: "Maximum number of devices that can lease the license from the license server at the same time." Add a second sentence only when it changes what the reader does, and never repeat the label.
- **Active voice, second person.** "You can deactivate the license to move it to another server." not "The license may be moved by deactivation."
- **Buttons say what they do**, starting with a verb: "Activate License", "Deactivate License". Avoid vague "OK", "Yes", "Submit" when a specific verb fits.
- **One name per concept.** Use the same term everywhere, matching the Cryptlex docs: "license key" (not "serial" or "code"), "device" (not "machine" or "client" in one place and "computer" in another), "lease" (not "seat" in one place and "lease" in another), "expiration date" (not "expiry date"), "license server" (not "licensing server"), "log in" / "log out" (verbs) and "login" (noun or modifier), never "sign in", "sign out" or "sign-in".
- **Error messages** say what went wrong and how to fix it, without blaming the user: "Request failed." or "Something went wrong." alone is not enough. Name the field in field-specific errors. Map known API error `code`s to their own messages instead of showing the raw server `message`.
- **Confirmations for destructive actions** name the thing and the consequence: "Deactivate this license? Devices can't lease it until you activate it again." The dialog title is the action as a question ("Deactivate License?"), never "Are You Sure?".
- **Empty states** say what would be here and what to do next: "No devices yet. Devices appear here once your app leases a license from this server."
- **Toasts** confirm what happened in past tense: "License activated", not "Success!". Failure toasts say what failed and what to do: "The license couldn't be activated. Try again."
- **Placeholders that insert a Title Case name** go in a title or at the start of a sentence ("{product} Activated"), never mid-sentence. Don't build plurals by appending "s" to a placeholder; use a count message instead (see `time.duration.day` / `time.duration.days`).
- **Numbers as numerals** ("3 devices", not "three devices"), and use placeholders instead of joining sentence fragments so the sentence still reads naturally when translated.
