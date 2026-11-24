Feature: Ordering
  A guest orders for delivery or pickup at a wished time. The restaurant
  takes orders only while it is open and has not paused ordering.

  Scenario: A guest orders for delivery
    Given the restaurant is open
    And my cart holds a "Pizza Margherita" with "Extra Salami"
    When I go to the checkout
    And I enter my details as a guest
    And I wish to get my order an hour after the earliest time
    And I place the order
    Then my order is confirmed
    And the confirmation shows my wished time
    And the confirmation lists "Pizza Margherita +Extra Salami"

  Scenario: A guest orders for pickup
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I choose "Abholung"
    And I enter my details as a guest
    And I place the order
    Then my order is confirmed
    And the confirmation shows my wished time

  Scenario: No ordering after today's opening hours
    Given the restaurant has closed for today
    And my cart holds a "Spaghetti Bolognese"
    Then the restaurant shows it opens again tomorrow
    When I go to the checkout
    And I enter my details as a guest
    Then I am told the restaurant is closed now
    And I cannot place the order

  Scenario: No ordering while the restaurant has paused ordering
    Given the restaurant has paused ordering
    When I open the menu section "Nudeln"
    Then I cannot put dishes into a cart

  Scenario: An order placed after the restaurant paused ordering is refused
    Given the restaurant is open
    And my cart holds a "Spaghetti Bolognese"
    When I go to the checkout
    And I enter my details as a guest
    But the restaurant pauses ordering
    And I place the order
    Then I am told the restaurant takes no orders right now
    And no order is placed
