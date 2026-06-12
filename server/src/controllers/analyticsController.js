import * as analyticsService from "../services/analyticsService.js";

export async function summary(_req, res) {
  const data = await analyticsService.getSummary();
  res.json(data);
}

export async function utilization(_req, res) {
  const data = await analyticsService.getUtilization();
  res.json(data);
}

export async function trends(_req, res) {
  const data = await analyticsService.getTrends();
  res.json(data);
}

export async function history(_req, res) {
  const bookings = await analyticsService.getHistory();
  res.json({ history: bookings });
}
