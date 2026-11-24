# Mutants of the scenarios in test/bdd/features. Each one is steps that
# pass (a prefix of a real scenario, or steps it uses) followed by ONE last
# step that is false there: a changed expectation, or the assertion of the
# opposite outcome. `@fail` makes a failing mutant pass, and the reporter
# test/bdd/mutants/lastStepReporter.ts fails the run unless every mutant
# ran all its other steps and failed at its last one. So each assertion of
# the suite is shown to be able to fail, for its own reason.
#
#   SHOPBITE_TEST_SEAMS=1 pnpm build && pnpm test:bdd:mutants   (memory)
#
# CI runs it nightly (bdd-mutants.yaml); run it by hand when steps change.
# A new assertion step gets a mutant here.
Feature: Mutants of the behaviour scenarios

  # --- menu.feature

  @fail
  Scenario: M01 a section the menu does not have
    Given the restaurant is open
    When I open the menu
    Then I see the menu sections
      | Vorspeisen |
      | Burger     |

  @fail
  Scenario: M02 one dish fewer in the section
    Given the restaurant is open
    When I open the menu section "Pizza"
    Then the section says it has 13 dishes

  @fail
  Scenario: M03 another price
    Given the restaurant is open
    When I open the menu section "Pizza"
    Then I see the dish "Pizza Margherita" from "8,00 €"

  @fail
  Scenario: M04 a search result left out
    Given the restaurant is open
    When I search the menu for "Bolognese"
    Then I see exactly these dishes
      | Gnocchi Bolognese   |
      | Spaghetti Bolognese |

  @fail
  Scenario: M05 the vegetarian dishes without the filter
    Given the restaurant is open
    When I open the menu section "Pizza"
    Then I see exactly these dishes
      | Pizza Funghi           |
      | Pizza Margherita       |
      | Pizza Quattro Formaggi |
      | Pizza Vegetaria        |

  @fail
  Scenario: M06 the cheapest dish without sorting
    Given the restaurant is open
    When I open the menu section "Nudeln"
    Then the first dish is "Spaghetti Napoli"

  @fail
  Scenario: M07 the extra that was not chosen
    Given the restaurant is open
    When I add a "Pizza Margherita" to the cart
    Then my cart holds 1 "Pizza Margherita +Extra Salami"

  @fail
  Scenario: M08 the ingredient that was not removed
    Given the restaurant is open
    When I add a "Pizza Margherita" to the cart
    Then my cart holds 1 "Pizza Margherita -Käse"

  @fail
  Scenario: M09 the larger size's price for the normal size
    Given the restaurant is open
    When I add a "Pizza Margherita" to the cart
    Then my cart total is "10,00 €"

  @fail
  Scenario: M10 another total
    Given the restaurant is open
    When I add "Spaghetti Bolognese" from the menu section "Nudeln"
    Then my cart total is "8,00 €"

  # --- cart.feature

  @fail
  Scenario: M11 two without adding one more
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    Then my cart holds 2 "Spaghetti Bolognese"

  @fail
  Scenario: M12 empty without removing
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    Then my cart is empty

  @fail
  Scenario: M13 pickup chosen for a new guest
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    Then "Abholung" is chosen

  @fail
  Scenario: M14 a pickup time while delivery is chosen
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    Then I am asked for my wished pickup time

  @fail
  Scenario: M15 a delivery time while pickup is chosen
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I choose "Abholung"
    Then I am asked for my wished delivery time

  @fail
  Scenario: M16 the pickup lead time for delivery
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    Then the earliest wished time is 15 minutes from now

  # --- ordering.feature

  @fail
  Scenario: M17 an order confirmed before it is placed
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    Then my order is confirmed

  @fail
  Scenario: M18 a wished time the order does not have
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    And I place the order
    Then my order is confirmed
    And the confirmation shows the wished time "03:00"

  @fail
  Scenario: M19 a dish the order does not have
    Given the restaurant is open
    And my cart holds a "Pizza Margherita" with "Extra Salami"
    When I go to the checkout
    And I choose "Abholung"
    And I enter my details as a guest
    And I place the order
    Then my order is confirmed
    And the confirmation lists "Pizza Margherita"

  @fail
  Scenario: M20 no order although it was placed
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    And I place the order
    Then no order is placed

  @fail
  Scenario: M21 "opens tomorrow" while open
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    Then the restaurant shows it opens again tomorrow

  @fail
  Scenario: M22 "closed" while open
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    Then I am told the restaurant is closed now

  @fail
  Scenario: M23 no order button while open
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    Then I cannot place the order

  @fail
  Scenario: M24 no adding while taking orders
    Given the restaurant is open
    When I open the menu section "Nudeln"
    Then I cannot add "Spaghetti Bolognese" to my cart

  @fail
  Scenario: M25 "no orders" on a dish while taking orders
    Given the restaurant is open
    When I open the menu section "Nudeln"
    Then the dish "Spaghetti Bolognese" says the restaurant takes no orders right now

  @fail
  Scenario: M26 "no orders" while taking orders
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    And I place the order
    Then I am told the restaurant takes no orders right now

  # --- account.feature

  @fail
  Scenario: M27 logged in without logging in
    Given I have an account
    Then I am logged in

  @fail
  Scenario: M28 logged out after logging in
    Given I have an account
    When I log in
    Then I am logged out

  @fail
  Scenario: M29 "wrong password" for the right one
    Given I have an account
    When I log in
    Then I am told the e-mail or password is wrong

  @fail
  Scenario: M30 "e-mail on its way" without asking
    Given I have an account
    Then I am told an e-mail is on its way

  @fail
  Scenario: M31 a reset mail without asking
    Given I have an account
    Then I receive an e-mail with a link to set a new password

  @fail
  Scenario: M32 the new password before it is set
    Given I have an account
    When I ask for a new password
    Then I receive an e-mail with a link to set a new password
    And I can log in with the new password

  # --- wishlist.feature

  @fail
  Scenario: M33 an extra the saved dish does not have
    Given I am a logged-in customer
    When I save a "Pizza Margherita" with "Extra Käse" to my wishlist
    Then my wishlist shows "Pizza Margherita" with "Extra Salami"

  @fail
  Scenario: M34 a dish that was not saved
    Given I am a logged-in customer
    Then my wishlist shows "Pizza Margherita"

  @fail
  Scenario: M35 the guest's dish on another device without logging in
    Given I have an account
    And I saved a "Pizza Margherita" to my wishlist as a guest
    Then my wishlist shows "Pizza Margherita" on another device too
