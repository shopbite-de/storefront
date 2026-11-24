Feature: Wishlist
  A customer keeps dishes the way they like them on a wishlist and orders
  them from there.

  Background:
    Given the restaurant is open

  Scenario: A customer's wishlist keeps a dish with its extra
    Given I am a logged-in customer
    When I save a "Pizza Margherita" with "Extra Salami" to my wishlist
    Then my wishlist shows "Pizza Margherita" with "Extra Salami"
    When I log out and log in again
    Then my wishlist shows "Pizza Margherita" with "Extra Salami"

  Scenario: A guest's wishlist moves into the account on login
    Given I have an account
    And I saved a "Pizza Margherita" to my wishlist as a guest
    When I log in
    Then my wishlist shows "Pizza Margherita"
    And my wishlist shows "Pizza Margherita" on another device too
