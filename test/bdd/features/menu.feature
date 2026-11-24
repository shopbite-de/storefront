Feature: Menu
  A guest browses the restaurant's menu by section, searches and filters it,
  and puts dishes together the way they want them.

  Background:
    Given the restaurant is open

  Scenario: The menu lists its sections
    When I open the menu
    Then I see the menu sections
      | Vorspeisen      |
      | Salate          |
      | Pizza           |
      | Nudeln          |
      | Fleischgerichte |
      | Fisch           |
      | Nachtisch       |
      | Getränke        |

  Scenario: A section lists its dishes with prices
    When I open the menu section "Pizza"
    Then the section says it has 14 dishes
    And I see the dish "Pizza Margherita" from "7,00 €"
    And I see the dish "Pizza Salami" from "8,00 €"

  Scenario: Searching the menu finds dishes by name
    When I search the menu for "Bolognese"
    Then I see exactly these dishes
      | Gnocchi Bolognese     |
      | Spaghetti Bolognese   |
      | Tagliatelle Bolognese |

  Scenario: Filtering a section shows only vegetarian dishes
    When I open the menu section "Pizza"
    And I filter the dishes by "Vegetarisch"
    Then I see exactly these dishes
      | Pizza Funghi            |
      | Pizza Margherita        |
      | Pizza Quattro Formaggi  |
      | Pizza Vegetaria         |

  Scenario: Sorting a section by price puts the cheapest dish first
    When I open the menu section "Nudeln"
    And I sort the dishes by "Preis aufsteigend"
    Then the first dish is "Spaghetti Napoli"

  Scenario: A dish with an extra goes into the cart
    When I add a "Pizza Margherita" with "Extra Salami" to the cart
    Then my cart holds 1 "Pizza Margherita +Extra Salami"
    And my cart total is "8,50 €"

  Scenario: A dish without an ingredient goes into the cart
    When I add a "Pizza Margherita" without "Käse" to the cart
    Then my cart holds 1 "Pizza Margherita -Käse"
    And my cart total is "7,00 €"

  Scenario: A larger size costs more
    When I add a "Pizza Margherita" in size "Groß 40 cm" to the cart
    Then my cart holds 1 "Pizza Margherita"
    And my cart total is "10,00 €"

  Scenario: A dish without choices goes straight from the menu into the cart
    When I add "Spaghetti Bolognese" from the menu section "Nudeln"
    Then my cart holds 1 "Spaghetti Bolognese"
    And my cart total is "9,00 €"
