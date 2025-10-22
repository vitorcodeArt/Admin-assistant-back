import express from "express";

// Este arquivo agora apenas agrega e expõe routers especializados (users, groups) para manter organização.
import usersRouter from "./users.js";
import groupsRouter from "./groups.js";
import rolesRouter from "./roles.js";
import brandsRouter from "./brands.js";

const router = express.Router();

router.use(usersRouter);
router.use(groupsRouter);
router.use(rolesRouter);
router.use(brandsRouter);

export default router;
