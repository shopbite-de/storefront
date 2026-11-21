import { runOrderingContract } from "./ordering.contract";
import { memoryOrdering, shopwareOrdering } from "./orderingFixtures";

runOrderingContract([memoryOrdering, shopwareOrdering]);
