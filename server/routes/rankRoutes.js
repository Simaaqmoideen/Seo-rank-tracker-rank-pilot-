import express from "express";
import { addKeyword, getKeywords, getKeyword, refreshRanking, deleteKeyword, toggleKeyword } from "../controller/rankController.js";
import auth from "../middleware/auth.js";

const rankRouter = express.Router();

rankRouter.post("/", auth, addKeyword);
rankRouter.get("/", auth, getKeywords);
rankRouter.get("/:id", auth, getKeyword);
rankRouter.post("/:id/refresh", auth, refreshRanking);
rankRouter.delete("/:id", auth, deleteKeyword);
rankRouter.patch("/:id/toggle", auth, toggleKeyword);

export default rankRouter;
