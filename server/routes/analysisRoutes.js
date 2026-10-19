import express from "express";
import { createAnalysis, getAnalyses, getAnalysis, deleteAnalysis } from "../controller/analysisController.js";
import auth from "../middleware/auth.js";

const analysisRouter = express.Router();

analysisRouter.post("/", auth, createAnalysis);
analysisRouter.get("/", auth, getAnalyses);
analysisRouter.get("/:id", auth, getAnalysis);
analysisRouter.delete("/:id", auth, deleteAnalysis);

export default analysisRouter;
