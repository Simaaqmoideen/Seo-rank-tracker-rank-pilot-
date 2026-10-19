import express from "express";
import { register, login, getuser } from "../controller/authcontroller.js";
import auth from "../middleware/auth.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/user", auth, getuser)

export default authRouter;