# Glossary

The ubiquitous language of the ShopBite storefront: an online ordering storefront for restaurants that works against any shop backend. Code, docs and tests use these terms in English; the German word in quotes is what guests see in the UI. The terms are grouped by bounded context; how the contexts relate is in [ADR 0001](docs/adr/0001-backend-agnostic-storefront.md).

## Storefront

**Restaurant**:
The business that sells through the storefront: its menu, hours, branches and orders.
_Avoid_: merchant, store owner

**Shop**:
One restaurant's storefront as it is deployed (a shop extends the storefront layer).
_Avoid_: site, instance

**Shop backend**:
The system that owns the restaurant's data and orders (Shopware today); the storefront reaches it only through its ports.
_Avoid_: API, commerce engine

## Menu

**Menu** ("Speisekarte"):
Everything the restaurant offers, as a tree of menu sections.
_Avoid_: catalog (except in the port's name), assortment

**Menu section** ("Pizza", "Nudeln"):
A named group of dishes on the menu; a section can have sub-sections.
_Avoid_: category, collection, taxon

**Dish**:
Something on the menu that can be ordered, with a menu number, a price and its main ingredients. Drinks and side orders are dishes too.
_Avoid_: product, article, item

**Menu number** ("Nr. 21"):
The number of a dish on the printed menu; guests and the kitchen use it to name the dish.
_Avoid_: SKU, product number (outside the Shopware adapter)

**Variant** ("Groß 40 cm", "Pommes frites"):
One orderable form of a dish, chosen by one option per variant group; it has its own menu number and price.
_Avoid_: child product, SKU

**Variant group** ("Größe", "Beilage", "Garstufe"):
A choice that tells the variants of a dish apart.
_Avoid_: property group, option set

**Main ingredient**:
An ingredient listed with the dish; each one is a removable ingredient.
_Avoid_: property, attribute

**Removable ingredient** ("ohne Zwiebeln"):
A main ingredient the guest can leave out at no charge.
_Avoid_: deselected ingredient, modifier

**Extra** ("Extra Käse"):
An optional addition to a dish with its own price.
_Avoid_: topping (too narrow), add-on, cross-selling

**Extra group** ("Extras", "Beilagen"):
A named list of extras offered for a dish.
_Avoid_: cross-selling, association

**Dish configuration** ("Anpassen"):
A dish (or variant) together with its chosen extras and removed ingredients; two configurations with the same parts are the same.
_Avoid_: product configuration, customisation

**Dish sheet**:
The panel in which a guest configures a dish before adding it to the cart; its configuration is part of the dish's link.
_Avoid_: quick view, product page

**Diet** ("Vegetarisch", "Vegan"):
A badge that tells which diet a dish suits.
_Avoid_: tag

**Allergen** ("Allergene", A–R) and **Additive** ("Zusatzstoffe", 1–12):
Food labels the law requires; a dish's lists are either checked (complete) or the guest is asked to call.
_Avoid_: property

**Top seller** ("Oft bestellt"):
A dish the restaurant marks for the home page.
_Avoid_: highlight, bestseller

**Upsell dish** ("Dazu passt"):
A dish suggested on the confirmation step before the order is placed.
_Avoid_: cross-sell

## Ordering

**Cart** ("Warenkorb"):
The dishes a visitor is about to order, priced by the shop backend.
_Avoid_: basket, bag

**Cart line**:
One dish configuration in the cart with its quantity; a dish with extras and removed ingredients is one line, priced as a whole. Adding the same configuration again raises the quantity; configurations that differ in anything, also only in their removed ingredients, are two lines.
_Avoid_: line item, container, position

**Cart message**:
What the shop backend says about the cart ("nicht mehr verfügbar"); an error message blocks the order.
_Avoid_: error, notice

**Discount**:
A price reduction of the cart, either from a voucher or applied automatically by the restaurant's rules.
_Avoid_: promotion, rebate

**Voucher** ("Gutschein"):
A code the guest enters to get a discount.
_Avoid_: promotion, coupon

**Fulfillment** ("Lieferung oder Abholung"):
How the order reaches the guest: delivery or pickup.
_Avoid_: shipping, order mode

**Delivery** ("Lieferung"):
The restaurant brings the order to the guest's delivery address.

**Pickup** ("Abholung"):
The guest collects the order at the restaurant.
_Avoid_: collection, takeaway

**Shipping method** ("Lieferung", "Abholung"):
A way to get the order, with its fulfillment and lead time; a shop can have several per fulfillment.
_Avoid_: delivery option

**Lead time** ("Lieferzeit ca. 30 Minuten", "Abholbereit in ca. 15 Minuten"):
The minutes the kitchen needs before an order is delivered or ready for pickup; set per shipping method.
_Avoid_: delivery time (the backend's entity of that name is something else), preparation time

**Wished time** ("Wunschlieferzeit", "Wunschabholzeit"):
The service date and time at which the guest wants the order, on the 5-minute grid; shortly after midnight is the next service date.
_Avoid_: slot, requested time, delivery time

**Ordering window** ("Wann"):
The wished times a guest can choose now: from now plus the lead time to the end of the current or next opening interval within the next 24 hours, never on a holiday.
_Avoid_: delivery window, time range

**Checkout** ("Kasse"):
The page on which the guest chooses fulfillment, wished time, details and payment, and places the order.
_Avoid_: checkout steps

**Payment method** ("Zahlungsart", "Barzahlung"):
A way to pay; some send the guest to another site after the order.

**Order** ("Bestellung"):
A placed cart with the guest's details, fulfillment and wished time.
_Avoid_: purchase, transaction

**Order attempt**:
One press of the order button; sent again unchanged when the answer does not come, so it never places two orders.
_Avoid_: idempotency key (outside the code), retry

**Order number** ("Bestellnummer"):
The number of an order shown to the guest and the restaurant.

**Order status**:
Where the order stands for the restaurant: open, in progress, completed or cancelled.
_Avoid_: state, state machine state

**Payment status**:
Where the payment stands: open, paid, failed, cancelled or refunded.

**Note**:
The guest's free text to the restaurant on an order (the checkout does not ask for one yet).
_Avoid_: customer comment, remark

## Guest & Account

**Visitor**:
Anyone using the storefront, before they identify themselves.
_Avoid_: user, session

**Guest** ("Als Gast bestellen"):
A visitor who orders with their details but without an account.
_Avoid_: anonymous customer

**Customer** ("Kundenkonto"):
A person with an account: login, saved addresses, order history, wishlist.
_Avoid_: user, account holder, member

**Orderer** ("Ihre Angaben"):
The guest or customer who orders in this session, with the billing and delivery address the order uses.
_Avoid_: buyer, checkout customer

**Business** ("Geschäftskunde"):
A guest or customer who orders for a company; the billing address names it.
_Avoid_: B2B customer, commercial account

**Address**:
A postal address of a guest or customer, used as billing address ("Rechnungsadresse") or delivery address ("Lieferadresse").
_Avoid_: shipping address

**Registration** ("Registrierung"):
Creating an account; with double opt-in the customer confirms the email first.
_Avoid_: sign-up

**Registration confirmation** ("Registrierung bestätigen"):
The link in the e-mail of a registration with double opt-in; the account opens with it.
_Avoid_: opt-in, activation

**Login** ("Anmelden") and **Logout** ("Abmelden"):
The customer opens and closes the account in the session; the visitor's cart joins the customer's on login.
_Avoid_: sign-in, authentication

**Password reset** ("Passwort vergessen", "Neues Passwort"):
A link by e-mail that sets a new password; the storefront answers the same whether the e-mail has an account.
_Avoid_: password recovery (outside the Shopware adapter)

**Default address** ("Lieferadresse", "Rechnungsadresse" of the account):
The address of the account an order uses for billing or delivery unless the customer changes it.
_Avoid_: default shipping address, active address

**Wishlist** ("Merkliste"):
The configured dishes a guest or customer keeps for later; the same dish can be kept twice with different configurations.
_Avoid_: favourites, wish list (two words)

**Wishlist entry**:
One dish configuration on the wishlist.
_Avoid_: wishlist item

**Session**:
The storefront's own record of a visitor (cart, login) in its HttpOnly cookie; what the shop backend needs to recognise the visitor travels inside it sealed, so the browser can neither read nor change it.
_Avoid_: context, context token

## Restaurant operations

**Restaurant time zone**:
The time zone in which opening hours, holidays and wished times are meant, whatever the visitor's or server's clock says.
_Avoid_: server time, local time

**Opening hours** ("Öffnungszeiten"):
The weekly times the restaurant is open and takes orders.
_Avoid_: business hours, service hours

**Opening interval** ("11:30–14:30"):
One span of a weekday in the opening hours, at the latest until 24:00 (the end of the day); a late-night opening is two intervals, one until 24:00 and one from 00:00 of the next weekday.
_Avoid_: shift, service interval

**Weekly closing day** ("Ruhetag"):
A weekday without opening intervals.
_Avoid_: day off

**Holiday** ("Betriebsferien"):
Whole days, from a first to a last day, on which the restaurant stays closed although the opening hours say open.
_Avoid_: closing day, vacation, exception

**Store status** ("Geöffnet", "Geschlossen"):
Whether the restaurant is open right now, with the closing time or the next opening.
_Avoid_: shop state

**Accepts orders**:
The restaurant's switch to take online orders at all; when it is off, nothing can be ordered even within the opening hours.
_Avoid_: checkout enabled

**Branch** ("Filiale"):
Another location of the same restaurant with its own shop; guests switch between branches.
_Avoid_: sales channel, store, channel

**Contact message** ("Kontakt"):
A message from a visitor to the restaurant through the contact form.

## Discoverability

**Path**:
A URL path of the storefront, such as `/Speisekarte/Pizza/`; paths belong to the storefront, the shop backend only says what they name.
_Avoid_: SEO URL, slug, route

**Canonical path**:
The one path a menu section is linked and indexed under; other spellings and old paths redirect to it.
_Avoid_: canonical URL

**Former path**:
A path a menu section had before it was renamed or moved; it redirects to the canonical path.
_Avoid_: old SEO URL, alias

**Menu root** ("Speisekarte"):
The menu section the menu hangs from; its page lists every dish, its sub-sections are the menu's sections.
_Avoid_: navigation root, menu category

**Navigation** (main, footer, menu, home):
A list of links in the header, the footer, the menu index or on the home page; an entry is a menu section, a content page, a link or a group (a footer column that heads its links).
_Avoid_: navigation tree, main-navigation, folder

**Breadcrumb**:
The menu sections above the current one ("Speisekarte › Pizza").

**Content page**:
A page the storefront writes itself (imprint, delivery area); never a shop backend matter.
_Avoid_: CMS page, landing page

**Sitemap** and **llms.txt**:
The lists of paths for search engines and of shop facts for AI assistants.

## Backend words that must not leak

These Shopware words stay inside the Shopware adapter. Code outside it, the UI and the docs use the term on the right.

| Shopware                                            | Storefront term                                   |
| --------------------------------------------------- | ------------------------------------------------- |
| sales channel                                       | shop; branch (multi-channel group)                |
| category, navigation root, main-navigation          | menu section, menu, navigation                    |
| product, product number                             | dish, menu number                                 |
| child product, variant product                      | variant                                           |
| property group / option (`Hauptzutaten`)            | main ingredient, variant group, diet, filter      |
| cross-selling (`productList`)                       | extra group                                       |
| line item, `container` line item, children, payload | cart line with extras and removed ingredients     |
| context token (`sw-context-token`)                  | session                                           |
| SEO URL, `seoPathInfo`, `pathInfo`                  | path, canonical path                              |
| old SEO URL (`isCanonical: null`), technical URL    | former path, a path that redirects                |
| `menuCategoryId`, navigation category               | menu root                                         |
| folder category, link category                      | navigation group, navigation link                 |
| delivery time (entity)                              | lead time                                         |
| customer comment                                    | note (and the wished time it carries)             |
| state machine state                                 | order status, payment status                      |
| business hour, holiday (plugin entities)            | opening interval, holiday                         |
| promotion, promotion line item                      | discount, voucher                                 |
| `isCheckoutEnabled`                                 | accepts orders                                    |
| custom fields `shopbite_*`, criteria, includes      | named fields of the domain types                  |
| `countryId`, salutation entity                      | country code, salutation (`mr`, `mrs`, not given) |
| guest customer (`guest: true`)                      | guest                                             |
| `accountType: business`                             | business                                          |
| sales channel context (selected methods)            | checkout selection                                |
| `deepLinkCode`, `/account/order/…`                  | the order's e-mail link (not served yet)          |
| customer address, `defaultShippingAddress`          | address, default delivery address                 |
| `doubleOptInRegistration`, `register-confirm`       | registration confirmation                         |
| recovery hash, `recovery-password`                  | password reset (token)                            |
| `CUSTOMER_AUTH_THROTTLED`, rate limiter             | `rate_limited`                                    |
