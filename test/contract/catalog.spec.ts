import { runContract } from "./harness";
import { catalogContract } from "./catalog.contract";
import { memoryCatalog, shopwareCatalog } from "./catalogFixtures";

runContract(catalogContract, [memoryCatalog, shopwareCatalog]);
