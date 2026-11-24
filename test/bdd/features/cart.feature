Feature: Cart
  A guest changes what they are about to order and chooses between
  delivery and pickup.

  Background:
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"

  Scenario: One more of a dish
    When I add one more "Spaghetti Bolognese" in my cart
    Then my cart holds 2 "Spaghetti Bolognese"
    And my cart total is "18,00 €"

  Scenario: Removing the last dish empties the cart
    When I remove "Spaghetti Bolognese" from my cart
    Then my cart is empty

  Scenario: Delivery is chosen for a new guest
    When I go to the checkout
    Then "Lieferung" is chosen
    And I am asked for my wished delivery time
    And the earliest wished time is 30 minutes from now

  Scenario: Pickup asks for a pickup time with its own lead time
    When I go to the checkout
    And I choose "Abholung"
    Then I am asked for my wished pickup time
    And the earliest wished time is 15 minutes from now
