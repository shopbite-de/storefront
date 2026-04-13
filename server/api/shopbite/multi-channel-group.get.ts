export default defineEventHandler(async (event) => {
  return await shopwareFetch(event, "/shopbite/multi-channel-group");
});
