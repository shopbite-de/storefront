import { Given, When } from "./fixtures";

Given("the restaurant is open", async ({ backend }) => {
  await backend.change({ hours: "open", acceptsOrders: true });
});

Given("the restaurant has closed for today", async ({ backend }) => {
  await backend.change({ hours: "closed-for-today" });
});

Given("the restaurant has paused ordering", async ({ backend }) => {
  await backend.change({ acceptsOrders: false });
});

When("the restaurant pauses ordering", async ({ backend }) => {
  await backend.change({ acceptsOrders: false });
});
