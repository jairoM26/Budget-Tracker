import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { createCategorySchema, updateCategorySchema } from "../validators/categories";
import * as categoryController from "../controllers/categories";

const router = Router();

router.use(authenticate);

router.get("/", categoryController.getCategories);
router.post("/", validate(createCategorySchema), categoryController.createCategory);
router.patch("/:id", validate(updateCategorySchema), categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

export default router;
