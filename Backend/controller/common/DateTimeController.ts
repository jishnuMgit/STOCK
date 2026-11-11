import { Request, Response } from "express";
import { getServerDate as fetchServerDate } from "../../services/common/DateTimeService.js";

export const getServerDate = async (_req: Request, res: Response) => {
  try {
    const serverDate = await fetchServerDate();
    return res.json({ success: true, data: { serverDate } });
  } catch (err) {
    console.error("getServerDate error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get server date" });
  }
};
