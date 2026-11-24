# The scenarios of test/bdd/features, each once with its behaviour taken
# away (a step left out, another restaurant) or its expectation changed.
# Each must fail, at the step its title names: proof that the scenario can
# see what it claims to check. `@fail` turns a failure into a pass, so
# `pnpm test:bdd:mutants` is green only when every mutant fails; read the
# report for the failing step. Run on the memory backend.
Feature: Mutants of the behaviour scenarios

  @fail
  Scenario: M01 menu sections fail at "I see the menu sections"
    Given the restaurant is open
    When I open the menu
    Then I see the menu sections
      | Vorspeisen |
      | Burger     |

  @fail
  Scenario: M02 section count fails at "says it has"
    Given the restaurant is open
    When I open the menu section "Pizza"
    Then the section says it has 13 dishes

  @fail
  Scenario: M03 search fails at "exactly these dishes"
    Given the restaurant is open
    When I search the menu for "Bolognese"
    Then I see exactly these dishes
      | Gnocchi Bolognese   |
      | Spaghetti Bolognese |

  @fail
  Scenario: M04 unfiltered section fails at "exactly these dishes"
    Given the restaurant is open
    When I open the menu section "Pizza"
    Then I see exactly these dishes
      | Pizza Funghi           |
      | Pizza Margherita       |
      | Pizza Quattro Formaggi |
      | Pizza Vegetaria        |

  @fail
  Scenario: M05 unsorted section fails at "the first dish is"
    Given the restaurant is open
    When I open the menu section "Nudeln"
    Then the first dish is "Spaghetti Napoli"

  @fail
  Scenario: M06 dish without the extra fails at "my cart holds"
    Given the restaurant is open
    When I add a "Pizza Margherita" to the cart
    Then my cart holds 1 "Pizza Margherita +Extra Salami"

  @fail
  Scenario: M07 dish with the ingredient fails at "my cart holds"
    Given the restaurant is open
    When I add a "Pizza Margherita" to the cart
    Then my cart holds 1 "Pizza Margherita -Käse"

  @fail
  Scenario: M08 normal size fails at "my cart total is"
    Given the restaurant is open
    When I add a "Pizza Margherita" to the cart
    Then my cart total is "10,00 €"

  @fail
  Scenario: M09 straight add fails at "my cart total is"
    Given the restaurant is open
    When I add "Spaghetti Bolognese" from the menu section "Nudeln"
    Then my cart total is "8,00 €"

  @fail
  Scenario: M10 no extra one fails at "my cart holds 2"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    Then my cart holds 2 "Spaghetti Bolognese"

  @fail
  Scenario: M11 nothing removed fails at "my cart is empty"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    Then my cart is empty

  @fail
  Scenario: M12 pickup chosen fails at "Lieferung is chosen"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I choose "Abholung"
    Then "Lieferung" is chosen

  @fail
  Scenario: M13 delivery kept fails at "wished pickup time"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    Then I am asked for my wished pickup time

  @fail
  Scenario: M13b delivery lead time fails at "earliest wished time"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    Then the earliest wished time is 15 minutes from now

  @fail
  Scenario: M14 plain dish fails at "the confirmation lists"
    Given the restaurant is open
    And my cart holds a "Pizza Margherita"
    When I go to the checkout
    And I enter my details as a guest
    And I place the order
    Then my order is confirmed
    And the confirmation lists "Pizza Margherita +Extra Salami"

  @fail
  Scenario: M15 paused pickup order fails at "I place the order"
    Given the restaurant has paused ordering
    And the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    And the restaurant pauses ordering
    And I go to the checkout
    And I place the order

  @fail
  Scenario: M16 open restaurant fails at "opens again tomorrow"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    Then the restaurant shows it opens again tomorrow

  @fail
  Scenario: M16b open checkout fails at "closed now"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    Then I am told the restaurant is closed now

  @fail
  Scenario: M17 taking orders fails at "cannot put dishes into a cart"
    Given the restaurant is open
    When I open the menu section "Nudeln"
    Then I cannot put dishes into a cart

  @fail
  Scenario: M18 no pause fails at "takes no orders right now"
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    And I place the order
    Then I am told the restaurant takes no orders right now

  @fail
  Scenario: M19 no registration fails at "I am logged in"
    Given the restaurant is open
    Then I am logged in

  @fail
  Scenario: M20 no login fails at "I am logged in"
    Given I have an account
    Then I am logged in

  @fail
  Scenario: M21 right password fails at "is wrong"
    Given I have an account
    When I log in
    Then I am told the e-mail or password is wrong

  @fail
  Scenario: M22 no request fails at "an e-mail is on its way"
    Given I have an account
    Then I am told an e-mail is on its way

  @fail
  Scenario: M22b no request fails at "I receive an e-mail"
    Given I have an account
    Then I receive an e-mail with a link to set a new password

  @fail
  Scenario: M23 dish without extra fails at "shows ... with"
    Given I am a logged-in customer
    When I save a "Pizza Margherita" with "Extra Käse" to my wishlist
    Then my wishlist shows "Pizza Margherita" with "Extra Salami"

  @fail
  Scenario: M24 no login fails at "on another device too"
    Given I have an account
    And I saved a "Pizza Margherita" to my wishlist as a guest
    Then my wishlist shows "Pizza Margherita" on another device too
