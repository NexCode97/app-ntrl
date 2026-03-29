import { Router } from "express";
import sportsRoutes from "./sports.routes.js";
import linesRoutes from "./lines.routes.js";
import productsRoutes from "./products.routes.js";

const router = Router();

router.use("/sports",   sportsRoutes);
router.use("/lines",    linesRoutes);
router.use("/products", productsRoutes);

export default router;
