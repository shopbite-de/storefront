import { runContactContract } from "./contact.contract";
import { memoryContact, shopwareContact } from "./contactFixtures";

runContactContract([memoryContact, shopwareContact]);
