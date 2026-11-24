Feature: Customer account
  A guest registers, logs in and out, and gets back into an account whose
  password they forgot.

  Background:
    Given the restaurant is open

  Scenario: A guest registers an account
    When I register an account
    Then I am logged in

  Scenario: A customer logs in and out
    Given I have an account
    When I log in
    Then I am logged in
    When I log out
    Then I am logged out

  Scenario: A wrong password does not log in
    Given I have an account
    When I log in with a wrong password
    Then I am told the e-mail or password is wrong
    And I am logged out

  Scenario: A customer who forgot the password sets a new one
    Given I have an account
    When I ask for a new password
    Then I am told an e-mail is on its way
    And I receive an e-mail with a link to set a new password
    When I set a new password through that link
    Then I can log in with the new password
